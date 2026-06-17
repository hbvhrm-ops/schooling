import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return ''
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  return [headers.join(','), ...rows].join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const supabase = createServerClient()
  let data: Record<string, unknown>[] = []

  if (type === 'students') {
    const { data: rows } = await supabase.from('students').select('name, father_name, gender, dob, contact, address, status, created_at, classes(name), sections(name)').eq('school_id', session.schoolId)
    data = (rows || []).map((s: { name: string; father_name: string; gender: string; dob: string; contact: string; address: string; status: string; created_at: string; classes: { name: string } | null; sections: { name: string } | null }) => ({ name: s.name, father_name: s.father_name, class: (s.classes as { name: string } | null)?.name || '', section: (s.sections as { name: string } | null)?.name || '', gender: s.gender, dob: s.dob, contact: s.contact, address: s.address, status: s.status, registered: s.created_at?.split('T')[0] }))
  } else if (type === 'expenses') {
    const { data: rows } = await supabase.from('expenses').select('date, amount, description, expense_heads(name), payment_sources(name)').eq('school_id', session.schoolId).order('date', { ascending: false })
    data = (rows || []).map((e: { date: string; amount: number; description: string; expense_heads: { name: string } | null; payment_sources: { name: string } | null }) => ({ date: e.date, head: (e.expense_heads as { name: string } | null)?.name || '', source: (e.payment_sources as { name: string } | null)?.name || '', amount: e.amount, description: e.description }))
  } else if (type === 'staff') {
    const { data: rows } = await supabase.from('staff').select('name, role, salary, contact, join_date, status').eq('school_id', session.schoolId)
    data = rows || []
  } else if (type === 'fee') {
    const { data: rows } = await supabase.from('fee_invoices').select('amount, month, year, status, paid_date, students(name)').eq('school_id', session.schoolId).order('year').order('month')
    data = (rows || []).map((f: { students: { name: string } | null; amount: number; month: number; year: number; status: string; paid_date: string }) => ({ student: (f.students as { name: string } | null)?.name || '', amount: f.amount, month: f.month, year: f.year, status: f.status, paid_date: f.paid_date || '' }))
  }

  const csv = toCSV(data)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}_export.csv"`,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // CSV import - parse and insert
  const formData = await req.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  const text = await file.text()
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
  })
  // For now just return the count — actual DB insert depends on type
  return NextResponse.json({ success: true, count: rows.length })
}
