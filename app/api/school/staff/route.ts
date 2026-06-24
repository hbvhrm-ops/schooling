import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ staff: [] })
  const supabase = createServerClient()
  const { data } = await supabase.from('staff').select('*').eq('school_id', session.schoolId).order('name')
  return NextResponse.json({ staff: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()

  if (body.action === 'pay_salaries') {
    const { data: staffList, error: staffErr } = await supabase
      .from('staff')
      .select('name, salary')
      .eq('school_id', session.schoolId)
      .eq('status', 'active')
    
    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 400 })
    
    const activeStaff = (staffList || []).filter((s: { name: string; salary: number | null }) => Number(s.salary) > 0)
    if (activeStaff.length === 0) {
      return NextResponse.json({ error: 'No active staff members with a valid salary found.' }, { status: 400 })
    }
    
    const payDate = new Date(body.date || new Date().toISOString().split('T')[0])
    const monthName = payDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    const expensesData = activeStaff.map((s: { name: string; salary: number | null }) => ({
      school_id: session.schoolId,
      date: body.date || new Date().toISOString().split('T')[0],
      amount: Number(s.salary),
      description: `Salary - ${s.name} (${monthName})`,
    }))
    
    const { error: expErr } = await supabase.from('expenses').insert(expensesData)
    if (expErr) return NextResponse.json({ error: expErr.message }, { status: 400 })
    
    return NextResponse.json({ success: true, count: expensesData.length })
  }

  const { data, error } = await supabase.from('staff').insert({
    school_id: session.schoolId,
    name: body.name,
    role: body.role,
    salary: body.salary ? parseFloat(body.salary) : null,
    contact: body.contact || null,
    join_date: body.join_date || null,
    status: body.status || 'active',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ staff: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (updates.salary) updates.salary = parseFloat(updates.salary)
  const supabase = createServerClient()
  await supabase.from('staff').update(updates).eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const supabase = createServerClient()
  await supabase.from('staff').delete().eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
