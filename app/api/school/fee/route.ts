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
    const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()
    const year = searchParams.get('year') || sessionYear
    const classId = searchParams.get('class_id')
    const studentId = searchParams.get('student_id')
    let query = supabase.from('fee_invoices').select('*, students(name, class_id)').eq('school_id', session.schoolId)
    if (studentId) query = query.eq('student_id', studentId)
    if (month) query = query.eq('month', month)
    if (year && !studentId) query = query.eq('year', year)
    else if (year && studentId && searchParams.has('year')) query = query.eq('year', year)
    
    const { data } = await query.order('created_at', { ascending: false })
    const invoices = (data || []).filter((inv: { students: { class_id: string } | null }) => !classId || inv.students?.class_id === classId)
      .map((inv: { id: string; students: { name: string } | null; amount: number; month: number; year: number; status: string; paid_date: string; amount_paid?: number }) => ({
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

  if (body.type === 'assign_fee') {
    const { data: template, error: tErr } = await supabase
      .from('fee_templates')
      .select('*')
      .eq('id', body.fee_template_id)
      .eq('school_id', session.schoolId)
      .single()
    if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 400 })

    const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()
    const targetYear = body.year || parseInt(sessionYear)

    const invoices = []
    if (body.student_id) {
      let finalAmount = template.amount
      const discountType = body.discount_type || 'none'
      const discountValue = parseFloat(body.discount_value) || 0

      if (discountType === 'percentage') {
        finalAmount = template.amount - (template.amount * (discountValue / 100))
      } else if (discountType === 'fixed') {
        finalAmount = template.amount - discountValue
      }

      if (finalAmount < 0) finalAmount = 0

      invoices.push({
        school_id: session.schoolId,
        student_id: body.student_id,
        fee_template_id: body.fee_template_id,
        month: body.month,
        year: targetYear,
        amount: finalAmount,
        status: 'pending'
      })
    } else {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', session.schoolId)
        .eq('class_id', body.class_id)
        .eq('status', 'active')
        .eq('session', sessionYear)
      
      for (const student of (students || [])) {
        invoices.push({
          school_id: session.schoolId,
          student_id: student.id,
          fee_template_id: body.fee_template_id,
          month: body.month,
          year: targetYear,
          amount: template.amount,
          status: 'pending'
        })
      }
      
      await supabase.from('fee_criteria').insert({
        school_id: session.schoolId,
        fee_template_id: body.fee_template_id,
        class_id: body.class_id
      })
    }

    if (invoices.length > 0) {
      const { error: invErr } = await supabase.from('fee_invoices').insert(invoices)
      if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })
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
