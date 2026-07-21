'use client'
import { useState, useEffect, useCallback } from 'react'

interface Expense { id: string; date: string; amount: number; description: string }

type Tab = 'add' | 'ledger' | 'budget'

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>('add')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [budget, setBudget] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: '' })

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState({ date: '', amount: '', description: '' })
  const [savingEdit, setSavingEdit] = useState(false)

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
      setBudget(b => ({ ...b, year: yearVal }))
      if (yearVal !== new Date().getFullYear()) {
        setForm(f => ({ ...f, date: `${sess}-01-01` }))
      }
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/school/expenses').then(res => res.json()).catch(() => ({}))
    setExpenses(r.expenses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const r = await fetch('/api/school/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'expense', ...form })
    })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Expense added successfully!' })
      setForm(f => ({ ...f, amount: '', description: '' }))
      load()
    } else {
      setMsg({ type: 'danger', text: 'Failed to add expense' })
    }
  }

  function startEdit(exp: Expense) {
    setEditingExpense(exp)
    setEditForm({
      date: exp.date || new Date().toISOString().split('T')[0],
      amount: String(exp.amount),
      description: exp.description || ''
    })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    setSavingEdit(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExpense.id,
          date: editForm.date,
          amount: editForm.amount,
          description: editForm.description
        })
      })

      if (res.ok) {
        setMsg({ type: 'success', text: 'Expense updated successfully!' })
        setEditingExpense(null)
        load()
      } else {
        const err = await res.json().catch(() => ({}))
        setMsg({ type: 'danger', text: err.error || 'Failed to update expense' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to server' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm(`Are you sure you want to delete this expense of ₨ ${Number(exp.amount).toLocaleString()} (${exp.description || 'Expense'})?`)) {
      return
    }

    setMsg(null)
    try {
      const res = await fetch(`/api/school/expenses?id=${exp.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMsg({ type: 'success', text: 'Expense deleted successfully!' })
        load()
      } else {
        const err = await res.json().catch(() => ({}))
        setMsg({ type: 'danger', text: err.error || 'Failed to delete expense' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to server' })
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💸 Expenses</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Track, edit and manage school expenses</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {([['add', '➕ Add Expense'], ['ledger', '📒 Ledger'], ['budget', '🎯 Budget']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>➕ Add Daily Expense</h3>
            <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₨) *</label>
                <input className="form-input" type="number" step="any" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: '80px' }} />
              </div>
              <button type="submit" className="btn btn-primary">💾 Add Expense</button>
            </form>
          </div>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700 }}>Recent Expenses</h3>
              <span style={{ fontWeight: 800, color: 'var(--danger)' }}>Total: ₨ {totalExpenses.toLocaleString()}</span>
            </div>
            {loading ? (
              <div className="empty-state"><p>Loading...</p></div>
            ) : expenses.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💸</div><p>No expenses yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                {expenses.slice(0, 20).map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{exp.description || 'Expense'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--danger)', marginRight: '0.25rem' }}>₨ {Number(exp.amount).toLocaleString()}</span>
                      <button className="btn btn-secondary btn-sm" title="Edit Expense" onClick={() => startEdit(exp)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" title="Delete Expense" onClick={() => handleDelete(exp)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700 }}>📒 Expense Ledger</h3>
            <span style={{ color: 'var(--danger)', fontWeight: 800 }}>Total: ₨ {totalExpenses.toLocaleString()}</span>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td style={{ fontWeight: 600 }}>{exp.description || 'Expense'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₨ {Number(exp.amount).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(exp)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={4}><div className="empty-state"><p>No expenses recorded.</p></div></td></tr>}
              </tbody>
            </table>
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 700, margin: 0 }}>✏️ Edit Expense Record</h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.date}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₨) *</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Details..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingExpense(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
