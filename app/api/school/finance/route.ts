import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ feeCollected: 0, totalExpenses: 0, profit: 0, monthlyData: [], expenseByHead: [] })
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') || new Date().getFullYear()
  const supabase = createServerClient()

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const [feeRes, expRes, headRes] = await Promise.all([
    supabase.from('fee_invoices').select('amount, paid_date').eq('school_id', session.schoolId).eq('status', 'paid').gte('paid_date', yearStart).lte('paid_date', yearEnd),
    supabase.from('expenses').select('amount, date').eq('school_id', session.schoolId).gte('date', yearStart).lte('date', yearEnd),
    supabase.from('expenses').select('amount, expense_heads(name)').eq('school_id', session.schoolId).gte('date', yearStart).lte('date', yearEnd),
  ])

  const feeCollected = (feeRes.data || []).reduce((s: number, f: { amount: number }) => s + Number(f.amount), 0)
  const totalExpenses = (expRes.data || []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
  const profit = feeCollected - totalExpenses

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const prefix = `${year}-${m}`
    const income = (feeRes.data || []).filter((f: { paid_date: string }) => f.paid_date?.startsWith(prefix)).reduce((s: number, f: { amount: number }) => s + Number(f.amount), 0)
    const expenses = (expRes.data || []).filter((e: { date: string }) => e.date?.startsWith(prefix)).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
    return { month: prefix, income, expenses }
  })

  // Expense by head
  const headMap: Record<string, number> = {}
  for (const e of (headRes.data || [])) {
    const name = (e.expense_heads as { name: string } | null)?.name || 'Other'
    headMap[name] = (headMap[name] || 0) + Number(e.amount)
  }
  const expenseByHead = Object.entries(headMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)

  return NextResponse.json({ feeCollected, totalExpenses, profit, monthlyData, expenseByHead })
}
