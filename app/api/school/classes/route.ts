import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ classes: [], sections: [] })
  const supabase = createServerClient()
  const [cr, sr] = await Promise.all([
    supabase.from('classes').select('*').eq('school_id', session.schoolId).order('name'),
    supabase.from('sections').select('*, classes(name)').eq('school_id', session.schoolId).order('name'),
  ])
  return NextResponse.json({ classes: cr.data || [], sections: sr.data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()
  if (body.type === 'section') {
    const { data, error } = await supabase.from('sections').insert({ school_id: session.schoolId, class_id: body.class_id, name: body.name }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ section: data }, { status: 201 })
  }
  const { data, error } = await supabase.from('classes').insert({ school_id: session.schoolId, name: body.name }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ class: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, type } = await req.json()
  const supabase = createServerClient()
  if (type === 'section') await supabase.from('sections').delete().eq('id', id).eq('school_id', session.schoolId)
  else await supabase.from('classes').delete().eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
