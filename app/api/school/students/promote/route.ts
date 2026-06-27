import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { fromClassId, toClassId, toSession } = body
    if (!fromClassId || !toClassId) {
      return NextResponse.json({ error: 'From Class and To Class are required' }, { status: 400 })
    }

    if (fromClassId === toClassId) {
      return NextResponse.json({ error: 'Source and target classes must be different' }, { status: 400 })
    }

    const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()
    const targetSession = toSession || (parseInt(sessionYear) + 1).toString()

    const supabase = createServerClient()

    // Handle Discharge / Graduation of highest class
    if (toClassId === 'discharge') {
      const { error } = await supabase
        .from('students')
        .update({ status: 'discharged', session: targetSession })
        .eq('school_id', session.schoolId)
        .eq('class_id', fromClassId)
        .eq('status', 'active')

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    // 1. Fetch sections for the source (from) and target (to) classes
    const [fromSectionsRes, toSectionsRes] = await Promise.all([
      supabase.from('sections').select('id, name').eq('class_id', fromClassId),
      supabase.from('sections').select('id, name').eq('class_id', toClassId),
    ])

    if (fromSectionsRes.error) return NextResponse.json({ error: fromSectionsRes.error.message }, { status: 400 })
    if (toSectionsRes.error) return NextResponse.json({ error: toSectionsRes.error.message }, { status: 400 })

    const fromSections = fromSectionsRes.data || []
    const toSections = toSectionsRes.data || []

    // 2. Identify sections with matching names (case-insensitive) and promote those students.
    // If a matching section does not exist in the target class, create it dynamically.
    for (const fromSec of fromSections) {
      let targetSectionId = null
      const matchingToSec = toSections.find(
        (toSec: { id: string; name: string }) => toSec.name.trim().toLowerCase() === fromSec.name.trim().toLowerCase()
      )

      if (matchingToSec) {
        targetSectionId = matchingToSec.id
      } else {
        const { data: newSec, error: createError } = await supabase
          .from('sections')
          .insert({
            school_id: session.schoolId,
            class_id: toClassId,
            name: fromSec.name.trim()
          })
          .select()
          .single()

        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 400 })
        }
        targetSectionId = newSec.id
      }

      const { error: matchError } = await supabase
        .from('students')
        .update({ class_id: toClassId, section_id: targetSectionId, session: targetSession })
        .eq('school_id', session.schoolId)
        .eq('class_id', fromClassId)
        .eq('section_id', fromSec.id)
        .eq('status', 'active')

      if (matchError) {
        return NextResponse.json({ error: matchError.message }, { status: 400 })
      }
    }

    // 3. Promote any remaining active students in the source class (e.g., sections without matches or null sections) to the new class with section_id = null
    const { error: remainingError } = await supabase
      .from('students')
      .update({ class_id: toClassId, section_id: null, session: targetSession })
      .eq('school_id', session.schoolId)
      .eq('class_id', fromClassId)
      .eq('status', 'active')

    if (remainingError) {
      return NextResponse.json({ error: remainingError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
