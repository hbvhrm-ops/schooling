'use client'
import { useState, useEffect, useCallback } from 'react'

interface Staff { id: string; name: string; role: string; salary: number; contact: string; join_date: string; status: string }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Staff | null>(null)
  const [form, setForm] = useState({ name: '', role: 'Teacher', salary: '', contact: '', join_date: new Date().toISOString().split('T')[0], status: 'active' })
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/school/staff').then(res => res.json()).catch(() => ({}))
    setStaff(r.staff || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ name: '', role: 'Teacher', salary: '', contact: '', join_date: new Date().toISOString().split('T')[0], status: 'active' }); setShowModal(true) }
  function openEdit(s: Staff) { setEditItem(s); setForm({ name: s.name, role: s.role, salary: String(s.salary), contact: s.contact || '', join_date: s.join_date || '', status: s.status }); setShowModal(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg(null)
    const method = editItem ? 'PUT' : 'POST'
    const body = editItem ? { id: editItem.id, ...form } : form
    const r = await fetch('/api/school/staff', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { setMsg({ type: 'success', text: editItem ? 'Staff updated!' : 'Staff member added!' }); setShowModal(false); load() }
    else setMsg({ type: 'danger', text: 'Failed to save staff' })
    setSubmitting(false)
  }

  async function deleteStaff(id: string) {
    if (!confirm('Remove this staff member?')) return
    await fetch('/api/school/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = staff.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()))
  const totalSalary = staff.filter(s => s.status === 'active').reduce((sum, s) => sum + Number(s.salary || 0), 0)
  const roles = ['Teacher', 'Principal', 'Vice Principal', 'Admin Staff', 'Peon', 'Guard', 'Accountant', 'Lab Assistant', 'Driver', 'Other']

  const roleColors: Record<string, string> = { 'Teacher': '#6366f1', 'Principal': '#10b981', 'Vice Principal': '#22d3ee', 'Admin Staff': '#f59e0b', 'Accountant': '#8b5cf6' }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>👥 Staff</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage school staff and salaries</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">➕ Add Staff Member</button>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          ['Total Staff', staff.length, '#6366f1'],
          ['Active', staff.filter(s => s.status === 'active').length, '#10b981'],
          ['Monthly Salary', `₨ ${totalSalary.toLocaleString()}`, '#f59e0b'],
        ].map(([l, v, c]) => (
          <div key={String(l)} style={{ background: `${c}12`, border: `1px solid ${c}25`, borderRadius: '14px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{l}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: String(c) }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 700 }}>Staff Members ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}><div className="empty-icon">👥</div><p>No staff members. Add your first staff member.</p></div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Salary</th><th>Contact</th><th>Join Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td>
                      <span className="badge badge-primary" style={{ background: `${roleColors[s.role] || '#6366f1'}18`, color: roleColors[s.role] || '#818cf8' }}>
                        {s.role}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₨ {Number(s.salary || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.contact || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.join_date ? new Date(s.join_date).toLocaleDateString() : '—'}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => openEdit(s)} className="btn btn-secondary btn-sm">✏️</button>
                        <button onClick={() => deleteStaff(s.id)} className="btn btn-danger btn-sm">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-slide">
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editItem ? '✏️ Edit Staff' : '➕ Add Staff Member'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Role *</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Monthly Salary (₨)</label><input className="form-input" type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Join Date</label><input className="form-input" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '⏳ Saving...' : '✅ Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
