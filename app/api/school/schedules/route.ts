import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ schedules: [] }, { status: 401 })
  const supabase = createServerClient()

  const { searchParams } = new URL(req.url)
  const examTypeId = searchParams.get('exam_type_id')
  const classId = searchParams.get('class_id')

  if (!examTypeId || !classId) {
    return NextResponse.json({ error: 'exam_type_id and class_id are required' }, { status: 400 })
  }

  // 1. Get subjects of this class
  const { data: subjects, error: subjErr } = await supabase
    .from('subjects')
    .select('id')
    .eq('class_id', classId)
    .eq('school_id', session.schoolId)

  if (subjErr) {
    return NextResponse.json({ error: subjErr.message }, { status: 400 })
  }

  const subjectIds = (subjects || []).map((s: any) => s.id)
  if (subjectIds.length === 0) {
    return NextResponse.json({ schedules: [] })
  }

  // 2. Get schedules for these subjects in this exam
  const { data: schedules, error: schedErr } = await supabase
    .from('exam_schedules')
    .select('*')
    .eq('exam_type_id', examTypeId)
    .in('subject_id', subjectIds)

  if (schedErr) {
    return NextResponse.json({ error: schedErr.message }, { status: 400 })
  }

  return NextResponse.json({ schedules: schedules || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServerClient()

  const { exam_type_id, class_id, schedules } = await req.json()

  if (!exam_type_id || !class_id || !Array.isArray(schedules)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Get subjects of this class to delete old schedules
  const { data: subjects, error: subjErr } = await supabase
    .from('subjects')
    .select('id')
    .eq('class_id', class_id)
    .eq('school_id', session.schoolId)

  if (subjErr) {
    return NextResponse.json({ error: subjErr.message }, { status: 400 })
  }

  const subjectIds = (subjects || []).map((s: any) => s.id)
  if (subjectIds.length > 0) {
    // 2. Delete old schedules for these subjects
    const { error: delErr } = await supabase
      .from('exam_schedules')
      .delete()
      .eq('exam_type_id', exam_type_id)
      .in('subject_id', subjectIds)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 })
    }
  }

  // 3. Filter non-empty schedules and map to DB format
  const validSchedules = schedules
    .filter((s: any) => s.subject_id && (s.date || s.time))
    .map((s: any) => ({
      exam_type_id,
      subject_id: s.subject_id,
      date: s.date || null,
      time: s.time || null,
    }))

  if (validSchedules.length > 0) {
    const { error: insErr } = await supabase
      .from('exam_schedules')
      .insert(validSchedules)

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}
