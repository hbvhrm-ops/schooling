'use client'
import { useState, useEffect, useCallback } from 'react'

interface FeeTemplate { id: string; name: string; amount: number; frequency: string }
interface ClassItem { id: string; name: string }
interface Invoice { id: string; student_name: string; amount: number; month: number; year: number; status: string; paid_date?: string }
interface GroupedInvoice {
  key: string;
  student_id: string;
  student_name: string;
  month: number;
  year: number;
  amount: number;
  status: 'paid' | 'pending' | 'partial';
  paid_date?: string;
  ids: string[];
  items: {
    invoice_id: string;
    template_id: string | null;
    template_name: string;
    amount: number;
    status: string;
  }[];
}

type Tab = 'templates' | 'assign-fee' | 'fee-history'

const CHALLAN_PRINT_STYLES = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    @page {
      size: A4 portrait;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #fff;
      font-family: 'Inter', sans-serif;
      color: #1e293b;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: #fff;
    }
    .challan {
      height: 96mm;
      width: 210mm;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4mm 12mm;
    }
    .challan-inner {
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      padding: 4mm 8mm;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: #f8fafc;
    }
    .challan-header {
      text-align: center;
      border-bottom: 2.2px solid #0f172a;
      padding-bottom: 2mm;
      margin-bottom: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .school-name {
      font-size: 1.1rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .challan-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #eaeaea;
      background-color: #0f172a;
      padding: 1.2mm 3.5mm;
      border-radius: 4px;
    }
    .details-table {
      width: 100%;
      font-size: 0.8rem;
      border-collapse: collapse;
      margin-bottom: 2mm;
    }
    .details-table td {
      padding: 0.8mm 1.5mm;
      color: #334155;
    }
    .details-table td strong {
      color: #0f172a;
    }
    .highlight {
      color: #b91c1c;
      font-weight: 700;
    }
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      margin-bottom: 2mm;
    }
    .fee-table th {
      background-color: #0f172a;
      color: #fff;
      padding: 1.2mm 2.5mm;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .fee-table td {
      padding: 1.5mm 2.5mm;
      border-bottom: 1px solid #cbd5e1;
      color: #334155;
    }
    .total-row td {
      border-top: 1.5px solid #0f172a;
      border-bottom: none;
      padding-top: 2mm;
    }
    .challan-footer {
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    .instructions {
      font-size: 0.72rem;
      color: #475569;
      font-style: italic;
      border-left: 2.5px solid #cbd5e1;
      padding-left: 3mm;
      line-height: 1.4;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 2mm;
    }
    .sig-col {
      text-align: center;
      width: 45mm;
    }
    .sig-line {
      border-top: 1px dashed #475569;
      padding-top: 1.5mm;
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
    }
    .dashed-divider {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.68rem;
      color: #94a3b8;
      letter-spacing: 1px;
      height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media print {
      body { background: #fff; }
      .challan-inner { background-color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
`

export default function FeePage() {
  const [tab, setTab] = useState<Tab>('templates')
  const [templates, setTemplates] = useState<FeeTemplate[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', frequency: 'Monthly' })
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1)
  const [selYear, setSelYear] = useState(new Date().getFullYear())
  const [selClass, setSelClass] = useState('')

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Customizable Challan and Print Selection states
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [challanSchoolName, setChallanSchoolName] = useState('EduManage School System')
  const [challanBankName, setChallanBankName] = useState('National Bank of Pakistan')
  const [challanAccountNo, setChallanAccountNo] = useState('1234-56789-0')
  const [challanDueDate, setChallanDueDate] = useState('10th of the month')
  const [challanPenalty, setChallanPenalty] = useState('Late fee of ₨ 100 applies after the due date.')
  const [showChallanCustomizer, setShowChallanCustomizer] = useState(false)
  const [emptyChallanCopies, setEmptyChallanCopies] = useState(3)
  const [editingGroup, setEditingGroup] = useState<GroupedInvoice | null>(null)
  const [editGroupForm, setEditGroupForm] = useState<{
    status: string;
    paid_date: string;
    items: { invoice_id: string; template_name: string; amount: string }[];
  }>({ status: 'pending', paid_date: '', items: [] })

  const [assignClass, setAssignClass] = useState('')
  const [assignStudent, setAssignStudent] = useState('')
  const [assignTemplates, setAssignTemplates] = useState<string[]>([])
  const [assignMonth, setAssignMonth] = useState(new Date().getMonth() + 1)
  const [assignYear, setAssignYear] = useState(new Date().getFullYear())
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState<string>('')

  const getGroupedInvoices = useCallback((): GroupedInvoice[] => {
    const groups: Record<string, GroupedInvoice> = {}
    
    invoices.forEach(inv => {
      const studentId = (inv as any).student_id || ''
      const key = `${studentId}-${inv.month}-${inv.year}`
      
      const itemName = (inv as any).fee_templates?.name || 'Assigned Fee'
      const item = {
        invoice_id: inv.id,
        template_id: (inv as any).fee_template_id || null,
        template_name: itemName,
        amount: Number(inv.amount),
        status: inv.status
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          student_id: studentId,
          student_name: inv.student_name || 'Unknown',
          month: inv.month,
          year: inv.year,
          amount: 0,
          status: 'pending',
          paid_date: inv.paid_date || undefined,
          ids: [],
          items: []
        }
      }

      const g = groups[key]
      g.amount += Number(inv.amount)
      g.ids.push(inv.id)
      g.items.push(item)
      
      if (inv.paid_date && (!g.paid_date || new Date(inv.paid_date) > new Date(g.paid_date))) {
        g.paid_date = inv.paid_date
      }
    })

    Object.values(groups).forEach(g => {
      const statuses = g.items.map(it => it.status)
      if (statuses.every(s => s === 'paid')) {
        g.status = 'paid'
      } else if (statuses.every(s => s === 'pending')) {
        g.status = 'pending'
      } else {
        g.status = 'partial'
      }
    })

    return Object.values(groups)
  }, [invoices])

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
      return ''
    }
    const sess = getCookie('selected_session')
    if (sess) {
      const yearVal = parseInt(sess)
      setSelYear(yearVal)
      setAssignYear(yearVal)
    }
  }, [])
  const [assignStudentsList, setAssignStudentsList] = useState<{ id: string; name: string }[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedInvoices([])
    const [tr, cr, ir] = await Promise.all([
      fetch('/api/school/fee?type=templates').then(r => r.json()).catch(() => ({})),
      fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
      fetch(`/api/school/fee?type=invoices&month=${selMonth}&year=${selYear}&class_id=${selClass}`).then(r => r.json()).catch(() => ({})),
    ])
    setTemplates(tr.templates || [])
    setClasses(cr.classes || [])
    setInvoices(ir.invoices || [])
    setLoading(false)
  }, [selMonth, selYear, selClass])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/school/profile')
      .then(r => r.json())
      .then(data => {
        if (data.school?.name) {
          setChallanSchoolName(data.school.name)
        }
      })
      .catch(err => console.error('Error loading school name in fee page:', err))
  }, [])

  useEffect(() => {
    const url = assignClass 
      ? `/api/school/students?class_id=${assignClass}`
      : `/api/school/students`
    fetch(url)
      .then(r => r.json())
      .then(d => setAssignStudentsList(d.students || []))
  }, [assignClass])

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (editingTemplateId) {
      const r = await fetch('/api/school/fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'template', id: editingTemplateId, ...form })
      })
      if (r.ok) {
        setMsg({ type: 'success', text: 'Fee template updated!' })
        setForm({ name: '', amount: '', frequency: 'Monthly' })
        setEditingTemplateId(null)
        load()
      } else {
        setMsg({ type: 'danger', text: 'Failed to update template' })
      }
    } else {
      const r = await fetch('/api/school/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'template', ...form })
      })
      if (r.ok) {
        setMsg({ type: 'success', text: 'Fee template added!' })
        setForm({ name: '', amount: '', frequency: 'Monthly' })
        load()
      } else {
        setMsg({ type: 'danger', text: 'Failed to add template' })
      }
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this fee template?')) return
    const r = await fetch(`/api/school/fee?type=template&id=${id}`, { method: 'DELETE' })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Template deleted!' })
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to delete template' })
    }
  }

  function startEditTemplate(t: FeeTemplate) {
    setEditingTemplateId(t.id)
    setForm({ name: t.name, amount: String(t.amount), frequency: t.frequency })
  }

  function cancelEditTemplate() {
    setEditingTemplateId(null)
    setForm({ name: '', amount: '', frequency: 'Monthly' })
  }

  function startEditGroup(g: GroupedInvoice) {
    setEditingGroup(g)
    setEditGroupForm({
      status: g.status === 'paid' ? 'paid' : 'pending',
      paid_date: g.paid_date || new Date().toISOString().split('T')[0],
      items: g.items.map(it => ({
        invoice_id: it.invoice_id,
        template_name: it.template_name,
        amount: String(it.amount)
      }))
    })
  }

  async function saveGroupEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    
    const itemsToUpdate = editGroupForm.items.map(item => ({
      id: item.invoice_id,
      amount: parseFloat(item.amount) || 0,
      status: editGroupForm.status,
      paid_date: editGroupForm.status === 'paid' ? editGroupForm.paid_date : null
    }))

    const r = await fetch('/api/school/fee', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'batch_invoices',
        items: itemsToUpdate
      })
    })

    if (r.ok) {
      setMsg({ type: 'success', text: 'Fee record updated!' })
      setEditingGroup(null)
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to update fee record' })
    }
  }

  async function deleteInvoice(ids: string[]) {
    if (!confirm('Are you sure you want to delete this fee record? (All items in this invoice will be removed)')) return
    const idParam = ids.join(',')
    const r = await fetch(`/api/school/fee?type=invoice&id=${idParam}`, { method: 'DELETE' })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Fee record deleted!' })
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to delete fee record' })
    }
  }

  async function handleAssignFee(e: React.FormEvent) {
    e.preventDefault()
    if (assignTemplates.length === 0 || (!assignClass && !assignStudent)) {
      setMsg({ type: 'danger', text: 'Please select at least one Fee template, and either Class or a specific Student.' })
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/school/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assign_fee',
          class_id: assignClass,
          student_id: assignStudent || null,
          fee_template_ids: assignTemplates,
          month: assignMonth,
          year: assignYear,
          discount_type: assignStudent ? discountType : 'none',
          discount_value: assignStudent && discountType !== 'none' ? parseFloat(discountValue) : 0
        })
      })
      if (r.ok) {
        const d = await r.json()
        setMsg({ type: 'success', text: `Fee assigned successfully! Generated ${d.count} invoice(s).` })
        setAssignClass('')
        setAssignStudent('')
        setAssignTemplates([])
        setDiscountType('none')
        setDiscountValue('')
        load()
      } else {
        const d = await r.json()
        setMsg({ type: 'danger', text: d.error || 'Failed to assign fee.' })
      }
    } catch (err) {
      setMsg({ type: 'danger', text: 'Error assigning fee.' })
    } finally {
      setLoading(false)
    }
  }

  async function markPaid(ids: string[]) {
    await fetch('/api/school/fee', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
    })
    load()
  }

  function printBulkChallans(invoicesToPrint: GroupedInvoice[]) {
    if (invoicesToPrint.length === 0) return
    const win = window.open('', '_blank')
    if (!win) return

    // Group invoices into chunks of 3
    const chunks: GroupedInvoice[][] = []
    for (let i = 0; i < invoicesToPrint.length; i += 3) {
      chunks.push(invoicesToPrint.slice(i, i + 3))
    }

    const pagesHTML = chunks.map(chunk => {
      const challansHTML = chunk.map((inv, idx) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const billingPeriod = `${months[inv.month - 1]} ${inv.year}`
        const invNo = inv.items[0]?.invoice_id.substring(0, 8).toUpperCase() || 'N/A'

        const feeRowsHTML = inv.items.map(item => `
          <tr>
            <td>${item.template_name}</td>
            <td style="text-align: right;">₨ ${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')
        
        return `
          <div class="challan">
            <div class="challan-inner">
              <div class="challan-header">
                <div class="school-name">${challanSchoolName}</div>
                <div class="challan-title">FEE CHALLAN</div>
              </div>
              
              <div class="challan-body">
                <table class="details-table">
                  <tr>
                    <td><strong>Student Name:</strong></td>
                    <td>${inv.student_name}</td>
                    <td><strong>Invoice No:</strong></td>
                    <td>#${invNo}</td>
                  </tr>
                  <tr>
                    <td><strong>Billing Period:</strong></td>
                    <td>${billingPeriod}</td>
                    <td><strong>Due Date:</strong></td>
                    <td><span class="highlight">${challanDueDate}</span></td>
                  </tr>
                  <tr>
                    <td><strong>Bank Name:</strong></td>
                    <td>${challanBankName}</td>
                    <td><strong>Account No:</strong></td>
                    <td><strong>${challanAccountNo}</strong></td>
                  </tr>
                </table>

                <table class="fee-table">
                  <thead>
                    <tr>
                      <th style="text-align: left;">Fee Description</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${feeRowsHTML}
                    <tr class="total-row">
                      <td><strong>NET PAYABLE AMOUNT:</strong></td>
                      <td style="text-align: right; font-weight: bold; color: #1e3a8a; font-size: 1.15rem;">
                        ₨ ${inv.amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="challan-footer">
                <div class="instructions">${challanPenalty}</div>
                <div class="signatures">
                  <div class="sig-col">
                    <div class="sig-line">Parent Sign</div>
                  </div>
                  <div class="sig-col">
                    <div class="sig-line">Cashier Sign</div>
                  </div>
                  <div class="sig-col">
                    <div class="sig-line">Principal Sign</div>
                  </div>
                </div>
              </div>
            </div>
            ${idx < chunk.length - 1 ? '<div class="dashed-divider">✂------------------ CUT HERE ------------------✂</div>' : ''}
          </div>
        `
      }).join('')

      return `
        <div class="page-container">
          ${challansHTML}
        </div>
      `
    }).join('')

    win.document.write(`
      <html>
        <head>
          <title>Fee Challans - A4 Print</title>
          ${CHALLAN_PRINT_STYLES}
        </head>
        <body>
          ${pagesHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  function printEmptyChallans(copies: number) {
    if (copies <= 0) return
    const win = window.open('', '_blank')
    if (!win) return

    // Group into chunks of 3 for A4 print layout
    const chunks: number[] = []
    for (let i = 0; i < copies; i += 3) {
      chunks.push(Math.min(3, copies - i))
    }

    const pagesHTML = chunks.map(chunkSize => {
      const challansHTML = Array.from({ length: chunkSize }).map((_, idx) => {
        return `
          <div class="challan">
            <div class="challan-inner">
              <div class="challan-header">
                <div class="school-name">${challanSchoolName || 'EduManage School System'}</div>
                <div class="challan-title">FEE CHALLAN</div>
              </div>
              
              <div class="challan-body">
                <table class="details-table">
                  <tr>
                    <td style="width: 18%;"><strong>Student Name:</strong></td>
                    <td style="border-bottom: 1px dashed #94a3b8; height: 24px; width: 32%;"></td>
                    <td style="width: 15%;"><strong>Invoice No:</strong></td>
                    <td style="border-bottom: 1px dashed #94a3b8; height: 24px; width: 35%;"></td>
                  </tr>
                  <tr>
                    <td><strong>Billing Period:</strong></td>
                    <td style="border-bottom: 1px dashed #94a3b8; height: 24px;"></td>
                    <td><strong>Due Date:</strong></td>
                    <td><span class="highlight">${challanDueDate || '___________________'}</span></td>
                  </tr>
                  <tr>
                    <td><strong>Bank Name:</strong></td>
                    <td>${challanBankName || '___________________'}</td>
                    <td><strong>Account No:</strong></td>
                    <td><strong>${challanAccountNo || '___________________'}</strong></td>
                  </tr>
                </table>

                <table class="fee-table">
                  <thead>
                    <tr>
                      <th style="text-align: left;">Fee Description</th>
                      <th style="text-align: right; width: 30%;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                    </tr>
                    <tr>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                    </tr>
                    <tr>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                    </tr>
                    <tr>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                    </tr>
                    <tr>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                      <td style="height: 28px; border-bottom: 1px dashed #cbd5e1;"></td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>NET PAYABLE AMOUNT:</strong></td>
                      <td style="text-align: right; border-bottom: 1.5px dashed #0f172a; height: 32px;"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="challan-footer">
                <div class="instructions">${challanPenalty}</div>
                <div class="signatures">
                  <div class="sig-col">
                    <div class="sig-line">Parent Sign</div>
                  </div>
                  <div class="sig-col">
                    <div class="sig-line">Cashier Sign</div>
                  </div>
                  <div class="sig-col">
                    <div class="sig-line">Principal Sign</div>
                  </div>
                </div>
              </div>
            </div>
            ${idx < chunkSize - 1 ? '<div class="dashed-divider">✂------------------ CUT HERE ------------------✂</div>' : ''}
          </div>
        `
      }).join('')

      return `
        <div class="page-container">
          ${challansHTML}
        </div>
      `
    }).join('')

    win.document.write(`
      <html>
        <head>
          <title>Empty Fee Challans - A4 Print</title>
          ${CHALLAN_PRINT_STYLES}
        </head>
        <body>
          ${pagesHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  function printChallan(g: GroupedInvoice) {
    printBulkChallans([g])
  }

  const paidCount = invoices.filter(i => i.status === 'paid').length
  const pendingCount = invoices.filter(i => i.status === 'pending').length
  const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  const filteredStudents = assignStudentsList.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  )

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💳 Fee Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage fee templates, invoices and collections</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([['templates','📄 Templates'],['assign-fee','🎯 Assign Fee'],['fee-history','📋 Fee History']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{editingTemplateId ? '✏️ Edit Fee Template' : '📄 Create Fee Template'}</h3>
            <form onSubmit={saveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Template Name *</label><input className="form-input" placeholder="e.g. Monthly Tuition Fee" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Amount (₨) *</label><input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Frequency</label>
                <select className="form-select" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  <option>Monthly</option><option>Quarterly</option><option>Annual</option><option>One-Time</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingTemplateId && <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={cancelEditTemplate}>Cancel</button>}
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingTemplateId ? '💾 Update Template' : '➕ Add Template'}</button>
              </div>
            </form>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Fee Templates</h3>
            {templates.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📄</div><p>No templates yet. Create your first one.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {templates.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.frequency}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>₨ {Number(t.amount).toLocaleString()}</div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => startEditTemplate(t)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }} title="Edit">✏️</button>
                        <button onClick={() => deleteTemplate(t.id)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }} title="Delete">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'assign-fee' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎯 Assign Fee & Fines</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Assign fee templates or fines to classes or specific students.</p>
          <form onSubmit={handleAssignFee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class {assignStudent ? '(Optional)' : '*'}</label>
              <select className="form-select" value={assignClass} onChange={e => setAssignClass(e.target.value)} required={!assignStudent}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Student (Optional — select to apply fine/fee only to them)</label>
              <input
                className="form-input"
                type="text"
                placeholder="🔍 Type student name to search/filter..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <select className="form-select" value={assignStudent} onChange={e => setAssignStudent(e.target.value)}>
                <option value="">All Students (Assign to Class)</option>
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fee Templates / Fines * (Select one or more)</label>
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.5rem',
                background: 'var(--bg-input)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                {templates.map(t => {
                  const checked = assignTemplates.includes(t.id)
                  return (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setAssignTemplates(assignTemplates.filter(id => id !== t.id))
                          } else {
                            setAssignTemplates([...assignTemplates, t.id])
                          }
                        }}
                      />
                      <span>{t.name} — <strong style={{ color: 'var(--success)' }}>₨{Number(t.amount).toLocaleString()}</strong></span>
                    </label>
                  )
                })}
                {templates.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>No templates found. Create one first!</div>}
              </div>
            </div>
            {assignStudent && (
              <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Discount Type</label>
                    <select className="form-select" value={discountType} onChange={e => { setDiscountType(e.target.value as any); setDiscountValue('') }}>
                      <option value="none">No Discount</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₨)</option>
                    </select>
                  </div>
                  {discountType !== 'none' && (
                    <div className="form-group">
                      <label className="form-label">Discount Value *</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        required
                        min="0"
                        max={discountType === 'percentage' ? '100' : undefined}
                      />
                    </div>
                  )}
                </div>

                {assignTemplates.length > 0 && (() => {
                  const selectedTmpls = templates.filter(t => assignTemplates.includes(t.id))
                  const baseAmt = selectedTmpls.reduce((sum, t) => sum + Number(t.amount), 0)
                  let discountAmt = 0
                  const val = parseFloat(discountValue) || 0
                  if (discountType === 'percentage') {
                    discountAmt = baseAmt * (val / 100)
                  } else if (discountType === 'fixed') {
                    discountAmt = val
                  }
                  let netAmt = baseAmt - discountAmt
                  if (netAmt < 0) netAmt = 0

                  return (
                    <div style={{ fontSize: '0.85rem', background: 'var(--bg-base)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Total Base Fee ({selectedTmpls.length} template(s)):</span>
                        <span>₨ {baseAmt.toLocaleString()}</span>
                      </div>
                      {discountType !== 'none' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', marginBottom: '0.25rem' }}>
                          <span>Discount Deduction:</span>
                          <span>- ₨ {discountAmt.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
                        <span>Net Payable Fee:</span>
                        <span>₨ {netAmt.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Month *</label>
                <select className="form-select" value={assignMonth} onChange={e => setAssignMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year *</label>
                <select className="form-select" value={assignYear} onChange={e => setAssignYear(Number(e.target.value))}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>✅ Assign Fee / Fine</button>
          </form>
        </div>
      )}

      {tab === 'fee-history' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[['Paid', paidCount, '#10b981'],['Pending', pendingCount, '#f59e0b'],['Collected', `₨ ${collected.toLocaleString()}`, '#22d3ee']].map(([l, v, c]) => (
              <div key={String(l)} style={{ background: `${c}12`, border: `1px solid ${c}25`, borderRadius: '14px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{l}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: String(c) }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="form-select" value={selClass} onChange={e => setSelClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={load} className="btn btn-secondary">🔄 Refresh</button>
            </div>
          </div>

          {/* Challan Print Customizer Panel */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowChallanCustomizer(!showChallanCustomizer)}
                  className="btn btn-secondary"
                >
                  ⚙️ Customize Challan Settings
                </button>
                <button 
                  onClick={() => {
                    const selected = getGroupedInvoices().filter(g => selectedInvoices.includes(g.key))
                    printBulkChallans(selected)
                  }}
                  className="btn btn-primary"
                  disabled={selectedInvoices.length === 0}
                >
                  🖨️ Print Selected Challans ({selectedInvoices.length})
                </button>
                <button 
                  onClick={() => printEmptyChallans(emptyChallanCopies)}
                  className="btn btn-secondary"
                >
                  📝 Print Empty Challan ({emptyChallanCopies})
                </button>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {selectedInvoices.length} of {getGroupedInvoices().length} invoices selected
              </div>
            </div>

            {showChallanCustomizer && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">School Name Header</label>
                  <input className="form-input" value={challanSchoolName} onChange={e => setChallanSchoolName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" value={challanBankName} onChange={e => setChallanBankName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-input" value={challanAccountNo} onChange={e => setChallanAccountNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" value={challanDueDate} onChange={e => setChallanDueDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Empty Challan Copies</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="99" 
                    className="form-input" 
                    value={emptyChallanCopies} 
                    onChange={e => setEmptyChallanCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Instructions / Penalty Terms</label>
                  <input className="form-input" value={challanPenalty} onChange={e => setChallanPenalty(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            {getGroupedInvoices().length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}><div className="empty-icon">💳</div><p>No fee history records found for the selected filters.</p></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={getGroupedInvoices().length > 0 && selectedInvoices.length === getGroupedInvoices().length}
                          onChange={e => {
                            const grouped = getGroupedInvoices()
                            if (e.target.checked) {
                              setSelectedInvoices(grouped.map(g => g.key))
                            } else {
                              setSelectedInvoices([])
                            }
                          }}
                        />
                      </th>
                      <th>#</th>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Month/Year</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupedInvoices().map((g, i) => (
                      <tr key={g.key}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedInvoices.includes(g.key)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedInvoices(prev => [...prev, g.key])
                              } else {
                                setSelectedInvoices(prev => prev.filter(key => key !== g.key))
                              }
                            }}
                          />
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{g.student_name}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₨ {g.amount.toLocaleString()}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{g.month}/{g.year}</td>
                        <td>
                          <span className={`badge ${
                            g.status === 'paid' ? 'badge-success' : g.status === 'pending' ? 'badge-warning' : 'badge-info'
                          }`}>
                            {g.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{g.paid_date ? new Date(g.paid_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {g.status !== 'paid' && <button onClick={() => markPaid(g.ids)} className="btn btn-success btn-sm">✅ Mark Paid</button>}
                            <button onClick={() => printBulkChallans([g])} className="btn btn-secondary btn-sm" title="Print Challan">🖨️</button>
                            <button onClick={() => startEditGroup(g)} className="btn btn-secondary btn-sm" title="Edit Record">✏️</button>
                            <button onClick={() => deleteInvoice(g.ids)} className="btn btn-danger btn-sm" title="Delete Record">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card animate-scale" style={{ width: '480px', margin: '1rem', position: 'relative', background: 'var(--bg-surface)' }}>
            <button 
              onClick={() => setEditingGroup(null)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            >✕</button>
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Edit Student Fee Record</h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Student: <strong style={{ color: 'var(--text-primary)' }}>{editingGroup.student_name}</strong><br/>
              Month/Year: <strong>{editingGroup.month}/{editingGroup.year}</strong>
            </div>
            <form onSubmit={saveGroupEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Fee Items</h4>
                {editGroupForm.items.map((item, idx) => (
                  <div key={item.invoice_id} className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.template_name}</span>
                    <input 
                      className="form-input form-input-sm" 
                      type="number" 
                      value={item.amount} 
                      onChange={e => {
                        const updated = [...editGroupForm.items]
                        updated[idx].amount = e.target.value
                        setEditGroupForm(f => ({ ...f, items: updated }))
                      }}
                      required 
                    />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select" 
                  value={editGroupForm.status} 
                  onChange={e => setEditGroupForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {editGroupForm.status === 'paid' && (
                <div className="form-group">
                  <label className="form-label">Paid Date</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={editGroupForm.paid_date} 
                    onChange={e => setEditGroupForm(f => ({ ...f, paid_date: e.target.value }))} 
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingGroup(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
