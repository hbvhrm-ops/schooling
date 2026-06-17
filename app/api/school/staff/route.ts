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
