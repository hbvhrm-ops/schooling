'use client'
import { useState, useEffect, useCallback } from 'react'

interface FeeTemplate { id: string; name: string; amount: number; frequency: string }
interface ClassItem { id: string; name: string }
interface Invoice { id: string; student_name: string; amount: number; month: number; year: number; status: string; paid_date?: string }

type Tab = 'templates' | 'criteria' | 'invoices' | 'easy-fee' | 'history' | 'discount' | 'fine' | 'challan' | 'advance' | 'average'

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

  async function addTemplate(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/school/fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'template', ...form }) })
    if (r.ok) { setMsg({ type: 'success', text: 'Fee template added!' }); setForm({ name: '', amount: '', frequency: 'Monthly' }); load() }
    else setMsg({ type: 'danger', text: 'Failed to add template' })
  }

  async function generateInvoices() {
    const r = await fetch('/api/school/fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'generate_invoices', month: selMonth, year: selYear, class_id: selClass }) })
    if (r.ok) { setMsg({ type: 'success', text: 'Fee invoices generated!' }); load() }
    else setMsg({ type: 'danger', text: 'Failed to generate invoices' })
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

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💳 Fee Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage fee templates, invoices and collections</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([['templates','📄 Templates (Step 1)'],['criteria','🎯 Criteria (Step 2)'],['invoices','📋 Invoices (Step 3)'],['easy-fee','⚡ Easy Fee'],['discount','🎁 Discount/Scholarship'],['advance','💰 Advance Fee'],['fine','⚠️ Fine Policy'],['average','📊 Average Fee'],['challan','🖨️ Challan Settings'],['history','💬 SMS History']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📄 Step 1: Create Fee Template</h3>
            <form onSubmit={addTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Template Name *</label><input className="form-input" placeholder="e.g. Monthly Tuition Fee" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Amount (₨) *</label><input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Frequency</label>
                <select className="form-select" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  <option>Monthly</option><option>Quarterly</option><option>Annual</option><option>One-Time</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">➕ Add Template</button>
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
                    <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>₨ {Number(t.amount).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'criteria' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎯 Step 2: Fee Criteria (Assign to Classes)</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Assign fee templates to specific classes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Class</label>
              <select className="form-select"><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Fee Template</label>
              <select className="form-select"><option value="">Select Template</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} — ₨{Number(t.amount).toLocaleString()}</option>)}</select>
            </div>
            <button className="btn btn-primary">✅ Assign Template to Class</button>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
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
              <button onClick={generateInvoices} className="btn btn-primary">⚡ Generate Invoices</button>
              <button onClick={load} className="btn btn-secondary">🔄 Refresh</button>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}><div className="empty-icon">💳</div><p>No invoices. Generate invoices for the selected month.</p></div>
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
                            <button onClick={() => printChallan(inv)} className="btn btn-secondary btn-sm">🖨️</button>
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

      {tab === 'easy-fee' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚡ Easy Fee Collection</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Quickly collect fee for a student by searching their name.</p>
          <div className="search-bar" style={{ marginBottom: '1rem' }}>
            <span className="search-icon">🔍</span>
            <input className="form-input" placeholder="Search student..." />
          </div>
          <div className="alert alert-info"><span>ℹ️</span> Search for a student and click Collect Fee to process payment quickly.</div>
        </div>
      )}

      {tab === 'discount' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎁 Discount & Scholarship</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Student</label><input className="form-input" placeholder="Search student..." /></div>
            <div className="form-group"><label className="form-label">Discount Type</label>
              <select className="form-select"><option>Percentage (%)</option><option>Fixed Amount (₨)</option></select>
            </div>
            <div className="form-group"><label className="form-label">Value</label><input className="form-input" type="number" placeholder="0" /></div>
            <div className="form-group"><label className="form-label">Reason</label><textarea className="form-textarea" placeholder="Scholarship reason..." style={{ minHeight: '80px' }} /></div>
            <button className="btn btn-primary">✅ Apply Discount</button>
          </div>
        </div>
      )}

      {tab === 'fine' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>⚠️ Fine Policy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Late Payment Grace Period (days)</label><input className="form-input" type="number" defaultValue="10" /></div>
            <div className="form-group"><label className="form-label">Fine Type</label><select className="form-select"><option>Fixed Amount</option><option>Percentage per day</option></select></div>
            <div className="form-group"><label className="form-label">Fine Amount (₨)</label><input className="form-input" type="number" defaultValue="50" /></div>
            <button className="btn btn-primary">💾 Save Fine Policy</button>
          </div>
        </div>
      )}

      {tab === 'average' && (
        <div className="card"><h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📊 Average Fee per Class</h3><p style={{ color: 'var(--text-secondary)' }}>Average fee analysis per class will be shown here once invoice data is available.</p></div>
      )}

      {tab === 'challan' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🖨️ Challan Form Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" placeholder="e.g. HBL, UBL, MCB..." /></div>
            <div className="form-group"><label className="form-label">Account Number</label><input className="form-input" placeholder="School bank account number" /></div>
            <div className="form-group"><label className="form-label">Challan Footer Note</label><textarea className="form-textarea" placeholder="Payment instructions..." style={{ minHeight: '80px' }} /></div>
            <button className="btn btn-primary">💾 Save Settings</button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card"><h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>💬 Fee SMS History</h3><div className="empty-state"><div className="empty-icon">📱</div><p>No fee SMS sent yet.</p></div></div>
      )}

      {tab === 'advance' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>💰 Advance Fee Collection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Student</label><input className="form-input" placeholder="Search student..." /></div>
            <div className="form-group"><label className="form-label">Advance Amount (₨)</label><input className="form-input" type="number" /></div>
            <div className="form-group"><label className="form-label">For Month</label><input className="form-input" type="month" /></div>
            <button className="btn btn-primary">✅ Collect Advance Fee</button>
          </div>
        </div>
      )}
    </div>
  )
}
