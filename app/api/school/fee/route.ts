import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ templates: [], invoices: [] })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const supabase = createServerClient()

  if (type === 'templates') {
    const { data } = await supabase.from('fee_templates').select('*').eq('school_id', session.schoolId)
    return NextResponse.json({ templates: data || [] })
  }
  if (type === 'invoices') {
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const classId = searchParams.get('class_id')
    let query = supabase.from('fee_invoices').select('*, students(name, class_id)').eq('school_id', session.schoolId)
    if (month) query = query.eq('month', month)
    if (year) query = query.eq('year', year)
    const { data } = await query.order('created_at', { ascending: false })
    const invoices = (data || []).filter((inv: { students: { class_id: string } | null }) => !classId || inv.students?.class_id === classId)
      .map((inv: { id: string; students: { name: string } | null; amount: number; month: number; year: number; status: string; paid_date: string }) => ({
        ...inv,
        student_name: inv.students?.name || 'Unknown',
      }))
    return NextResponse.json({ invoices })
  }
  return NextResponse.json({ templates: [], invoices: [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()

  if (body.type === 'template') {
    const { data, error } = await supabase.from('fee_templates').insert({
      school_id: session.schoolId,
      name: body.name,
      amount: parseFloat(body.amount),
      frequency: body.frequency,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ template: data }, { status: 201 })
  }

  if (body.type === 'generate_invoices') {
    // Get all active students, get all fee templates for the school
    const studentsQuery = supabase.from('students').select('id, class_id').eq('school_id', session.schoolId).eq('status', 'active')
    if (body.class_id) studentsQuery.eq('class_id', body.class_id)
    const { data: students } = await studentsQuery

    const { data: templates } = await supabase.from('fee_templates').select('*').eq('school_id', session.schoolId)
    const { data: criteria } = await supabase.from('fee_criteria').select('*').eq('school_id', session.schoolId)

    const invoices = []
    for (const student of (students || [])) {
      const applicableTemplates = (templates || []).filter((t: any) => {
        const c = (criteria || []).find((cr: { fee_template_id: string; class_id: string }) => cr.fee_template_id === t.id)
        return !c || c.class_id === student.class_id
      })
      for (const template of applicableTemplates) {
        invoices.push({
          school_id: session.schoolId,
          student_id: student.id,
          fee_template_id: template.id,
          month: body.month,
          year: body.year,
          amount: template.amount,
          status: 'pending',
        })
      }
    }
    if (invoices.length > 0) {
      await supabase.from('fee_invoices').insert(invoices)
    }
    return NextResponse.json({ success: true, count: invoices.length })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, id, ...updates } = await req.json()
  const supabase = createServerClient()

  if (type === 'template') {
    const { error } = await supabase.from('fee_templates').update({
      name: updates.name,
      amount: parseFloat(updates.amount),
      frequency: updates.frequency,
    }).eq('id', id).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await supabase.from('fee_invoices').update(updates).eq('id', id).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
  const supabase = createServerClient()

  if (type === 'template') {
    const { error } = await supabase.from('fee_templates').delete().eq('id', id).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else if (type === 'invoice') {
    const { error } = await supabase.from('fee_invoices').delete().eq('id', id).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
