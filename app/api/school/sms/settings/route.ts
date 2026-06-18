import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('schools')
    .select('name, contact')
    .eq('id', session.schoolId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ name: data?.name || '', contact: data?.contact || '' })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, contact } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  const supabase = createServerClient()
  const { error } = await supabase
    .from('schools')
    .update({ name: name.trim(), contact: contact?.trim() || null })
    .eq('id', session.schoolId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
