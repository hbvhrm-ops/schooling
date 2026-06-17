import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ templates: [] })
  const supabase = createServerClient()
  const { data } = await supabase.from('sms_templates').select('*').eq('school_id', session.schoolId)
  return NextResponse.json({ templates: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, message } = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase.from('sms_templates').insert({ school_id: session.schoolId, type, message }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ template: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, message } = await req.json()
  const supabase = createServerClient()
  await supabase.from('sms_templates').update({ message }).eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
