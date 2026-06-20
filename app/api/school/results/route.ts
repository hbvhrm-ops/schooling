import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ examTypes: [], results: [] })
  const supabase = createServerClient()

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')
  const examTypeId = searchParams.get('exam_type_id')
  const subjectId = searchParams.get('subject_id')

  if (classId && examTypeId) {
    const { data, error } = await supabase
      .from('results')
      .select('*, students(*)')
      .eq('exam_type_id', examTypeId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const filtered = (data || []).filter((r: any) => {
      const studentMatch = r.students && String(r.students.class_id) === String(classId)
      const subjectMatch = !subjectId || String(r.subject_id) === String(subjectId)
      return studentMatch && subjectMatch
    })

    return NextResponse.json({ results: filtered })
  }

  const { data } = await supabase.from('exam_types').select('*').eq('school_id', session.schoolId)
  return NextResponse.json({ examTypes: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()
  if (body.type === 'exam_type') {
    const { data, error } = await supabase.from('exam_types').insert({ school_id: session.schoolId, name: body.name }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ examType: data }, { status: 201 })
  }
  if (body.type === 'results') {
    const { error } = await supabase.from('results').insert(body.entries)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
