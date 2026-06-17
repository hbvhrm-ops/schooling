'use client'
import { useState, useEffect, useCallback } from 'react'

interface ClassItem { id: string; name: string }
interface SectionItem { id: string; name: string; class_id: string; classes?: { name: string } }

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [newClass, setNewClass] = useState('')
  const [newSection, setNewSection] = useState('')
  const [selClassForSection, setSelClassForSection] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/school/classes').then(res => res.json()).catch(() => ({}))
    setClasses(r.classes || [])
    setSections(r.sections || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function addClass() {
    if (!newClass.trim()) return
    const r = await fetch('/api/school/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClass }) })
    if (r.ok) { setMsg({ type: 'success', text: `Class "${newClass}" added!` }); setNewClass(''); load() }
    else setMsg({ type: 'danger', text: 'Failed to add class' })
  }

  async function addSection() {
    if (!newSection.trim() || !selClassForSection) { setMsg({ type: 'danger', text: 'Select a class first' }); return }
    const r = await fetch('/api/school/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'section', name: newSection, class_id: selClassForSection }) })
    if (r.ok) { setMsg({ type: 'success', text: `Section "${newSection}" added!` }); setNewSection(''); load() }
    else setMsg({ type: 'danger', text: 'Failed to add section' })
  }

  async function deleteClass(id: string) {
    if (!confirm('Delete this class? Its sections will also be removed.')) return
    await fetch('/api/school/classes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function deleteSection(id: string) {
    await fetch('/api/school/classes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'section' }) })
    load()
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>🏛️ Classes & Sections</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage school classes and their sections</p>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Classes */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📚 Classes</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input className="form-input" placeholder="e.g. Grade 1, Class 5, Matric..." value={newClass} onChange={e => setNewClass(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} />
            <button onClick={addClass} className="btn btn-primary">➕ Add</button>
          </div>
          {loading ? <div className="empty-state"><p>Loading...</p></div> : classes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏛️</div><p>No classes yet. Add your first class.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {classes.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>🏛️ {c.name}</span>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {sections.filter(s => s.class_id === c.id).length} section(s)
                    </span>
                  </div>
                  <button onClick={() => deleteClass(c.id)} className="btn btn-danger btn-sm">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📂 Sections</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <select className="form-select" value={selClassForSection} onChange={e => setSelClassForSection(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input className="form-input" placeholder="e.g. A, B, Red, Blue..." value={newSection} onChange={e => setNewSection(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSection()} />
              <button onClick={addSection} className="btn btn-primary">➕ Add</button>
            </div>
          </div>

          {classes.length === 0 ? (
            <div className="empty-state"><p>Add classes first to create sections.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {classes.map(c => {
                const classSections = sections.filter(s => s.class_id === c.id)
                return (
                  <div key={c.id}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {classSections.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No sections</span>
                      ) : classSections.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '0.3rem 0.7rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary-light)', fontSize: '0.875rem' }}>{s.name}</span>
                          <button onClick={() => deleteSection(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
