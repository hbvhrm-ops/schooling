import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')

  const supabase = createServerClient()

  // Always fetch classes to populate filters
  const { data: classes, error: classesErr } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', session.schoolId)
    .order('name')

  if (classesErr) {
    return NextResponse.json({ error: classesErr.message }, { status: 400 })
  }

  let timetable = null
  let subjects: any[] = []

  if (classId) {
    // Fetch timetable for selected class
    const { data: timetableData, error: ttErr } = await supabase
      .from('timetables')
      .select('*')
      .eq('school_id', session.schoolId)
      .eq('class_id', classId)
      .maybeSingle()

    if (ttErr) {
      return NextResponse.json({ error: ttErr.message }, { status: 400 })
    }
    timetable = timetableData

    // Fetch subjects for selected class to populate dropdown choices
    const { data: subjectsData, error: subErr } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', session.schoolId)
      .eq('class_id', classId)
      .order('name')

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 400 })
    }
    subjects = subjectsData || []
  }

  return NextResponse.json({
    classes: classes || [],
    timetable,
    subjects,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { class_id, schedule } = body

  if (!class_id || !schedule) {
    return NextResponse.json({ error: 'class_id and schedule are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Upsert the timetable record
  const { data, error } = await supabase
    .from('timetables')
    .upsert({
      school_id: session.schoolId,
      class_id,
      schedule,
    }, {
      onConflict: 'school_id,class_id'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ timetable: data, success: true })
}
