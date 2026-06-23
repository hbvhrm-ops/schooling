import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ students: [] })
  
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')
  const sectionId = searchParams.get('section_id')
  
  const supabase = createServerClient()
  let query = supabase
    .from('students')
    .select('*, classes(name), sections(name)')
    .eq('school_id', session.schoolId)
    
  if (classId) {
    query = query.eq('class_id', classId)
  }
  if (sectionId) {
    query = query.eq('section_id', sectionId)
  }
  
  const { data, error } = await query.order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  const students = (data || []).map((s: any) => ({
    ...s,
    class_name: s.classes?.name || '',
    section_name: s.sections?.name || '',
    reg_date: s.created_at,
    additional_info: s.additional_info || {},
  }))
  return NextResponse.json({ students })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase.from('students').insert({
    school_id: session.schoolId,
    name: body.name,
    father_name: body.father_name || null,
    class_id: body.class_id || null,
    section_id: body.section_id || null,
    roll_no: body.roll_no || null,
    gender: body.gender || 'Male',
    dob: body.dob || null,
    contact: body.contact || null,
    address: body.address || null,
    photo_url: body.photo_url || null,
    status: 'active',
    additional_info: body.additional_info || {},
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ student: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  const supabase = createServerClient()
  const { error } = await supabase.from('students').update(updates).eq('id', id).eq('school_id', session.schoolId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const supabase = createServerClient()
  await supabase.from('students').delete().eq('id', id).eq('school_id', session.schoolId)
  return NextResponse.json({ success: true })
}
