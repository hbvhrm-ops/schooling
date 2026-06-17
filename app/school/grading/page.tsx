'use client'
import { useState, useEffect, useCallback } from 'react'

interface Grade { id: string; grade: string; min_marks: number; max_marks: number; gpa: string; remarks: string }

const defaultGrades = [
  { grade: 'A+', min_marks: 90, max_marks: 100, gpa: '4.0', remarks: 'Excellent' },
  { grade: 'A',  min_marks: 80, max_marks: 89,  gpa: '3.7', remarks: 'Very Good' },
  { grade: 'B+', min_marks: 70, max_marks: 79,  gpa: '3.3', remarks: 'Good' },
  { grade: 'B',  min_marks: 60, max_marks: 69,  gpa: '3.0', remarks: 'Above Average' },
  { grade: 'C',  min_marks: 50, max_marks: 59,  gpa: '2.0', remarks: 'Average' },
  { grade: 'D',  min_marks: 40, max_marks: 49,  gpa: '1.0', remarks: 'Below Average' },
  { grade: 'F',  min_marks: 0,  max_marks: 39,  gpa: '0.0', remarks: 'Fail' },
]

export default function GradingPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [editing, setEditing] = useState<Grade | null>(null)
  const [form, setForm] = useState({ grade: '', min_marks: '', max_marks: '', gpa: '', remarks: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/school/grading').then(res => res.json()).catch(() => ({}))
    setGrades(r.grades || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function loadDefaults() {
    if (!confirm('This will replace your current grading policy with the default one. Continue?')) return
    for (const g of defaultGrades) {
      await fetch('/api/school/grading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(g) })
    }
    setMsg({ type: 'success', text: 'Default grading policy loaded!' })
    load()
  }

  async function saveGrade(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { id: editing.id, ...form } : form
    const r = await fetch('/api/school/grading', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { setMsg({ type: 'success', text: 'Grade saved!' }); setForm({ grade: '', min_marks: '', max_marks: '', gpa: '', remarks: '' }); setEditing(null); load() }
    else setMsg({ type: 'danger', text: 'Failed to save grade' })
  }

  async function deleteGrade(id: string) {
    await fetch('/api/school/grading', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  function startEdit(g: Grade) {
    setEditing(g)
    setForm({ grade: g.grade, min_marks: String(g.min_marks), max_marks: String(g.max_marks), gpa: g.gpa, remarks: g.remarks })
  }

  const gradeColors: Record<string, string> = { 'A+': '#10b981', 'A': '#34d399', 'B+': '#6366f1', 'B': '#818cf8', 'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444' }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>⭐ Grading Policy</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Define grade boundaries and GPA scale</p>
        </div>
        <button onClick={loadDefaults} className="btn btn-secondary">📋 Load Default Grades</button>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem' }}>
        {/* Form */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{editing ? '✏️ Edit Grade' : '➕ Add Grade'}</h3>
          <form onSubmit={saveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Grade *</label><input className="form-input" placeholder="e.g. A+, B, C..." value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Min Marks *</label><input className="form-input" type="number" min="0" max="100" value={form.min_marks} onChange={e => setForm(f => ({ ...f, min_marks: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Max Marks *</label><input className="form-input" type="number" min="0" max="100" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} required /></div>
            </div>
            <div className="form-group"><label className="form-label">GPA</label><input className="form-input" placeholder="e.g. 4.0" value={form.gpa} onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Remarks</label><input className="form-input" placeholder="e.g. Excellent, Pass, Fail..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">{editing ? '✅ Update' : '➕ Add Grade'}</button>
              {editing && <button type="button" onClick={() => { setEditing(null); setForm({ grade: '', min_marks: '', max_marks: '', gpa: '', remarks: '' }) }} className="btn btn-secondary">Cancel</button>}
            </div>
          </form>
        </div>

        {/* Grades Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 700 }}>Grading Scale ({grades.length} grades)</h3>
          </div>
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : grades.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <div className="empty-icon">⭐</div>
              <p>No grading policy set. Click &ldquo;Load Default Grades&rdquo; to get started.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead><tr><th>Grade</th><th>Min Marks</th><th>Max Marks</th><th>GPA</th><th>Remarks</th><th>Actions</th></tr></thead>
                <tbody>
                  {grades.sort((a, b) => b.min_marks - a.min_marks).map(g => (
                    <tr key={g.id}>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: gradeColors[g.grade] || 'var(--text-primary)' }}>
                          {g.grade}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.min_marks}%</td>
                      <td style={{ fontWeight: 600 }}>{g.max_marks}%</td>
                      <td><span className="badge badge-primary">{g.gpa || '—'}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{g.remarks || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => startEdit(g)} className="btn btn-secondary btn-sm">✏️</button>
                          <button onClick={() => deleteGrade(g.id)} className="btn btn-danger btn-sm">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
