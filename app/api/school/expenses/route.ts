import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ expenses: [], heads: [], sources: [] })
  const supabase = createServerClient()
  const [er, hr, sr] = await Promise.all([
    supabase.from('expenses').select('*, expense_heads(name), payment_sources(name)').eq('school_id', session.schoolId).order('date', { ascending: false }),
    supabase.from('expense_heads').select('*').eq('school_id', session.schoolId),
    supabase.from('payment_sources').select('*').eq('school_id', session.schoolId),
  ])
  const expenses = (er.data || []).map((e: { id: string; date: string; amount: number; description: string; expense_heads: { name: string } | null; payment_sources: { name: string } | null }) => ({
    ...e,
    head_name: e.expense_heads?.name || '—',
    source_name: e.payment_sources?.name || '—',
  }))
  return NextResponse.json({ expenses, heads: hr.data || [], sources: sr.data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()

  if (body.type === 'head') {
    const { data, error } = await supabase.from('expense_heads').insert({ school_id: session.schoolId, name: body.name }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ head: data }, { status: 201 })
  }
  if (body.type === 'source') {
    const { data, error } = await supabase.from('payment_sources').insert({ school_id: session.schoolId, name: body.name }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ source: data }, { status: 201 })
  }
  if (body.type === 'expense') {
    const { data, error } = await supabase.from('expenses').insert({
      school_id: session.schoolId,
      date: body.date,
      head_id: body.head_id || null,
      source_id: body.source_id || null,
      amount: parseFloat(body.amount),
      description: body.description || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ expense: data }, { status: 201 })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
