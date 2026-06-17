'use client'
import { useState, useEffect, useCallback } from 'react'

interface Subject { id: string; name: string; class_name: string }
interface ClassItem { id: string; name: string }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [form, setForm] = useState({ name: '', class_id: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [filterClass, setFilterClass] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [sr, cr] = await Promise.all([
      fetch('/api/school/subjects').then(r => r.json()).catch(() => ({})),
      fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
    ])
    setSubjects(sr.subjects || [])
    setClasses(cr.classes || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/school/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setMsg({ type: 'success', text: 'Subject added!' }); setForm(f => ({ ...f, name: '' })); load() }
    else setMsg({ type: 'danger', text: 'Failed to add subject' })
  }

  async function deleteSubject(id: string) {
    await fetch('/api/school/subjects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = subjects.filter(s => !filterClass || s.class_name === filterClass)
  const grouped = classes.reduce((acc, c) => {
    acc[c.name] = filtered.filter(s => s.class_name === c.name)
    return acc
  }, {} as Record<string, Subject[]>)

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📚 Subjects</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage subjects for each class</p>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
        {/* Add Subject */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>➕ Add Subject</h3>
          <form onSubmit={addSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class *</label>
              <select className="form-select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} required>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject Name *</label>
              <input className="form-input" placeholder="e.g. Mathematics, English..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary">✅ Add Subject</button>
          </form>

          <hr className="divider" />

          <div style={{ marginTop: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Filter by Class</label>
            <select className="form-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Subject List */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Subject List ({filtered.length})</h3>
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📚</div><p>No subjects yet. Add subjects for each class.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(grouped).map(([className, subs]) => subs.length > 0 && (
                <div key={className}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '24px', height: '1px', background: 'var(--primary)', display: 'inline-block' }} />
                    {className}
                    <span style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>{subs.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {subs.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.45rem 0.85rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>📖 {s.name}</span>
                        <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem', padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
