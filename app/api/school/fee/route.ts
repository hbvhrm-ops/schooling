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
    let query = supabase.from('fee_invoices').select('*, students(name, class_id), fee_templates(name)').eq('school_id', session.schoolId)
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
    const templateIds = Array.isArray(body.fee_template_ids)
      ? body.fee_template_ids
      : body.fee_template_id
        ? [body.fee_template_id]
        : []

    if (templateIds.length === 0) {
      return NextResponse.json({ error: 'Fee template selection is required' }, { status: 400 })
    }

    const { data: templates, error: tErr } = await supabase
      .from('fee_templates')
      .select('*')
      .in('id', templateIds)
      .eq('school_id', session.schoolId)

    if (tErr || !templates || templates.length === 0) {
      return NextResponse.json({ error: 'Templates not found' }, { status: 400 })
    }

    const sessionYear = req.cookies.get('selected_session')?.value || new Date().getFullYear().toString()
    const targetYear = body.year || parseInt(sessionYear)

    const invoices = []
    const criteriaToInsert = []

    if (body.student_id) {
      const discountType = body.discount_type || 'none'
      const discountValue = parseFloat(body.discount_value) || 0
      let remainingDiscount = discountValue

      for (const template of templates) {
        let finalAmount = template.amount
        if (discountType === 'percentage') {
          finalAmount = template.amount - (template.amount * (discountValue / 100))
        } else if (discountType === 'fixed' && remainingDiscount > 0) {
          if (remainingDiscount >= template.amount) {
            remainingDiscount -= template.amount
            finalAmount = 0
          } else {
            finalAmount = template.amount - remainingDiscount
            remainingDiscount = 0
          }
        }
        if (finalAmount < 0) finalAmount = 0

        invoices.push({
          school_id: session.schoolId,
          student_id: body.student_id,
          fee_template_id: template.id,
          month: body.month,
          year: targetYear,
          amount: finalAmount,
          status: 'pending'
        })
      }
    } else {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', session.schoolId)
        .eq('class_id', body.class_id)
        .eq('status', 'active')
        .eq('session', sessionYear)

      for (const template of templates) {
        for (const student of (students || [])) {
          invoices.push({
            school_id: session.schoolId,
            student_id: student.id,
            fee_template_id: template.id,
            month: body.month,
            year: targetYear,
            amount: template.amount,
            status: 'pending'
          })
        }

        criteriaToInsert.push({
          school_id: session.schoolId,
          fee_template_id: template.id,
          class_id: body.class_id
        })
      }
    }

    if (invoices.length > 0) {
      const { error: invErr } = await supabase.from('fee_invoices').insert(invoices)
      if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })
    }

    if (criteriaToInsert.length > 0) {
      const { error: critErr } = await supabase.from('fee_criteria').insert(criteriaToInsert)
      if (critErr) return NextResponse.json({ error: critErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: invoices.length })
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const supabase = createServerClient()

  if (body.type === 'template') {
    const { id, ...updates } = body
    const { error } = await supabase.from('fee_templates').update({
      name: updates.name,
      amount: parseFloat(updates.amount),
      frequency: updates.frequency,
    }).eq('id', id).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else if (body.type === 'batch_invoices') {
    for (const item of (body.items || [])) {
      await supabase.from('fee_invoices').update({
        amount: parseFloat(item.amount),
        status: item.status,
        paid_date: item.paid_date || null
      }).eq('id', item.id).eq('school_id', session.schoolId)
    }
  } else {
    const { id, ...updates } = body
    const ids = Array.isArray(updates.ids) ? updates.ids : [id]
    const { error } = await supabase.from('fee_invoices').update(updates).in('id', ids).eq('school_id', session.schoolId)
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
    const ids = id.split(',')
    const { error } = await supabase.from('fee_invoices').delete().in('id', ids).eq('school_id', session.schoolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
