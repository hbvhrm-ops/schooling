import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fromClassId, toClassId } = await req.json()
    if (!fromClassId || !toClassId) {
      return NextResponse.json({ error: 'From Class and To Class are required' }, { status: 400 })
    }

    if (fromClassId === toClassId) {
      return NextResponse.json({ error: 'Source and target classes must be different' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Update class_id of all active students in fromClassId to toClassId
    const { error } = await supabase
      .from('students')
      .update({ class_id: toClassId, section_id: null })
      .eq('school_id', session.schoolId)
      .eq('class_id', fromClassId)
      .eq('status', 'active')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
