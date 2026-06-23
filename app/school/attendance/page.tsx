'use client'
import { useState, useEffect, useCallback } from 'react'

const getLocalDateString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface Student { id: string; name: string; class_name: string; section_name: string }
interface ClassItem { id: string; name: string }
interface SectionItem { id: string; name: string; class_id: string }

interface DailyRecord {
  id: string
  name: string
  roll_no: string
  section_id: string | null
  section_name: string
  status: 'present' | 'absent' | 'leave' | 'unmarked'
}

interface MonthlyStudentStats {
  id: string
  name: string
  roll_no: string
  section_id: string | null
  section_name: string
  present: number
  absent: number
  leave: number
  pct: number
}

interface SessionalStudentStats {
  id: string
  name: string
  roll_no: string
  section_id: string | null
  section_name: string
  total: number
  present: number
  absent: number
  leave: number
  pct: number
}

type Tab = 'mark' | 'daily' | 'monthly' | 'sessional'

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('mark')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selClass, setSelClass] = useState('')
  const [selSection, setSelSection] = useState('')
  const [date, setDate] = useState(getLocalDateString())
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'leave'>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<{ date: string; present: number; absent: number; leave: number }[]>([])

  // Daily Report States
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([])
  const [dailySearch, setDailySearch] = useState('')
  const [dailyLoading, setDailyLoading] = useState(false)

  // Monthly Report States
  const [monthlyStudentStats, setMonthlyStudentStats] = useState<MonthlyStudentStats[]>([])
  const [monthlySearch, setMonthlySearch] = useState('')
  const [activeMonthlyTab, setActiveMonthlyTab] = useState<'students' | 'trends'>('students')

  // Sessional Report States
  const [sessionalStudentStats, setSessionalStudentStats] = useState<SessionalStudentStats[]>([])
  const [sessionalSearch, setSessionalSearch] = useState('')
  const [sessionalLoading, setSessionalLoading] = useState(false)

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
    try {
      const params = new URLSearchParams({
        class_id: selClass,
        ...(selSection ? { section_id: selSection } : {}),
        _t: Date.now().toString()
      })
      const r = await fetch(`/api/school/students?${params}`, { cache: 'no-store' })
      const d = await r.json()
      const list = (d.students || []).filter((s: Student & { status?: string }) => s.status !== 'discharged' || !s.status)
      setStudents(list)

      // Fetch existing daily attendance for the selected date to pre-fill the form
      const dailyParams = new URLSearchParams({
        type: 'daily',
        class_id: selClass,
        ...(selSection ? { section_id: selSection } : {}),
        date,
        _t: Date.now().toString()
      })
      const dailyRes = await fetch(`/api/school/attendance?${dailyParams}`, { cache: 'no-store' })
      const dailyData = await dailyRes.json()
      const dailyList = dailyData.report || []

      const init: Record<string, 'present' | 'absent' | 'leave'> = {}
      list.forEach((s: Student) => {
        const saved = dailyList.find((item: DailyRecord) => item.id === s.id)
        if (saved && (saved.status === 'present' || saved.status === 'absent' || saved.status === 'leave')) {
          init[s.id] = saved.status
        } else {
          init[s.id] = 'present'
        }
      })
      setAttendance(init)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selClass, selSection, date])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStudents() }, [loadStudents])

  const loadReport = useCallback(async () => {
    if (!selClass) return
    setLoading(true)
    const params = new URLSearchParams({
      type: 'monthly',
      class_id: selClass,
      ...(selSection ? { section_id: selSection } : {}),
      month: date.slice(0, 7),
      _t: Date.now().toString()
    })
    try {
      const r = await fetch(`/api/school/attendance?${params}`, { cache: 'no-store' })
      const d = await r.json()
      setReport(d.report || [])
      setMonthlyStudentStats(d.studentsReport || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selClass, selSection, date])

  useEffect(() => {
    if (tab === 'monthly') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadReport()
    }
  }, [tab, loadReport])

  const loadDailyReport = useCallback(async () => {
    if (!selClass) return
    setDailyLoading(true)
    const params = new URLSearchParams({
      type: 'daily',
      class_id: selClass,
      ...(selSection ? { section_id: selSection } : {}),
      date,
      _t: Date.now().toString()
    })
    try {
      const r = await fetch(`/api/school/attendance?${params}`, { cache: 'no-store' })
      const d = await r.json()
      setDailyRecords(d.report || [])
    } catch (err) {
      console.error(err)
    } finally {
      setDailyLoading(false)
    }
  }, [selClass, selSection, date])

  useEffect(() => {
    if (tab === 'daily') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDailyReport()
    }
  }, [tab, loadDailyReport])

  const loadSessionalReport = useCallback(async () => {
    if (!selClass) return
    setSessionalLoading(true)
    const params = new URLSearchParams({
      type: 'sessional',
      class_id: selClass,
      ...(selSection ? { section_id: selSection } : {}),
      _t: Date.now().toString()
    })
    try {
      const r = await fetch(`/api/school/attendance?${params}`, { cache: 'no-store' })
      const d = await r.json()
      setSessionalStudentStats(d.report || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSessionalLoading(false)
    }
  }, [selClass, selSection])

  useEffect(() => {
    if (tab === 'sessional') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSessionalReport()
    }
  }, [tab, loadSessionalReport])

  async function saveAttendance() {
    setSaving(true); setMsg(null)
    const records = students.map(s => ({
      student_id: s.id,
      status: attendance[s.id] || 'present',
      date
    }))
    const r = await fetch('/api/school/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }) })
    if (r.ok) {
      setMsg({ type: 'success', text: `Attendance saved for ${records.length} students on ${date}!` })
      loadDailyReport()
      loadReport()
      loadSessionalReport()
    } else {
      setMsg({ type: 'danger', text: 'Failed to save attendance' })
    }
    setSaving(false)
  }

  const filteredDailyRecords = dailyRecords.filter(r => 
    r.name.toLowerCase().includes(dailySearch.toLowerCase()) ||
    (r.roll_no && r.roll_no.toString().toLowerCase().includes(dailySearch.toLowerCase()))
  )

  const filteredMonthlyStudents = monthlyStudentStats.filter(r => 
    r.name.toLowerCase().includes(monthlySearch.toLowerCase()) ||
    (r.roll_no && r.roll_no.toString().toLowerCase().includes(monthlySearch.toLowerCase()))
  )

  const filteredSessionalStudents = sessionalStudentStats.filter(r => 
    r.name.toLowerCase().includes(sessionalSearch.toLowerCase()) ||
    (r.roll_no && r.roll_no.toString().toLowerCase().includes(sessionalSearch.toLowerCase()))
  )

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
        {([['mark','📝 Mark Attendance'],['daily','📋 Daily Report'],['monthly','📅 Monthly Report'],['sessional','📊 Sessional']] as [Tab, string][]).map(([t, l]) => (
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>📋 Daily Attendance Report — {date}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>View student attendance details for the selected class and date.</p>
            </div>
            {selClass && (
              <button className="btn btn-secondary btn-sm" onClick={loadDailyReport} disabled={dailyLoading}>
                🔄 Refresh
              </button>
            )}
          </div>

          {!selClass ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>Select a class to view the daily report</p></div>
          ) : dailyLoading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><p>Loading records...</p></div>
          ) : dailyRecords.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🎓</div><p>No student records or attendance data found for this date.</p></div>
          ) : (
            <>
              {/* Daily Status Summary */}
              {(() => {
                const total = dailyRecords.length
                const present = dailyRecords.filter(r => r.status === 'present').length
                const absent = dailyRecords.filter(r => r.status === 'absent').length
                const leave = dailyRecords.filter(r => r.status === 'leave').length
                const unmarked = dailyRecords.filter(r => r.status === 'unmarked').length

                return (
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {[['Total', total, 'var(--text-secondary)', 'var(--border-color)'],
                      ['Present', present, '#10b981', '#10b98115'],
                      ['Absent', absent, '#ef4444', '#ef444415'],
                      ['Leave', leave, '#f59e0b', '#f59e0b15'],
                      ['Unmarked', unmarked, '#6b7280', 'var(--border-color)']
                    ].map(([l, v, c, bg]) => (
                      <div key={String(l)} style={{ background: String(bg), border: `1px solid ${String(c)}30`, borderRadius: '12px', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: String(c) }}>{v}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Search Bar */}
              <div style={{ marginBottom: '1rem', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by name or roll no..."
                  className="form-input"
                  value={dailySearch}
                  onChange={e => setDailySearch(e.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Section</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyRecords.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{r.roll_no || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{r.section_name || '—'}</td>
                        <td>
                          {r.status === 'present' ? (
                            <span className="badge badge-success">✅ Present</span>
                          ) : r.status === 'absent' ? (
                            <span className="badge badge-danger">❌ Absent</span>
                          ) : r.status === 'leave' ? (
                            <span className="badge badge-warning">🏠 Leave</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.2)' }}>❓ Unmarked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredDailyRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No students matched your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>📅 Monthly Attendance Report</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>View student summary and daily trends for {date.slice(0, 7)}.</p>
            </div>
            {monthlyStudentStats.length > 0 && (
              <div style={{ display: 'flex', background: 'var(--border-color)', padding: '0.2rem', borderRadius: '8px', gap: '0.2rem' }}>
                <button
                  onClick={() => setActiveMonthlyTab('students')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeMonthlyTab === 'students' ? 'var(--bg-surface)' : 'transparent',
                    color: activeMonthlyTab === 'students' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  👤 Student Summary
                </button>
                <button
                  onClick={() => setActiveMonthlyTab('trends')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeMonthlyTab === 'trends' ? 'var(--bg-surface)' : 'transparent',
                    color: activeMonthlyTab === 'trends' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📈 Daily Trends
                </button>
              </div>
            )}
          </div>

          {monthlyStudentStats.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>No student records found. Select a class and click Load Report.</p></div>
          ) : activeMonthlyTab === 'students' ? (
            <>
              {/* Search Bar */}
              <div style={{ marginBottom: '1rem', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by name or roll no..."
                  className="form-input"
                  value={monthlySearch}
                  onChange={e => setMonthlySearch(e.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Section</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonthlyStudents.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{r.roll_no || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{r.section_name || '—'}</td>
                        <td><span className="badge badge-success">{r.present}</span></td>
                        <td><span className="badge badge-danger">{r.absent}</span></td>
                        <td><span className="badge badge-warning">{r.leave}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '80px' }}>
                              <div className="progress-fill" style={{ width: `${r.pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMonthlyStudents.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No students matched your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : report.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}><div className="empty-icon">📈</div><p>No daily trends available for this month.</p></div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>📊 Sessional Attendance Report</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overall attendance summary for each student in the selected class.</p>
            </div>
            {selClass && (
              <button className="btn btn-secondary btn-sm" onClick={loadSessionalReport} disabled={sessionalLoading}>
                🔄 Refresh
              </button>
            )}
          </div>

          {!selClass ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>Select a class to view the sessional report</p></div>
          ) : sessionalLoading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><p>Loading records...</p></div>
          ) : sessionalStudentStats.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🎓</div><p>No student records or attendance data found for this session.</p></div>
          ) : (
            <>
              {/* Search Bar */}
              <div style={{ marginBottom: '1rem', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by name or roll no..."
                  className="form-input"
                  value={sessionalSearch}
                  onChange={e => setSessionalSearch(e.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Section</th>
                      <th>Total Days</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessionalStudents.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{r.roll_no || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{r.section_name || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.total}</td>
                        <td><span className="badge badge-success">{r.present}</span></td>
                        <td><span className="badge badge-danger">{r.absent}</span></td>
                        <td><span className="badge badge-warning">{r.leave}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '80px' }}>
                              <div className="progress-fill" style={{ width: `${r.pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSessionalStudents.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No students matched your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}


    </div>
  )
}
