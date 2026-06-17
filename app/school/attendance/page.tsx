'use client'
import { useState, useEffect, useCallback } from 'react'

interface Student { id: string; name: string; class_name: string; section_name: string }
interface ClassItem { id: string; name: string }
interface SectionItem { id: string; name: string; class_id: string }
interface AttRecord { student_id: string; status: 'present' | 'absent' | 'leave' }

type Tab = 'mark' | 'daily' | 'monthly' | 'sessional' | 'history'

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('mark')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selClass, setSelClass] = useState('')
  const [selSection, setSelSection] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'leave'>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<{ date: string; present: number; absent: number; leave: number }[]>([])

  useEffect(() => {
    fetch('/api/school/classes').then(r => r.json()).then(d => {
      setClasses(d.classes || [])
      setSections(d.sections || [])
    })
  }, [])

  const filteredSections = sections.filter(s => !selClass || s.class_id === selClass)

  const loadStudents = useCallback(async () => {
    if (!selClass) return
    setLoading(true)
    const params = new URLSearchParams({ class_id: selClass, ...(selSection ? { section_id: selSection } : {}) })
    const r = await fetch(`/api/school/students?${params}`)
    const d = await r.json()
    const list = (d.students || []).filter((s: Student & { status?: string }) => s.status !== 'discharged' || !s.status)
    setStudents(list)
    // Initialize all as present
    const init: Record<string, 'present' | 'absent' | 'leave'> = {}
    list.forEach((s: Student) => { init[s.id] = 'present' })
    setAttendance(init)
    setLoading(false)
  }, [selClass, selSection])

  useEffect(() => { loadStudents() }, [loadStudents])

  async function saveAttendance() {
    setSaving(true); setMsg(null)
    const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id, status, date }))
    const r = await fetch('/api/school/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }) })
    if (r.ok) setMsg({ type: 'success', text: `Attendance saved for ${records.length} students on ${date}!` })
    else setMsg({ type: 'danger', text: 'Failed to save attendance' })
    setSaving(false)
  }

  async function loadReport() {
    const r = await fetch(`/api/school/attendance?class_id=${selClass}&month=${date.slice(0, 7)}`)
    const d = await r.json()
    setReport(d.report || [])
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length
  const leaveCount = Object.values(attendance).filter(v => v === 'leave').length

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📋 Attendance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Mark and track student attendance</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {([['mark','📝 Mark Attendance'],['daily','📋 Daily Report'],['monthly','📅 Monthly Report'],['sessional','📊 Sessional'],['history','💬 SMS History']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* Class/Section/Date selectors */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={selClass} onChange={e => { setSelClass(e.target.value); setSelSection('') }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={selSection} onChange={e => setSelSection(e.target.value)}>
              <option value="">All Sections</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {tab === 'monthly' && <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={loadReport}>📊 Load Report</button>}
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'mark' && (
        <>
          {!selClass ? (
            <div className="empty-state card"><div className="empty-icon">📋</div><p>Select a class to mark attendance</p></div>
          ) : loading ? (
            <div className="empty-state card"><div className="empty-icon">⏳</div><p>Loading students...</p></div>
          ) : students.length === 0 ? (
            <div className="empty-state card"><div className="empty-icon">🎓</div><p>No students in this class</p></div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[['Present', presentCount, '#10b981'],['Absent', absentCount, '#ef4444'],['Leave', leaveCount, '#f59e0b']].map(([l, v, c]) => (
                  <div key={String(l)} style={{ background: `${c}15`, border: `1px solid ${c}30`, borderRadius: '12px', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: String(c) }}>{v}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l}</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => { const all: Record<string, 'present'> = {}; students.forEach(s => { all[s.id] = 'present' }); setAttendance(all) }} className="btn btn-success btn-sm">✅ All Present</button>
                  <button onClick={() => { const all: Record<string, 'absent'> = {}; students.forEach(s => { all[s.id] = 'absent' }); setAttendance(all) }} className="btn btn-danger btn-sm">❌ All Absent</button>
                </div>
              </div>

              <div className="card" style={{ padding: 0, marginBottom: '1rem' }}>
                <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                  <table>
                    <thead><tr><th>#</th><th>Student Name</th><th>Section</th><th>Status</th></tr></thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.section_name || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {(['present', 'absent', 'leave'] as const).map(st => (
                                <button key={st} onClick={() => setAttendance(a => ({ ...a, [s.id]: st }))}
                                  className={`btn btn-sm ${attendance[s.id] === st ? (st === 'present' ? 'btn-success' : st === 'absent' ? 'btn-danger' : 'btn-warning') : 'btn-secondary'}`}>
                                  {st === 'present' ? '✅' : st === 'absent' ? '❌' : '🏠'} {st.charAt(0).toUpperCase() + st.slice(1)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button onClick={saveAttendance} className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Attendance'}
              </button>
            </>
          )}
        </>
      )}

      {tab === 'daily' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📋 Daily Absent Students — {date}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Select a class and date to view absent students. Data loads from saved attendance records.</p>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📅 Monthly Attendance Report</h3>
          {report.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>Select a class and click Load Report</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Present</th><th>Absent</th><th>Leave</th><th>Attendance %</th></tr></thead>
                <tbody>
                  {report.map((r, i) => {
                    const total = r.present + r.absent + r.leave
                    const pct = total ? Math.round((r.present / total) * 100) : 0
                    return (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td><span className="badge badge-success">{r.present}</span></td>
                        <td><span className="badge badge-danger">{r.absent}</span></td>
                        <td><span className="badge badge-warning">{r.leave}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '80px' }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sessional' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📊 Sessional Report</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Full session attendance summary per student will appear here once data is collected.</p>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>💬 Attendance SMS History</h3>
          <div className="empty-state"><div className="empty-icon">📱</div><p>No SMS sent yet. Configure SMS settings to enable attendance notifications.</p></div>
        </div>
      )}
    </div>
  )
}
