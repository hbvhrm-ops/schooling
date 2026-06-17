import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.schoolId) return NextResponse.json({ stats: null })

    const supabase = createServerClient()
    const schoolId = session.schoolId
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`

    const [studentsRes, feeRes, expensesRes, recentFeeRes] = await Promise.all([
      supabase.from('students').select('id, status, created_at').eq('school_id', schoolId),
      supabase.from('fee_invoices').select('amount, status, paid_date').eq('school_id', schoolId).eq('status', 'paid').gte('paid_date', monthStart),
      supabase.from('expenses').select('amount').eq('school_id', schoolId).gte('date', monthStart),
      supabase.from('fee_invoices').select('amount, status, paid_date, students(name)').eq('school_id', schoolId).order('paid_date', { ascending: false }).limit(5),
    ])

    const students = studentsRes.data || []
    const totalStudents = students.filter(s => s.status === 'active').length
    const dischargedStudents = students.filter(s => s.status === 'discharged').length
    const newAdmissions = students.filter(s => new Date(s.created_at) >= new Date(monthStart)).length
    const feeCollected = (feeRes.data || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
    const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const profit = feeCollected - totalExpenses

    const recentFee = (recentFeeRes.data || []).map((f: { students?: { name: string } | { name: string }[] | null; amount: number; paid_date: string; status: string }) => ({
      student: Array.isArray(f.students) ? f.students[0]?.name : (f.students as { name: string } | null)?.name || 'Unknown',
      amount: f.amount,
      date: f.paid_date ? new Date(f.paid_date).toLocaleDateString() : '—',
      status: f.status,
    }))

    return NextResponse.json({ stats: { totalStudents, newAdmissions, dischargedStudents, feeCollected, totalExpenses, profit }, recentFee })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ stats: { totalStudents: 0, newAdmissions: 0, dischargedStudents: 0, feeCollected: 0, totalExpenses: 0, profit: 0 }, recentFee: [] })
  }
}
