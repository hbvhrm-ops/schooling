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
  const studentId = searchParams.get('student_id')

  if (studentId) {
    let query = supabase
      .from('results')
      .select('*, students(*), subjects(*), exam_types(*)')
      .eq('student_id', studentId)
    
    if (examTypeId) {
      query = query.eq('exam_type_id', examTypeId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ results: data || [] })
  }

  if (classId && examTypeId) {
    const { data, error } = await supabase
      .from('results')
      .select('*, students(*), subjects(*)')
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
    const { exam_type_id, class_id, subject_id, entries } = body
    if (class_id && exam_type_id && subject_id) {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', class_id)
        .eq('school_id', session.schoolId)

      const studentIds = (studentsData || []).map((s: any) => s.id)
      if (studentIds.length > 0) {
        await supabase
          .from('results')
          .delete()
          .eq('exam_type_id', exam_type_id)
          .eq('subject_id', subject_id)
          .in('student_id', studentIds)
      }
    }
    const { error } = await supabase.from('results').insert(entries)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
