import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

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
  const month = searchParams.get('month') // YYYY-MM
  const supabase = createServerClient()

  if (month && classId) {
    const start = `${month}-01`
    const end = `${month}-31`
    const { data } = await supabase
      .from('attendance')
      .select('date, status, students!inner(class_id)')
      .eq('students.class_id', classId)
      .gte('date', start).lte('date', end)
      .order('date')

    // Group by date
    const grouped: Record<string, { present: number; absent: number; leave: number }> = {}
    for (const r of (data || [])) {
      if (!grouped[r.date]) grouped[r.date] = { present: 0, absent: 0, leave: 0 }
      grouped[r.date][r.status as 'present' | 'absent' | 'leave']++
    }
    const report = Object.entries(grouped).map(([date, v]) => ({ date, ...v }))
    return NextResponse.json({ report })
  }

  return NextResponse.json({ report: [] })
}
