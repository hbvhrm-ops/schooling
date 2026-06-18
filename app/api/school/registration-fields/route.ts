import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('registration_fields')
    .select('*')
    .eq('school_id', session.schoolId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ fields: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await req.json()
  const { field_label, field_type, field_options, is_required } = body

  if (!field_label || !field_type) {
    return NextResponse.json({ error: 'Field label and type are required' }, { status: 400 })
  }

  if (!['text', 'number', 'dropdown'].includes(field_type)) {
    return NextResponse.json({ error: 'Invalid field type' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('registration_fields')
    .insert({
      school_id: session.schoolId,
      field_label,
      field_type,
      field_options: field_options || null,
      is_required: !!is_required,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ field: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Field ID is required' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from('registration_fields')
    .delete()
    .eq('id', id)
    .eq('school_id', session.schoolId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
