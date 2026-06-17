import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ subjects: [] })
  const supabase = createServerClient()
  const { data } = await supabase.from('subjects').select('*, classes(name)').eq('school_id', session.schoolId).order('name')
  const subjects = (data || []).map((s: { id: string; name: string; classes: { name: string } | null }) => ({ ...s, class_name: s.classes?.name || '' }))
  return NextResponse.json({ subjects })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, class_id } = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase.from('subjects').insert({ school_id: session.schoolId, name, class_id: class_id || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ subject: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const supabase = createServerClient()
  await supabase.from('subjects').delete().eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
