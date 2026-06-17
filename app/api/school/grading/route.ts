import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ grades: [] })
  const supabase = createServerClient()
  const { data } = await supabase.from('grading_policy').select('*').eq('school_id', session.schoolId).order('min_marks', { ascending: false })
  return NextResponse.json({ grades: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase.from('grading_policy').insert({
    school_id: session.schoolId,
    grade: body.grade,
    min_marks: Number(body.min_marks),
    max_marks: Number(body.max_marks),
    gpa: body.gpa || null,
    remarks: body.remarks || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ grade: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  const supabase = createServerClient()
  await supabase.from('grading_policy').update({ ...updates, min_marks: Number(updates.min_marks), max_marks: Number(updates.max_marks) }).eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const supabase = createServerClient()
  await supabase.from('grading_policy').delete().eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
