import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

interface DBStudent {
  id: string
  name: string
  roll_no: string | null
  section_id: string | null
  sections: { name: string } | null
}

interface AttendanceRecord {
  student_id: string
  status: string
  date: string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { records } = await req.json()
  const supabase = createServerClient()
  // Upsert attendance (delete existing for the date and re-insert)
  const date = records[0]?.date
  if (date && records.length > 0) {
    const studentIds = records.map((r: { student_id: string }) => r.student_id)
    await supabase.from('attendance').delete().in('student_id', studentIds).eq('date', date)
    const { error } = await supabase.from('attendance').insert(records)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ report: [] })
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')
  const sectionId = searchParams.get('section_id')
  const date = searchParams.get('date')
  const month = searchParams.get('month') // YYYY-MM
  const type = searchParams.get('type') // 'daily' | 'monthly' | 'sessional'
  const supabase = createServerClient()

  if (!classId) {
    return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
  }

  // 1. Daily student-wise report
  if (type === 'daily' || (date && !month)) {
    if (!date) return NextResponse.json({ error: 'Date is required for daily report' }, { status: 400 })
    
    let studentQuery = supabase
      .from('students')
      .select('id, name, roll_no, section_id, sections(name)')
      .eq('school_id', session.schoolId)
      .eq('class_id', classId)
      .neq('status', 'discharged')

    if (sectionId) {
      studentQuery = studentQuery.eq('section_id', sectionId)
    }

    const { data: students, error: studentError } = await studentQuery
    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 })

    const studentList = ((students as unknown as DBStudent[]) || []).map((s) => ({
      id: s.id,
      name: s.name,
      roll_no: s.roll_no || '',
      section_id: s.section_id,
      section_name: s.sections?.name || ''
    }))

    const studentIds = studentList.map(s => s.id)
    const attendanceMap: Record<string, string> = {}
    
    if (studentIds.length > 0) {
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('date', date)
      if (attError) return NextResponse.json({ error: attError.message }, { status: 400 })
      
      const records = attData as { student_id: string; status: string }[]
      for (const r of records) {
        attendanceMap[r.student_id] = r.status
      }
    }

    const report = studentList.map(s => ({
      ...s,
      status: attendanceMap[s.id] || 'unmarked'
    }))

    return NextResponse.json({ report })
  }

  // 2. Monthly report (with daily trend aggregates and student-wise monthly stats)
  if (type === 'monthly' || month) {
    if (!month) return NextResponse.json({ error: 'Month is required for monthly report' }, { status: 400 })

    let studentQuery = supabase
      .from('students')
      .select('id, name, roll_no, section_id, sections(name)')
      .eq('school_id', session.schoolId)
      .eq('class_id', classId)
      .neq('status', 'discharged')

    if (sectionId) {
      studentQuery = studentQuery.eq('section_id', sectionId)
    }

    const { data: students, error: studentError } = await studentQuery
    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 })

    const studentList = ((students as unknown as DBStudent[]) || []).map((s) => ({
      id: s.id,
      name: s.name,
      roll_no: s.roll_no || '',
      section_id: s.section_id,
      section_name: s.sections?.name || ''
    }))

    const studentIds = studentList.map(s => s.id)
    let attendanceData: AttendanceRecord[] = []
    
    if (studentIds.length > 0) {
      const [yearStr, monthStr] = month.split('-')
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1
      const nextYear = monthNum === 12 ? year + 1 : year
      
      const start = `${month}-01`
      const endLimit = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
      
      const { data, error: attError } = await supabase
        .from('attendance')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', start).lt('date', endLimit)
      if (attError) return NextResponse.json({ error: attError.message }, { status: 400 })
      attendanceData = (data as unknown as AttendanceRecord[]) || []
    }

    // Student aggregate stats
    const studentStats: Record<string, { present: number; absent: number; leave: number }> = {}
    studentList.forEach(s => {
      studentStats[s.id] = { present: 0, absent: 0, leave: 0 }
    })
    for (const r of attendanceData) {
      if (studentStats[r.student_id]) {
        studentStats[r.student_id][r.status as 'present' | 'absent' | 'leave']++
      }
    }
    const studentsReport = studentList.map(s => {
      const stats = studentStats[s.id]
      const total = stats.present + stats.absent + stats.leave
      const pct = total ? Math.round((stats.present / total) * 100) : 0
      return {
        ...s,
        present: stats.present,
        absent: stats.absent,
        leave: stats.leave,
        pct
      }
    })

    // Date-wise trends
    const grouped: Record<string, { present: number; absent: number; leave: number }> = {}
    for (const r of attendanceData) {
      if (!grouped[r.date]) grouped[r.date] = { present: 0, absent: 0, leave: 0 }
      grouped[r.date][r.status as 'present' | 'absent' | 'leave']++
    }
    const report = Object.entries(grouped).map(([d, v]) => ({ date: d, ...v })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ report, studentsReport })
  }

  // 3. Sessional student-wise report
  if (type === 'sessional' || (!date && !month)) {
    let studentQuery = supabase
      .from('students')
      .select('id, name, roll_no, section_id, sections(name)')
      .eq('school_id', session.schoolId)
      .eq('class_id', classId)
      .neq('status', 'discharged')

    if (sectionId) {
      studentQuery = studentQuery.eq('section_id', sectionId)
    }

    const { data: students, error: studentError } = await studentQuery
    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 400 })

    const studentList = ((students as unknown as DBStudent[]) || []).map((s) => ({
      id: s.id,
      name: s.name,
      roll_no: s.roll_no || '',
      section_id: s.section_id,
      section_name: s.sections?.name || ''
    }))

    const studentIds = studentList.map(s => s.id)
    let attendanceData: { student_id: string; status: string }[] = []
    
    if (studentIds.length > 0) {
      const { data, error: attError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
      if (attError) return NextResponse.json({ error: attError.message }, { status: 400 })
      attendanceData = (data as unknown as { student_id: string; status: string }[]) || []
    }

    const studentStats: Record<string, { present: number; absent: number; leave: number }> = {}
    studentList.forEach(s => {
      studentStats[s.id] = { present: 0, absent: 0, leave: 0 }
    })
    for (const r of attendanceData) {
      if (studentStats[r.student_id]) {
        studentStats[r.student_id][r.status as 'present' | 'absent' | 'leave']++
      }
    }
    const report = studentList.map(s => {
      const stats = studentStats[s.id]
      const total = stats.present + stats.absent + stats.leave
      const pct = total ? Math.round((stats.present / total) * 100) : 0
      return {
        ...s,
        present: stats.present,
        absent: stats.absent,
        leave: stats.leave,
        total,
        pct
      }
    })

    return NextResponse.json({ report })
  }

  return NextResponse.json({ report: [] })
}

