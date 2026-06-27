import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ expenses: [], heads: [], sources: [] })
  const supabase = createServerClient()
  
  const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('school_id', session.schoolId)
    .gte('date', `${sessionYear}-01-01`)
    .lte('date', `${sessionYear}-12-31`)
    .order('date', { ascending: false })
  
  return NextResponse.json({ expenses: data || [], heads: [], sources: [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()

  if (body.type === 'expense') {
    const { data, error } = await supabase.from('expenses').insert({
      school_id: session.schoolId,
      date: body.date,
      amount: parseFloat(body.amount),
      description: body.description || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ expense: data }, { status: 201 })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
