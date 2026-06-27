import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.schoolId) return NextResponse.json({ stats: null })

    const supabase = createServerClient()
    const schoolId = session.schoolId
    const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()

    const now = new Date()
    const month = now.getMonth() + 1
    const year = parseInt(sessionYear)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`

    const [studentsRes, feeRes, expensesRes, recentFeeRes, schoolRes] = await Promise.all([
      supabase.from('students').select('id, status, created_at, session').eq('school_id', schoolId).eq('session', sessionYear),
      supabase.from('fee_invoices').select('amount, status, paid_date').eq('school_id', schoolId).eq('status', 'paid').gte('paid_date', monthStart).lte('paid_date', monthEnd),
      supabase.from('expenses').select('amount').eq('school_id', schoolId).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('fee_invoices').select('amount, status, paid_date, students(name, session)').eq('school_id', schoolId).eq('year', year).order('paid_date', { ascending: false }).limit(5),
      supabase.from('schools').select('name, logo_url').eq('id', schoolId).maybeSingle(),
    ])

    const students = (studentsRes.data || []) as any[]
    const totalStudents = students.filter((s: any) => s.status === 'active').length
    const dischargedStudents = students.filter((s: any) => s.status === 'discharged').length
    const newAdmissions = students.filter((s: any) => new Date(s.created_at) >= new Date(monthStart)).length
    const feeCollected = (feeRes.data || []).reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0)
    const totalExpenses = (expensesRes.data || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
    const profit = feeCollected - totalExpenses

    const recentFee = (recentFeeRes.data || []).map((f: { students?: { name: string } | { name: string }[] | null; amount: number; paid_date: string; status: string }) => ({
      student: Array.isArray(f.students) ? f.students[0]?.name : (f.students as { name: string } | null)?.name || 'Unknown',
      amount: f.amount,
      date: f.paid_date ? new Date(f.paid_date).toLocaleDateString() : '—',
      status: f.status,
    }))

    const schoolData = schoolRes.data

    return NextResponse.json({
      schoolName: schoolData?.name || session.schoolName,
      schoolLogo: schoolData?.logo_url || '',
      stats: { totalStudents, newAdmissions, dischargedStudents, feeCollected, totalExpenses, profit },
      recentFee
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ schoolName: '', schoolLogo: '', stats: { totalStudents: 0, newAdmissions: 0, dischargedStudents: 0, feeCollected: 0, totalExpenses: 0, profit: 0 }, recentFee: [] })
  }
}
