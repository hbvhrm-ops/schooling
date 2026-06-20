'use client'
import { useState, useEffect, useCallback } from 'react'

interface ExamType { id: string; name: string }
interface ClassItem { id: string; name: string }
interface Student { id: string; name: string }

type Step = 1 | 2 | 3

export default function ResultPage() {
  const [step, setStep] = useState<Step>(1)
  const [tab, setTab] = useState('exam-types')
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [newExamType, setNewExamType] = useState('')
  const [selExam, setSelExam] = useState('')
  const [selClass, setSelClass] = useState('')
  const [marks, setMarks] = useState<Record<string, { obtained: string; total: string }>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [schedules, setSchedules] = useState<{ subject: string; date: string; time: string }[]>([{ subject: '', date: '', time: '' }])

  useEffect(() => {
    fetch('/api/school/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
    fetch('/api/school/results').then(r => r.json()).then(d => setExamTypes(d.examTypes || []))
  }, [])

  const loadStudents = useCallback(async () => {
    if (!selClass) return
    setLoading(true)
    const r = await fetch(`/api/school/students?class_id=${selClass}`)
    const d = await r.json()
    setStudents(d.students || [])
    setLoading(false)
  }, [selClass])
  useEffect(() => { loadStudents() }, [loadStudents])

  async function addExamType() {
    if (!newExamType.trim()) return
    const r = await fetch('/api/school/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'exam_type', name: newExamType }) })
    if (r.ok) { const d = await r.json(); setExamTypes(et => [...et, d.examType]); setNewExamType('') }
  }

  async function saveResults() {
    const entries = Object.entries(marks).map(([student_id, m]) => ({ student_id, exam_type_id: selExam, marks_obtained: m.obtained, total_marks: m.total }))
    const r = await fetch('/api/school/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'results', entries }) })
    if (r.ok) setMsg({ type: 'success', text: 'Results saved!' })
    else setMsg({ type: 'danger', text: 'Failed to save results' })
  }

  function printSlips() {
    const win = window.open('', '_blank')
    if (!win || students.length === 0) return
    const slipsHTML = students.map(s => `
      <div style="border:2px solid #0093cb;border-radius:8px;padding:12px;width:280px;display:inline-block;margin:8px;font-size:12px;font-family:Arial">
        <div style="background:linear-gradient(135deg,#0093cb,#22d3ee);color:white;padding:8px;border-radius:4px;text-align:center;margin-bottom:8px">
          <strong>Roll Number Slip</strong><br/>${examTypes.find(e => e.id === selExam)?.name || 'Exam'}
        </div>
        <table width="100%"><tr><td style="color:#666">Name:</td><td><strong>${s.name}</strong></td></tr>
        <tr><td style="color:#666">Class:</td><td>${classes.find(c => c.id === selClass)?.name || ''}</td></tr>
        <tr><td style="color:#666">Date:</td><td>${new Date().toLocaleDateString()}</td></tr></table>
      </div>`).join('')
    win.document.write(`<html><body style="background:#f5f5f5;padding:20px">${slipsHTML}<script>window.print();</script></body></html>`)
    win.document.close()
  }

  const stepLabels = ['Add Exam Type', 'Add Schedule', 'Add Result']

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📝 Result Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage exams, schedules and student results</p>
      </div>

      {/* Steps */}
      <div className="steps" style={{ marginBottom: '2rem' }}>
        {stepLabels.map((label, i) => (
          <div key={i} className="step" style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step-num ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>{step > i + 1 ? '✓' : i + 1}</div>
            <span className={`step-label ${step === i + 1 ? 'active' : ''}`} style={{ marginLeft: '0.4rem' }}>{label}</span>
            {i < stepLabels.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[['exam-types','📋 Exam Types'],['schedule','📅 Schedule'],['add-result','✏️ Add Result'],['consolidated','📊 Consolidated'],['slips','🎫 Roll Slips'],['settings','⚙️ Settings'],['sms','💬 SMS History']].map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'exam-types' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📋 Step 1: Add Exam Types</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input className="form-input" placeholder="e.g. Mid-Term, Final Exam, Unit Test..." value={newExamType} onChange={e => setNewExamType(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExamType()} />
            <button onClick={addExamType} className="btn btn-primary">➕ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {examTypes.map(et => (
              <div key={et.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>{et.name}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-primary">Exam</span>
                </div>
              </div>
            ))}
            {examTypes.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><p>No exam types yet. Add your first one above.</p></div>}
          </div>
          <button onClick={() => setStep(2)} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Next: Add Schedule →</button>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📅 Step 2: Add Exam Schedule</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Set date and time for each subject exam</p>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Select Exam</label>
            <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}>
              <option value="">Choose exam type</option>
              {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          {schedules.map((sch, i) => (
            <div key={i} className="grid-3" style={{ marginBottom: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-group"><label className="form-label">Subject</label><input className="form-input" placeholder="Subject name" value={sch.subject} onChange={e => { const s = [...schedules]; s[i].subject = e.target.value; setSchedules(s) }} /></div>
              <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={sch.date} onChange={e => { const s = [...schedules]; s[i].date = e.target.value; setSchedules(s) }} /></div>
              <div className="form-group"><label className="form-label">Time</label><input className="form-input" type="time" value={sch.time} onChange={e => { const s = [...schedules]; s[i].time = e.target.value; setSchedules(s) }} /></div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={() => setSchedules(s => [...s, { subject: '', date: '', time: '' }])} className="btn btn-secondary">➕ Add Subject</button>
            <button onClick={() => setStep(3)} className="btn btn-primary">Next: Add Results →</button>
          </div>
        </div>
      )}

      {tab === 'add-result' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Step 3: Add Results</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: '200px' }} value={selExam} onChange={e => setSelExam(e.target.value)}>
              <option value="">Select Exam</option>
              {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select className="form-select" style={{ width: '180px' }} value={selClass} onChange={e => setSelClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!selClass || !selExam ? (
            <div className="empty-state"><div className="empty-icon">📝</div><p>Select exam and class to enter marks</p></div>
          ) : loading ? (
            <div className="empty-state"><p>Loading students...</p></div>
          ) : (
            <>
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead><tr><th>#</th><th>Student Name</th><th>Marks Obtained</th><th>Total Marks</th><th>%</th></tr></thead>
                  <tbody>
                    {students.map((s, i) => {
                      const m = marks[s.id] || { obtained: '', total: '100' }
                      const pct = m.obtained && m.total ? Math.round((Number(m.obtained) / Number(m.total)) * 100) : 0
                      return (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td><input className="form-input" style={{ width: '100px' }} type="number" placeholder="0" value={m.obtained} onChange={e => setMarks(mk => ({ ...mk, [s.id]: { ...mk[s.id], obtained: e.target.value, total: mk[s.id]?.total || '100' } }))} /></td>
                          <td><input className="form-input" style={{ width: '100px' }} type="number" placeholder="100" value={m.total} onChange={e => setMarks(mk => ({ ...mk, [s.id]: { ...mk[s.id], total: e.target.value, obtained: mk[s.id]?.obtained || '' } }))} /></td>
                          <td>
                            {m.obtained ? (
                              <span className={`badge ${pct >= 50 ? 'badge-success' : 'badge-danger'}`}>{pct}%</span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={saveResults} className="btn btn-primary">💾 Save Results</button>
            </>
          )}
        </div>
      )}

      {tab === 'slips' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎫 Roll Number Slips</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}><option value="">Select Exam</option>{examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <select className="form-select" value={selClass} onChange={e => setSelClass(e.target.value)}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <button onClick={printSlips} className="btn btn-primary" disabled={!selExam || !selClass}>🖨️ Generate & Print Slips</button>
        </div>
      )}

      {tab === 'consolidated' && (
        <div className="card"><h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📊 Consolidated Result Sheet</h3><p style={{ color: 'var(--text-secondary)' }}>Select an exam type and class to view the full consolidated result sheet.</p></div>
      )}
      {tab === 'settings' && (
        <div className="card"><h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚙️ Result Settings</h3><p style={{ color: 'var(--text-secondary)' }}>Configure result calculation method, pass marks and report format.</p></div>
      )}
      {tab === 'sms' && (
        <div className="card"><h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>💬 Result SMS History</h3><div className="empty-state"><div className="empty-icon">📱</div><p>No result SMS sent yet.</p></div></div>
      )}
    </div>
  )
}
