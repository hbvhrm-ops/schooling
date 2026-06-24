'use client'
import { useState, useEffect, useCallback } from 'react'

interface School {
  id: string; name: string; username: string; contact: string;
  active: boolean; created_at: string; monthly_income?: number; logo_url?: string
}
interface FormData { name: string; username: string; password: string; contact: string; logo_url: string }

function generateUsername(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_school'
}
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSchool, setEditSchool] = useState<School | null>(null)
  const [incomeModal, setIncomeModal] = useState<School | null>(null)
  const [incomeAmount, setIncomeAmount] = useState('')
  const [form, setForm] = useState<FormData>({ name: '', username: '', password: '', contact: '', logo_url: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [showPass, setShowPass] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/schools')
    const d = await r.json()
    setSchools(d.schools || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditSchool(null)
    setForm({ name: '', username: '', password: generatePassword(), contact: '', logo_url: '' })
    setShowModal(true)
  }
  function openEdit(s: School) {
    setEditSchool(s)
    setForm({ name: s.name, username: s.username, password: '', contact: s.contact || '', logo_url: s.logo_url || '' })
    setShowModal(true)
  }
  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, username: editSchool ? f.username : generateUsername(name) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)
    try {
      const method = editSchool ? 'PUT' : 'POST'
      const body = editSchool
        ? { id: editSchool.id, name: form.name, contact: form.contact, logo_url: form.logo_url, ...(form.password ? { password: form.password } : {}) }
        : form
      const r = await fetch('/api/admin/schools', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setMsg({ type: 'danger', text: d.error || 'Failed' }); return }
      setMsg({ type: 'success', text: editSchool ? 'School updated!' : `School created! Username: ${form.username}` })
      setShowModal(false)
      load()
    } catch { setMsg({ type: 'danger', text: 'Error occurred' }) }
    finally { setSubmitting(false) }
  }

  async function handleToggle(school: School) {
    await fetch('/api/admin/schools', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: school.id, active: !school.active }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this school? All its data will be removed.')) return
    await fetch('/api/admin/schools', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function handleIncomeUpdate() {
    if (!incomeModal) return
    await fetch('/api/admin/schools', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: incomeModal.id, monthly_income: parseFloat(incomeAmount) }),
    })
    setIncomeModal(null)
    load()
  }

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Schools <span className="gradient-text">Management</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Register and manage all schools
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">➕ Register New School</button>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Search by school name or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700 }}>Registered Schools ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏫</div><p>No schools found.</p></div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>School Name</th><th>Username</th><th>Contact</th>
                  <th>Monthly Income</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school, i) => (
                  <tr key={school.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {school.logo_url ? (
                          <img src={school.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', border: '1px solid var(--border)', background: '#f8fafc', padding: '2px' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏫</div>
                        )}
                        <span>{school.name}</span>
                      </div>
                    </td>
                    <td><code style={{ background: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>{school.username}</code></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{school.contact || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                          {school.monthly_income ? `₨ ${Number(school.monthly_income).toLocaleString()}` : '—'}
                        </span>
                        <button onClick={() => { setIncomeModal(school); setIncomeAmount(String(school.monthly_income || '')) }} className="btn btn-secondary btn-sm">✏️</button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${school.active ? 'badge-success' : 'badge-danger'}`}>
                        {school.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button onClick={() => openEdit(school)} className="btn btn-secondary btn-sm">✏️ Edit</button>
                        <button onClick={() => handleToggle(school)} className={`btn btn-sm ${school.active ? 'btn-warning' : 'btn-success'}`}>
                          {school.active ? '⏸ Disable' : '▶ Enable'}
                        </button>
                        <button onClick={() => handleDelete(school.id)} className="btn btn-danger btn-sm">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-slide">
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editSchool ? '✏️ Edit School' : '🏫 Register New School'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">School Name *</label>
                  <input className="form-input" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Sunrise Public School" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="school_username" required disabled={!!editSchool} />
                  {!editSchool && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-generated from school name. Can be customized.</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">{editSchool ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" style={{ paddingRight: '5rem' }} type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editSchool ? 'Leave blank to keep' : 'Enter password'} required={!editSchool} />
                    <div style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '0.25rem' }}>
                      <button type="button" onClick={() => setShowPass(!showPass)} className="btn btn-secondary btn-sm">{showPass ? '🙈' : '👁️'}</button>
                      <button type="button" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))} className="btn btn-secondary btn-sm">🔄</button>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="03xx-xxxxxxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">School Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                      📁 Choose Logo Image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setForm(f => ({ ...f, logo_url: reader.result as string }))
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                    {form.logo_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={form.logo_url} alt="School Logo Preview" style={{ maxHeight: '40px', maxWidth: '40px', objectFit: 'contain', border: '1px solid var(--border)', padding: '2px', borderRadius: '4px' }} />
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setForm(f => ({ ...f, logo_url: '' }))}>✕ Remove</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No logo uploaded</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : editSchool ? '✅ Update School' : '🏫 Register School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {incomeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIncomeModal(null)}>
          <div className="modal animate-slide" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>💰 Update Monthly Income</h3>
              <button onClick={() => setIncomeModal(null)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{incomeModal.name}</p>
              <div className="form-group">
                <label className="form-label">Monthly Income (₨)</label>
                <input className="form-input" type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIncomeModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleIncomeUpdate} className="btn btn-success">✅ Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
