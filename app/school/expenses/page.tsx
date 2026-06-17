'use client'
import { useState, useEffect, useCallback } from 'react'

interface Expense { id: string; date: string; head_name: string; source_name: string; amount: number; description: string }
interface ExpenseHead { id: string; name: string }
interface PaymentSource { id: string; name: string }

type Tab = 'add' | 'reports' | 'ledger' | 'heads' | 'sources' | 'budget'

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>('add')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [heads, setHeads] = useState<ExpenseHead[]>([])
  const [sources, setSources] = useState<PaymentSource[]>([])
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], head_id: '', source_id: '', amount: '', description: '' })
  const [newHead, setNewHead] = useState('')
  const [newSource, setNewSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [budget, setBudget] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/school/expenses').then(res => res.json()).catch(() => ({}))
    setExpenses(r.expenses || [])
    setHeads(r.heads || [])
    setSources(r.sources || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/school/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', ...form }) })
    if (r.ok) { setMsg({ type: 'success', text: 'Expense added!' }); setForm(f => ({ ...f, amount: '', description: '' })); load() }
    else setMsg({ type: 'danger', text: 'Failed to add expense' })
  }

  async function addHead() {
    if (!newHead.trim()) return
    const r = await fetch('/api/school/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'head', name: newHead }) })
    if (r.ok) { setNewHead(''); load() }
  }

  async function addSource() {
    if (!newSource.trim()) return
    const r = await fetch('/api/school/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'source', name: newSource }) })
    if (r.ok) { setNewSource(''); load() }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byHead = heads.map(h => ({ name: h.name, total: expenses.filter(e => e.head_name === h.name).reduce((s, e) => s + Number(e.amount), 0) })).filter(h => h.total > 0)

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💸 Expenses</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Track and manage school expenses</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {([['add','➕ Add Expense'],['reports','📊 Reports'],['ledger','📒 Ledger'],['heads','🏷️ Expense Heads'],['sources','💳 Payment Sources'],['budget','🎯 Budget']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>➕ Add Daily Expense</h3>
            <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Expense Head *</label>
                <select className="form-select" value={form.head_id} onChange={e => setForm(f => ({ ...f, head_id: e.target.value }))} required>
                  <option value="">Select Head</option>
                  {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Payment Source</label>
                <select className="form-select" value={form.source_id} onChange={e => setForm(f => ({ ...f, source_id: e.target.value }))}>
                  <option value="">Select Source</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Amount (₨) *</label><input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: '80px' }} /></div>
              <button type="submit" className="btn btn-primary">💾 Add Expense</button>
            </form>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700 }}>Recent Expenses</h3>
              <span style={{ fontWeight: 800, color: 'var(--danger)' }}>Total: ₨ {totalExpenses.toLocaleString()}</span>
            </div>
            {loading ? <div className="empty-state"><p>Loading...</p></div> : expenses.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💸</div><p>No expenses yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                {expenses.slice(0, 20).map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{exp.head_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.date} · {exp.source_name || 'Cash'}</div>
                      {exp.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{exp.description}</div>}
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--danger)' }}>₨ {Number(exp.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📊 Expense Reports</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {byHead.map(h => (
              <div key={h.name} style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{h.name}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)' }}>₨ {h.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
          {byHead.length === 0 && <div className="empty-state"><div className="empty-icon">📊</div><p>No expense data to report yet.</p></div>}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: 700 }}>📒 Expense Ledger</h3>
            <span style={{ color: 'var(--danger)', fontWeight: 800 }}>Total: ₨ {totalExpenses.toLocaleString()}</span>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead><tr><th>Date</th><th>Head</th><th>Source</th><th>Description</th><th>Amount</th></tr></thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td style={{ fontWeight: 600 }}>{exp.head_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.source_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{exp.description || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₨ {Number(exp.amount).toLocaleString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={5}><div className="empty-state"><p>No expenses recorded.</p></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'heads' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>🏷️ Expense Heads</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input className="form-input" placeholder="e.g. Salary, Utilities, Stationery..." value={newHead} onChange={e => setNewHead(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHead()} />
            <button onClick={addHead} className="btn btn-primary">➕ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {heads.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>🏷️ {h.name}</span>
              </div>
            ))}
            {heads.length === 0 && <div className="empty-state"><p>No expense heads. Add your first one above.</p></div>}
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>💳 Payment Sources</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input className="form-input" placeholder="e.g. Cash, HBL Bank, MCB Bank..." value={newSource} onChange={e => setNewSource(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSource()} />
            <button onClick={addSource} className="btn btn-primary">➕ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>💳 {s.name}</span>
              </div>
            ))}
            {sources.length === 0 && <div className="empty-state"><p>No payment sources. Add your first one above.</p></div>}
          </div>
        </div>
      )}

      {tab === 'budget' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎯 Monthly Budget</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Month</label>
                <select className="form-select" value={budget.month} onChange={e => setBudget(b => ({ ...b, month: Number(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Year</label>
                <select className="form-select" value={budget.year} onChange={e => setBudget(b => ({ ...b, year: Number(e.target.value) }))}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Budget Amount (₨)</label><input className="form-input" type="number" value={budget.amount} onChange={e => setBudget(b => ({ ...b, amount: e.target.value }))} /></div>
            <button className="btn btn-primary">💾 Save Budget</button>
          </div>
        </div>
      )}
    </div>
  )
}
