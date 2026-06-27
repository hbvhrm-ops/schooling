'use client'
import { useState, useEffect, useCallback } from 'react'

interface FeeTemplate { id: string; name: string; amount: number; frequency: string }
interface ClassItem { id: string; name: string }
interface Invoice { id: string; student_name: string; amount: number; month: number; year: number; status: string; paid_date?: string }

type Tab = 'templates' | 'assign-fee' | 'fee-history'

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
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editInvoiceForm, setEditInvoiceForm] = useState({ amount: '', status: '', paid_date: '' })

  const [assignClass, setAssignClass] = useState('')
  const [assignStudent, setAssignStudent] = useState('')
  const [assignTemplate, setAssignTemplate] = useState('')
  const [assignMonth, setAssignMonth] = useState(new Date().getMonth() + 1)
  const [assignYear, setAssignYear] = useState(new Date().getFullYear())

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

  function startEditInvoice(inv: Invoice) {
    setEditingInvoice(inv)
    setEditInvoiceForm({
      amount: String(inv.amount),
      status: inv.status,
      paid_date: inv.paid_date || new Date().toISOString().split('T')[0]
    })
  }

  async function saveInvoiceEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingInvoice) return
    const updates = {
      amount: parseFloat(editInvoiceForm.amount),
      status: editInvoiceForm.status,
      paid_date: editInvoiceForm.status === 'paid' ? editInvoiceForm.paid_date : null
    }
    const r = await fetch('/api/school/fee', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingInvoice.id, ...updates })
    })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Fee record updated!' })
      setEditingInvoice(null)
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to update fee record' })
    }
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Are you sure you want to delete this fee record?')) return
    const r = await fetch(`/api/school/fee?type=invoice&id=${id}`, { method: 'DELETE' })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Fee record deleted!' })
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to delete fee record' })
    }
  }

  async function handleAssignFee(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTemplate || (!assignClass && !assignStudent)) {
      setMsg({ type: 'danger', text: 'Fee template and either Class or a specific Student are required.' })
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
          fee_template_id: assignTemplate,
          month: assignMonth,
          year: assignYear
        })
      })
      if (r.ok) {
        const d = await r.json()
        setMsg({ type: 'success', text: `Fee assigned successfully! Generated ${d.count} invoice(s).` })
        setAssignClass('')
        setAssignStudent('')
        setAssignTemplate('')
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

  async function markPaid(id: string) {
    await fetch('/api/school/fee', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid', paid_date: new Date().toISOString().split('T')[0] }) })
    load()
  }

  function printChallan(inv: Invoice) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Challan</title><style>
      body{font-family:Arial;margin:20px;} .challan{border:2px solid #333;padding:15px;max-width:400px;margin:auto;}
      .header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:10px;}
      .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc;}
      .amount{font-size:20px;font-weight:bold;text-align:center;margin:10px 0;color:#0093cb;}
    </style></head><body>
    <div class="challan">
      <div class="header"><h2>💳 Fee Challan</h2></div>
      <div class="row"><span>Student:</span><strong>${inv.student_name}</strong></div>
      <div class="row"><span>Month:</span><span>${inv.month}/${inv.year}</span></div>
      <div class="row"><span>Status:</span><span>${inv.status.toUpperCase()}</span></div>
      <div class="amount">₨ ${Number(inv.amount).toLocaleString()}</div>
      <div style="text-align:center;color:#666;font-size:12px;margin-top:10px">EduManage School System</div>
    </div>
    <script>window.print();</script></body></html>`)
    win.document.close()
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
              <label className="form-label">Fee Template / Fine *</label>
              <select className="form-select" value={assignTemplate} onChange={e => setAssignTemplate(e.target.value)} required>
                <option value="">Select Template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} — ₨{Number(t.amount).toLocaleString()}</option>)}
              </select>
            </div>
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

          <div className="card" style={{ padding: 0 }}>
            {invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}><div className="empty-icon">💳</div><p>No fee history records found for the selected filters.</p></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table>
                  <thead><tr><th>#</th><th>Student</th><th>Amount</th><th>Month/Year</th><th>Status</th><th>Paid Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={inv.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{inv.student_name}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₨ {Number(inv.amount).toLocaleString()}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{inv.month}/{inv.year}</td>
                        <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{inv.status}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{inv.paid_date ? new Date(inv.paid_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {inv.status !== 'paid' && <button onClick={() => markPaid(inv.id)} className="btn btn-success btn-sm">✅ Mark Paid</button>}
                            <button onClick={() => printChallan(inv)} className="btn btn-secondary btn-sm" title="Print Challan">🖨️</button>
                            <button onClick={() => startEditInvoice(inv)} className="btn btn-secondary btn-sm" title="Edit Record">✏️</button>
                            <button onClick={() => deleteInvoice(inv.id)} className="btn btn-danger btn-sm" title="Delete Record">🗑️</button>
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

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card animate-scale" style={{ width: '450px', margin: '1rem', position: 'relative', background: 'var(--bg-surface)' }}>
            <button 
              onClick={() => setEditingInvoice(null)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            >✕</button>
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Edit Student Fee Record</h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Student: <strong style={{ color: 'var(--text-primary)' }}>{editingInvoice.student_name}</strong><br/>
              Month/Year: <strong>{editingInvoice.month}/{editingInvoice.year}</strong>
            </div>
            <form onSubmit={saveInvoiceEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Amount (₨) *</label>
                <input 
                  className="form-input" 
                  type="number" 
                  value={editInvoiceForm.amount} 
                  onChange={e => setEditInvoiceForm(f => ({ ...f, amount: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select" 
                  value={editInvoiceForm.status} 
                  onChange={e => setEditInvoiceForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {editInvoiceForm.status === 'paid' && (
                <div className="form-group">
                  <label className="form-label">Paid Date</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={editInvoiceForm.paid_date} 
                    onChange={e => setEditInvoiceForm(f => ({ ...f, paid_date: e.target.value }))} 
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
