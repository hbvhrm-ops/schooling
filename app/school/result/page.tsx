'use client'
import { useState, useEffect, useCallback } from 'react'

interface ExamType { id: string; name: string }
interface ClassItem { id: string; name: string }
interface Student {
  id: string
  name: string
  father_name?: string
  roll_no?: string
  dob?: string
  photo_url?: string
  section_name?: string
  section_id?: string
}
interface Subject { id: string; name: string; class_id?: string; class_name?: string }
interface ScheduleItem {
  subject_id: string
  subject_name: string
  date: string
  time: string
}

type Step = 1 | 2 | 3

// Helper: Convert numbers to words (e.g. 68 to "Sixty-Eight", 544 to "Five Hundred and Forty-Four")
function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const convertLessThanOneThousand = (n: number): string => {
    if (n < 20) return ones[n]
    const digit = n % 10
    if (n < 100) return tens[Math.floor(n / 10)] + (digit !== 0 ? '-' + ones[digit] : '')
    
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    return ones[hundred] + ' Hundred' + (rest !== 0 ? ' and ' + convertLessThanOneThousand(rest) : '')
  }
  
  const convert = (n: number): string => {
    if (n < 1000) return convertLessThanOneThousand(n)
    const thousand = Math.floor(n / 1000)
    const rest = n % 1000
    return convert(thousand) + ' Thousand' + (rest !== 0 ? ' ' + convert(rest) : '')
  }

  const parts = String(num).split('.')
  const integerPart = Number(parts[0])
  let word = convert(integerPart)
  
  if (parts.length > 1) {
    const decimalPart = parts[1]
    const decimalWords = decimalPart.split('').map(d => ones[Number(d)]).join(' ')
    word += ' Point ' + decimalWords
  }
  
  return word
}


  
function formatDateNumeric(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function ResultPage() {
  const [step, setStep] = useState<Step>(1)
  const [tab, setTab] = useState('exam-types')
  
  // Data lists
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  
  // Selections
  const [newExamType, setNewExamType] = useState('')
  const [selExam, setSelExam] = useState('')
  const [selClass, setSelClass] = useState('')
  const [selSubject, setSelSubject] = useState('')
  const [selStudent, setSelStudent] = useState('')
  
  // Marks input state
  const [marks, setMarks] = useState<Record<string, { obtained: string; total: string }>>({})
  const [defaultTotal, setDefaultTotal] = useState('100')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  
  // Schedules state
  const [schedulesList, setSchedulesList] = useState<ScheduleItem[]>([])
  
  // DMC Data state
  const [dmcResults, setDmcResults] = useState<any[]>([])
  const [classRankings, setClassRankings] = useState<Record<string, { rank: number; total: number }>>({})
  const [sectionRankings, setSectionRankings] = useState<Record<string, { rank: number; total: number }>>({})
  
  // DMC Header Customization
  const [customSchoolName, setCustomSchoolName] = useState('Alfalah English School')
  const [customLocation, setCustomLocation] = useState('Amankot Swat')
  const [customPhone, setCustomPhone] = useState('0948-723117 - 03339037411')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [customExamYear, setCustomExamYear] = useState('2026')

  // Print type
  const [printType, setPrintType] = useState<'dmc' | 'schedule' | 'roll-no-slip' | null>(null)

  const [editingExamTypeId, setEditingExamTypeId] = useState<string | null>(null)
  const [editingExamTypeName, setEditingExamTypeName] = useState<string>('')

  // Load basics
  useEffect(() => {
    fetch('/api/school/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
    fetch('/api/school/results').then(r => r.json()).then(d => setExamTypes(d.examTypes || []))
    fetch('/api/school/subjects').then(r => r.json()).then(d => setSubjects(d.subjects || []))
    
    // Pre-fill school name from dashboard/session
    fetch('/api/school/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.schoolName) {
          setCustomSchoolName(d.schoolName)
        }
      })
      .catch(() => {})

    // Automatically load logo from certificate templates
    const loadSchoolLogo = async () => {
      let fallbackLogo = ''
      const types = ['slc', 'birth', 'character', 'sports', 'top_positions']
      for (const type of types) {
        try {
          const r = await fetch(`/api/school/certificate-templates?type=${type}`)
          if (r.ok) {
            const d = await r.json()
            if (d.schoolLogo) {
              fallbackLogo = d.schoolLogo
            }
            if (d.template?.logo_url) {
              setCustomLogoUrl(d.template.logo_url)
              return // Use first logo found
            }
          }
        } catch {}
      }
      if (fallbackLogo) {
        setCustomLogoUrl(fallbackLogo)
      }
    }
    loadSchoolLogo()
  }, [])

  // Listen to afterprint event to reset printing state
  useEffect(() => {
    const handleAfterPrint = () => setPrintType(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  // Load students when class changes
  const loadStudents = useCallback(async () => {
    if (!selClass) return
    setLoading(true)
    const r = await fetch(`/api/school/students?class_id=${selClass}`)
    const d = await r.json()
    setStudents(d.students || [])
    setLoading(false)
  }, [selClass])
  
  useEffect(() => { loadStudents() }, [loadStudents])

  // Load subject-specific marks
  const loadResults = useCallback(async () => {
    if (!selClass || !selExam || !selSubject) return
    setLoading(true)
    try {
      const res = await fetch(`/api/school/results?class_id=${selClass}&exam_type_id=${selExam}&subject_id=${selSubject}`)
      const data = await res.json()
      if (res.ok && data.results) {
        const newMarks: Record<string, { obtained: string; total: string }> = {}
        data.results.forEach((r: any) => {
          newMarks[r.student_id] = {
            obtained: String(r.marks_obtained !== null && r.marks_obtained !== undefined ? r.marks_obtained : ''),
            total: String(r.total_marks || '100')
          }
        })
        setMarks(newMarks)
      } else {
        setMarks({})
      }
    } catch (err) {
      console.error(err)
      setMarks({})
    } finally {
      setLoading(false)
    }
  }, [selClass, selExam, selSubject])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  // Load schedules for selected class & exam
  const loadSchedules = useCallback(async () => {
    if (!selClass || !selExam) return
    setLoading(true)
    try {
      const res = await fetch(`/api/school/schedules?exam_type_id=${selExam}&class_id=${selClass}`)
      const data = await res.json()
      const saved = data.schedules || []
      
      const classSubs = subjects.filter(s => String(s.class_id) === String(selClass))
      const list = classSubs.map(s => {
        const sch = saved.find((x: any) => String(x.subject_id) === String(s.id))
        return {
          subject_id: s.id,
          subject_name: s.name,
          date: sch?.date || '',
          time: sch?.time || ''
        }
      })
      setSchedulesList(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selClass, selExam, subjects])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  // Load single student results for DMC
  const loadDmcData = useCallback(async () => {
    if (!selStudent || !selExam) return
    setLoading(true)
    try {
      const res = await fetch(`/api/school/results?student_id=${selStudent}&exam_type_id=${selExam}`)
      const data = await res.json()
      setDmcResults(data.results || [])
    } catch (err) {
      console.error(err)
      setDmcResults([])
    } finally {
      setLoading(false)
    }
  }, [selStudent, selExam])

  useEffect(() => {
    loadDmcData()
  }, [loadDmcData])

  // Load class-wide ranking data for the selected exam
  const loadClassRankings = useCallback(async () => {
    if (!selClass || !selExam) return
    try {
      const res = await fetch(`/api/school/results?class_id=${selClass}&exam_type_id=${selExam}`)
      const data = await res.json()
      const allResults = data.results || []
      
      const studentTotals: Record<string, { obtained: number; total: number; section_id?: string }> = {}
      allResults.forEach((r: any) => {
        const sid = r.student_id
        if (!studentTotals[sid]) {
          studentTotals[sid] = { obtained: 0, total: 0, section_id: r.students?.section_id }
        }
        studentTotals[sid].obtained += Number(r.marks_obtained || 0)
        studentTotals[sid].total += Number(r.total_marks || 100)
      })
      
      const classSorted = Object.entries(studentTotals)
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.obtained - a.obtained)
        
      const classRanks: Record<string, { rank: number; total: number }> = {}
      classSorted.forEach((item, index) => {
        classRanks[item.id] = { rank: index + 1, total: classSorted.length }
      })
      setClassRankings(classRanks)

      const sectionGroups: Record<string, typeof classSorted> = {}
      classSorted.forEach(item => {
        const secId = item.section_id || 'no-section'
        if (!sectionGroups[secId]) sectionGroups[secId] = []
        sectionGroups[secId].push(item)
      })

      const secRanks: Record<string, { rank: number; total: number }> = {}
      Object.entries(sectionGroups).forEach(([secId, group]) => {
        group.sort((a, b) => b.obtained - a.obtained)
        group.forEach((item, index) => {
          secRanks[item.id] = { rank: index + 1, total: group.length }
        })
      })
      setSectionRankings(secRanks)
    } catch (err) {
      console.error(err)
    }
  }, [selClass, selExam])

  useEffect(() => {
    loadClassRankings()
  }, [loadClassRankings])

  // Prefill hook removed

  function getGradeForPct(pct: number) {
    if (pct >= 90) return 'A+'
    if (pct >= 80) return 'A'
    if (pct >= 70) return 'B+'
    if (pct >= 60) return 'B'
    if (pct >= 50) return 'C'
    if (pct >= 40) return 'D'
    return 'F'
  }

  function getRemarksForGrade(grade: string) {
    if (grade === 'A+') return 'Outstanding'
    if (grade === 'A') return 'Excellent'
    if (grade === 'B+') return 'Very Good'
    if (grade === 'B') return 'Good'
    if (grade === 'C') return 'Satisfactory'
    if (grade === 'D') return 'Fair'
    return 'Needs Improvement'
  }

  function handleDefaultTotalChange(val: string) {
    setDefaultTotal(val)
    setMarks(prev => {
      const updated = { ...prev }
      students.forEach(s => {
        updated[s.id] = {
          obtained: prev[s.id]?.obtained || '',
          total: val
        }
      })
      return updated
    })
  }

  async function addExamType() {
    if (!newExamType.trim()) return
    const r = await fetch('/api/school/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'exam_type', name: newExamType }) })
    if (r.ok) {
      const d = await r.json()
      setExamTypes(et => [...et, d.examType])
      setNewExamType('')
      setMsg({ type: 'success', text: 'Exam type added successfully!' })
    }
  }

  async function updateExamType(id: string, name: string) {
    if (!name.trim()) return
    const r = await fetch('/api/school/results', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name })
    })
    if (r.ok) {
      setExamTypes(et => et.map(item => item.id === id ? { ...item, name } : item))
      setEditingExamTypeId(null)
      setMsg({ type: 'success', text: 'Exam type updated successfully!' })
    } else {
      const data = await r.json()
      setMsg({ type: 'danger', text: data.error || 'Failed to update exam type' })
    }
  }

  async function deleteExamType(id: string) {
    if (!window.confirm('Are you sure you want to delete this exam type? This will also permanently delete all scheduling and results associated with it!')) return
    const r = await fetch('/api/school/results', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (r.ok) {
      setExamTypes(et => et.filter(item => item.id !== id))
      if (selExam === id) setSelExam('')
      setMsg({ type: 'success', text: 'Exam type deleted successfully!' })
    } else {
      const data = await r.json()
      setMsg({ type: 'danger', text: data.error || 'Failed to delete exam type' })
    }
  }

  async function saveResults() {
    if (!selClass || !selExam || !selSubject) {
      setMsg({ type: 'danger', text: 'Please select class, exam and subject first' })
      return
    }
    const entries = Object.entries(marks)
      .filter(([_, m]) => m.obtained !== '')
      .map(([student_id, m]) => ({
        student_id,
        exam_type_id: selExam,
        subject_id: selSubject,
        marks_obtained: Number(m.obtained),
        total_marks: Number(m.total || '100')
      }))

    const r = await fetch('/api/school/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'results',
        exam_type_id: selExam,
        class_id: selClass,
        subject_id: selSubject,
        entries
      })
    })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Results saved successfully!' })
      loadClassRankings() // refresh rank data
    } else {
      setMsg({ type: 'danger', text: 'Failed to save results' })
    }
  }

  async function saveSchedules() {
    if (!selClass || !selExam) {
      setMsg({ type: 'danger', text: 'Please select class and exam' })
      return
    }
    const r = await fetch('/api/school/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_type_id: selExam,
        class_id: selClass,
        schedules: schedulesList
      })
    })
    if (r.ok) {
      setMsg({ type: 'success', text: 'Schedule saved successfully!' })
    } else {
      setMsg({ type: 'danger', text: 'Failed to save schedule' })
    }
  }

  function printSchedule() {
    setPrintType('schedule')
    setTimeout(() => {
      window.print()
    }, 150)
  }

  function printDmc() {
    setPrintType('dmc')
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Construct active print values
  const activeStudent = students.find(s => s.id === selStudent)
  const activeExamName = examTypes.find(e => e.id === selExam)?.name || 'Final Term Exam'
  const activeClassName = classes.find(c => c.id === selClass)?.name || ''
  const classSubs = subjects.filter(s => String(s.class_id) === String(selClass))

  let activeTotalMax = 0
  let activeTotalObt = 0
  let activeFailedCount = 0

  const activeDmcRows = classSubs.map(sub => {
    const entry = dmcResults.find(r => String(r.subject_id) === String(sub.id))
    const max = Number(entry?.total_marks || 100)
    const obtStr = entry?.marks_obtained !== undefined ? String(entry.marks_obtained) : ''
    const obt = Number(obtStr || 0)
    
    if (obtStr !== '') {
      activeTotalMax += max
      activeTotalObt += obt
      if ((obt / max) * 100 < 40) {
        activeFailedCount++
      }
    }
    return {
      id: sub.id,
      name: sub.name,
      max,
      obtStr,
      obt,
      words: obtStr !== '' ? numberToWords(obt) : '—'
    }
  })

  const activeTotalPct = activeTotalMax > 0 ? Math.round((activeTotalObt / activeTotalMax) * 10000) / 100 : 0
  const activeGrade = activeTotalMax > 0 ? getGradeForPct(activeTotalPct) : '—'
  const activeRemarks = activeTotalMax > 0 ? getRemarksForGrade(activeGrade) : '—'
  const activePassed = dmcResults.length > 0 ? (activeFailedCount < 2) : null
  const activeTotalObtWords = activeTotalObt > 0 ? numberToWords(activeTotalObt) : '—'

  const activeClassRankInfo = activeStudent ? classRankings[activeStudent.id] : null
  const activeSecRankInfo = activeStudent ? sectionRankings[activeStudent.id] : null
  const activeClassRankStr = activeClassRankInfo ? `${getOrdinal(activeClassRankInfo.rank)} Out of ${activeClassRankInfo.total}` : '—'
  const activeSecRankStr = activeSecRankInfo ? `${getOrdinal(activeSecRankInfo.rank)} Out of ${activeSecRankInfo.total}` : '—'

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📝 Result Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage exams, schedules and Detailed Marks Certificates</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {[
          ['exam-types', '📋 Exam Types'],
          ['schedule', '📅 Schedule'],
          ['add-result', '✏️ Add Result'],
          ['dmc', '📄 DMC'],
          ['roll-no-slip', '🎫 Roll No Slip']
        ].map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {/* Exam Types Tab */}
      {tab === 'exam-types' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📋 Step 1: Add Exam Types</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input className="form-input" placeholder="e.g. Mid-Term, Final Exam, Unit Test..." value={newExamType} onChange={e => setNewExamType(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExamType()} />
            <button onClick={addExamType} className="btn btn-primary">➕ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {examTypes.map(et => {
              const isEditing = editingExamTypeId === et.id
              return (
                <div key={et.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input 
                        className="form-input form-input-sm" 
                        style={{ margin: 0, flex: 1 }} 
                        value={editingExamTypeName} 
                        onChange={e => setEditingExamTypeName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && updateExamType(et.id, editingExamTypeName)}
                      />
                      <button className="btn btn-success btn-sm" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateExamType(et.id, editingExamTypeName)}>💾</button>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setEditingExamTypeId(null)}>❌</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 600 }}>{et.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge badge-primary">Exam</span>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} 
                          onClick={() => {
                            setEditingExamTypeId(et.id)
                            setEditingExamTypeName(et.name)
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} 
                          onClick={() => deleteExamType(et.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {examTypes.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><p>No exam types yet. Add your first one above.</p></div>}
          </div>
        </div>
      )}

      {/* Exam Schedule Tab */}
      {tab === 'schedule' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📅 Step 2: Add Exam Schedule</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Set date and time for each subject exam per class</p>
          <div className="grid-2" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Select Exam *</label>
              <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}>
                <option value="">Choose exam type</option>
                {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Class *</label>
              <select className="form-select" value={selClass} onChange={e => setSelClass(e.target.value)}>
                <option value="">Choose class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {!selClass || !selExam ? (
            <div className="empty-state"><div className="empty-icon">📅</div><p>Select exam and class to manage scheduling</p></div>
          ) : loading ? (
            <div className="empty-state"><p>Loading schedules...</p></div>
          ) : schedulesList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>No subjects found for this class. Add subjects in the subjects settings first.</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Class: {classes.find(c => c.id === selClass)?.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {schedulesList.map((sch, i) => (
                  <div key={sch.subject_id} className="grid-3" style={{ alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600 }}>{sch.subject_name}</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <input className="form-input" type="date" value={sch.date} onChange={e => {
                        const s = [...schedulesList]
                        s[i].date = e.target.value
                        setSchedulesList(s)
                      }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <input className="form-input" type="time" value={sch.time} onChange={e => {
                        const s = [...schedulesList]
                        s[i].time = e.target.value
                        setSchedulesList(s)
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={saveSchedules} className="btn btn-primary">💾 Save Schedule</button>
                <button onClick={printSchedule} className="btn btn-secondary">🖨️ Print Schedule</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Result Tab */}
      {tab === 'add-result' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Step 3: Add Results</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-select" style={{ width: '200px' }} value={selExam} onChange={e => setSelExam(e.target.value)}>
              <option value="">Select Exam</option>
              {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select className="form-select" style={{ width: '180px' }} value={selClass} onChange={e => {
              setSelClass(e.target.value)
              setSelSubject('')
            }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selClass && (
              <select className="form-select" style={{ width: '180px' }} value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {subjects.filter(s => String(s.class_id) === String(selClass)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {selClass && selSubject && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Marks:</span>
                <input 
                  className="form-input" 
                  style={{ width: '100px' }} 
                  type="number" 
                  placeholder="100" 
                  value={defaultTotal} 
                  onChange={e => handleDefaultTotalChange(e.target.value)} 
                />
              </div>
            )}
          </div>
          {!selClass || !selExam || !selSubject ? (
            <div className="empty-state"><div className="empty-icon">📝</div><p>Select exam, class, and subject to enter marks</p></div>
          ) : loading ? (
            <div className="empty-state"><p>Loading students...</p></div>
          ) : (
            <>
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead><tr><th>#</th><th>Student Name</th><th>Marks Obtained</th><th>Total Marks</th><th>%</th><th>Grade</th></tr></thead>
                  <tbody>
                    {students.map((s, i) => {
                      const m = marks[s.id] || { obtained: '', total: defaultTotal }
                      const pct = m.obtained && m.total ? Math.round((Number(m.obtained) / Number(m.total)) * 100) : 0
                      return (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td>
                            <input 
                              className="form-input" 
                              style={{ width: '100px' }} 
                              type="number" 
                              placeholder="0" 
                              value={m.obtained} 
                              onChange={e => setMarks(mk => ({ ...mk, [s.id]: { ...mk[s.id], obtained: e.target.value, total: mk[s.id]?.total || defaultTotal } }))} 
                            />
                          </td>
                          <td>
                            <input 
                              className="form-input" 
                              style={{ width: '100px' }} 
                              type="number" 
                              placeholder="100" 
                              value={m.total} 
                              onChange={e => setMarks(mk => ({ ...mk, [s.id]: { ...mk[s.id], total: e.target.value, obtained: mk[s.id]?.obtained || '' } }))} 
                            />
                          </td>
                          <td>
                            {m.obtained ? (
                              <span className={`badge ${pct >= 40 ? 'badge-success' : 'badge-danger'}`}>{pct}%</span>
                            ) : '—'}
                          </td>
                          <td style={{ fontWeight: 'bold' }}>
                            {m.obtained ? (
                              <span className="badge badge-primary">{getGradeForPct(pct)}</span>
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

      {/* DMC Tab */}
      {tab === 'dmc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
          
          {/* Controls Panel */}
          <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, margin: 0 }}>📄 Select Student</h3>
            
            <div className="form-group">
              <label className="form-label">Exam *</label>
              <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}>
                <option value="">Select Exam</option>
                {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Class *</label>
              <select className="form-select" value={selClass} onChange={e => {
                setSelClass(e.target.value)
                setSelStudent('')
              }}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Student *</label>
              <select className="form-select" value={selStudent} onChange={e => setSelStudent(e.target.value)}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <hr className="divider" style={{ margin: 0 }} />
            
            <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>🛠️ Customize Header Details</h4>
            
            <div className="form-group">
              <label className="form-label">School Name</label>
              <input className="form-input" value={customSchoolName} onChange={e => setCustomSchoolName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Location / Address</label>
              <input className="form-input" value={customLocation} onChange={e => setCustomLocation(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Numbers</label>
              <input className="form-input" value={customPhone} onChange={e => setCustomPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Exam Year</label>
              <input className="form-input" value={customExamYear} onChange={e => setCustomExamYear(e.target.value)} />
            </div>

            <button 
              onClick={printDmc} 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem' }} 
              disabled={!selExam || !selClass || !selStudent}
            >
              🖨️ Print DMC
            </button>
          </div>

          {/* Certificate Live Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!selExam || !selClass || !selStudent ? (
              <div className="card empty-state"><div className="empty-icon">📄</div><p>Select exam, class, and student on the left to preview certificate</p></div>
            ) : loading ? (
              <div className="card empty-state"><p>Loading certificate details...</p></div>
            ) : (() => {
              if (!activeStudent) return <div className="card empty-state"><p>Student not found</p></div>

              return (
                <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '740px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#1e293b'
                  }}>
                    {/* Header Banner */}
                    <div style={{
                      background: '#006ac3',
                      color: 'white',
                      borderTopLeftRadius: '11px',
                      borderTopRightRadius: '11px',
                      padding: '1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 80px',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {customLogoUrl ? (
                          <img src={customLogoUrl} alt="Logo" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '56px', height: '56px' }} />
                        )}
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{customSchoolName}</h2>
                        <div style={{ fontSize: '0.75rem', opacity: 0.95, marginTop: '2px', fontWeight: 500 }}>{customLocation}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.9, marginTop: '1px' }}>Ph: {customPhone}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, textDecoration: 'underline', marginTop: '6px', textTransform: 'uppercase' }}>Detailed Marks Certificate</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{activeExamName} {customExamYear}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '6px',
                          border: '2px solid white',
                          background: '#e2e8f0',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}>
                          {activeStudent.photo_url ? (
                            <img src={activeStudent.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            '👤'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Student Info Box */}
                    <div style={{ padding: '1rem', borderBottom: '1.5px solid #cbd5e1' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ height: '32px' }}>
                            <td style={{ width: '15%', fontSize: '0.75rem', color: '#475569' }}>Student&apos;s Name:</td>
                            <td style={{ width: '35%', paddingRight: '1rem' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeStudent.name}</span>
                            </td>
                            <td style={{ width: '18%', fontSize: '0.75rem', color: '#475569' }}>Roll No:</td>
                            <td style={{ width: '32%' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeStudent.roll_no || '—'}</span>
                            </td>
                          </tr>
                          <tr style={{ height: '32px' }}>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Father&apos;s Name:</td>
                            <td style={{ paddingRight: '1rem' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeStudent.father_name || '—'}</span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Section:</td>
                            <td>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeStudent.section_name || '—'}</span>
                            </td>
                          </tr>
                          <tr style={{ height: '32px' }}>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Class:</td>
                            <td style={{ paddingRight: '1rem' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeClassName}</span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Date Of Birth:</td>
                            <td>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{activeStudent.dob ? formatDateNumeric(activeStudent.dob) : '—'}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Table Section */}
                    <div style={{ padding: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '6px 8px', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left', width: '35%' }}>Subjects</th>
                            <th style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '6px 8px', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center', width: '20%' }}>Maximum Marks</th>
                            <th style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '6px 8px', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center', width: '45%' }} colSpan={2}>Obtained Marks</th>
                          </tr>
                          <tr style={{ backgroundColor: '#e2e8f0' }}>
                            <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                            <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold' }}>Total</th>
                            <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold', width: '15%' }}>Total</th>
                            <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold', width: '30%' }}>In Words</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeDmcRows.map(r => (
                            <tr key={r.id}>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', fontWeight: 500 }}>{r.name}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'center' }}>{r.max}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>{r.obtStr !== '' ? r.obt : '—'}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>{r.words}</td>
                            </tr>
                          ))}
                          {activeDmcRows.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No subjects added.</td></tr>
                          )}
                          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'right', textTransform: 'uppercase' }}>Total:</td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{activeTotalMax}</span>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{activeTotalObt}</span>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', color: '#1e3a8a' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{activeTotalObtWords}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Performance Grid */}
                    <div style={{ padding: '0 1rem 1rem' }}>
                      <table style={{ width: '100%', fontSize: '0.7rem', textAlign: 'center', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '2px 4px', color: '#64748b' }}>Class Position</td>
                            <td style={{ padding: '2px 4px', color: '#64748b' }}>Section Position</td>
                            <td style={{ padding: '2px 4px', color: '#64748b' }}>%age</td>
                            <td style={{ padding: '2px 4px', color: '#64748b' }}>Grade</td>
                            <td style={{ padding: '2px 4px', color: '#64748b' }}>Remarks</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{activeClassRankStr}</span></td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{activeSecRankStr}</span></td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{activeTotalPct}%</span></td>
                            <td style={{ padding: '2px 4px' }}>
                              <span style={{ background: '#10b981', color: 'white', padding: '1px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>{activeGrade}</span>
                            </td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{activeRemarks}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Passed Badge */}
                    {activePassed !== null && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                        <div style={{
                          background: activePassed ? '#10b981' : '#ef4444',
                          color: 'white',
                          padding: '6px 20px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                          {activePassed ? '✓ PASSED' : '✗ FAILED'}
                        </div>
                      </div>
                    )}

                    {/* Bar Chart Visual */}
                    {classSubs.length > 0 && activeTotalMax > 0 && (
                      <div style={{ padding: '0.75rem 2rem', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', maxWidth: '580px', margin: '0 auto', paddingBottom: '4px' }}>
                          {classSubs.map(sub => {
                            const entry = dmcResults.find(r => String(r.subject_id) === String(sub.id))
                            const max = Number(entry?.total_marks || 100)
                            const obt = Number(entry?.marks_obtained || 0)
                            const pct = entry?.marks_obtained !== undefined ? Math.round((obt / max) * 100) : 0
                            
                            const colorsMap: Record<string, string> = {
                              'english': '#3b82f6',
                              'urdu': '#60a5fa',
                              'islamiyat': '#10b981',
                              'physics': '#f97316',
                              'chemistry': '#8b5cf6',
                              'biology': '#14b8a6',
                              'pak study': '#ec4899',
                              'mutalia quran': '#0f766e',
                              'math': '#2563eb'
                            }
                            
                            const nameLower = sub.name.toLowerCase()
                            let barColor = '#4f46e5'
                            for (const [k, col] of Object.entries(colorsMap)) {
                              if (nameLower.includes(k)) {
                                barColor = col
                                break
                              }
                            }

                            return (
                              <div key={sub.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 4px', maxWidth: '50px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>{entry?.marks_obtained !== undefined ? `${pct}%` : '—'}</span>
                                <div style={{
                                  width: '18px',
                                  height: `${pct}%`,
                                  background: barColor,
                                  borderRadius: '3px 3px 0 0',
                                  transition: 'height 0.3s ease'
                                }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }} title={sub.name}>{sub.name}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer Rules & Signatures */}
                    <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.5 }}>
                        1. Passing %age in any subject is 40.<br />
                        2. Failure in any two subjects will be considered as Failed
                        <div style={{ marginTop: '2.5rem', fontWeight: 700, color: '#1e293b', fontSize: '0.75rem' }}>
                          <span style={{ borderTop: '1px solid #64748b', paddingTop: '3px', display: 'inline-block', width: '160px' }}>Incharge Examination Cell</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: '100px', height: '55px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '3px', background: '#f8fafc' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>Class Teacher</span>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })()}
          </div>

        </div>
      )}

      {/* Roll No Slip Tab */}
      {tab === 'roll-no-slip' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Controls card */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>🎫 Step 5: Roll No Slips</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Exam *</label>
                <select className="form-select" value={selExam} onChange={e => setSelExam(e.target.value)}>
                  <option value="">Choose exam type</option>
                  {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Class *</label>
                <select className="form-select" value={selClass} onChange={e => { setSelClass(e.target.value); setSelStudent('') }}>
                  <option value="">Choose class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Student (Optional)</label>
                <select className="form-select" value={selStudent} onChange={e => setSelStudent(e.target.value)} disabled={!selClass}>
                  <option value="">All Students (Batch Print)</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} (Roll: {s.roll_no || '—'})</option>)}
                </select>
              </div>

              <button 
                onClick={() => {
                  setPrintType('roll-no-slip')
                  setTimeout(() => {
                    window.print()
                  }, 150)
                }} 
                className="btn btn-primary"
                disabled={!selClass || !selExam || (selStudent === '' && students.length === 0)}
                style={{ justifyContent: 'center' }}
              >
                🖨️ Print Roll No Slip(s)
              </button>
            </div>
          </div>

          {/* Live Preview card */}
          <div className="card" style={{ background: '#f8fafc', overflow: 'auto', maxHeight: '700px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Live Slip Preview</h3>
            {!selClass || !selExam ? (
              <div className="empty-state"><div className="empty-icon">🎫</div><p>Select exam and class to view roll no slips</p></div>
            ) : students.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">👥</div><p>No student records found for this class</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {(() => {
                  const activeExamName = examTypes.find(e => e.id === selExam)?.name || ''
                  const activeClassName = classes.find(c => c.id === selClass)?.name || ''
                  const previewStudents = selStudent 
                    ? students.filter(s => s.id === selStudent)
                    : students

                  return previewStudents.map(student => {
                    const sectionName = student.section_name || '—'
                    return (
                      <div key={student.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        {/* Slip Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #006ac3', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {customLogoUrl ? (
                              <img src={customLogoUrl} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ fontSize: '1.75rem' }}>🏫</div>
                            )}
                            <div>
                              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#006ac3', textTransform: 'uppercase' }}>{customSchoolName}</h4>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{customLocation}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.8rem', background: '#006ac315', color: '#006ac3', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                              ROLL NO SLIP
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{activeExamName}</div>
                          </div>
                        </div>

                        {/* Student Details and Photo Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '1rem', marginBottom: '1rem' }}>
                          {/* Info Column */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Student Name:</span>
                            <strong>{student.name}</strong>

                            <span style={{ color: 'var(--text-secondary)' }}>Father's Name:</span>
                            <strong>{student.father_name || '—'}</strong>

                            <span style={{ color: 'var(--text-secondary)' }}>Class & Section:</span>
                            <strong>{activeClassName} ({sectionName})</strong>

                            <span style={{ color: 'var(--text-secondary)' }}>Roll No:</span>
                            <strong>{student.roll_no || '—'}</strong>

                            <span style={{ color: 'var(--text-secondary)' }}>Student ID:</span>
                            <span style={{ fontFamily: 'monospace' }}>{student.id.slice(0, 8)}</span>
                          </div>

                          {/* Image Box */}
                          <div style={{ width: '80px', height: '90px', border: '1.5px solid var(--border)', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {student.photo_url ? (
                              <img src={student.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '2rem', color: '#cbd5e1' }}>👤</span>
                            )}
                          </div>
                        </div>

                        {/* Exam Schedule Sub-table */}
                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>📅 Exam Schedule</span>
                          {schedulesList.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>No exam schedules set for this class.</p>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>Subject</th>
                                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>Date</th>
                                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedulesList.map(s => (
                                  <tr key={s.subject_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>{s.subject_name}</td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>{s.date ? formatDateNumeric(s.date) : '—'}</td>
                                    <td style={{ padding: '0.3rem 0.5rem' }}>{s.time || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Instructions */}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', lineHeight: '1.4' }}>
                          <strong>Important Instructions:</strong>
                          <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1rem' }}>
                            <li>Please bring this Roll No Slip to the examination hall daily.</li>
                            <li>Mobile phones, smartwatches, and helper materials are strictly prohibited.</li>
                            <li>Arrive at least 15 minutes before the exam starts.</li>
                          </ul>
                        </div>

                        {/* Signatures */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '1.25rem', fontWeight: 'bold' }}>
                          <div>Class Teacher Sign: _________________</div>
                          <div>Principal Sign: _________________</div>
                        </div>

                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Style settings for Printing on same page */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide everything except the print wrapper */
          body > *:not(#printable-area-wrapper) {
            display: none !important;
          }
          #printable-area-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dmc-print-card {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .header-banner-print {
            background: #006ac3 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .logo-circle-print {
            background: white !important;
            color: #006ac3 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .blue-th-print {
            background-color: #006ac3 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-pill-blue-print {
            background-color: #006ac3 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .status-badge-passed-print {
            background-color: #10b981 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .status-badge-failed-print {
            background-color: #ef4444 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-green-print {
            background-color: #10b981 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .chart-bg-print {
            background: #fafafa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bar-color-print {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @media screen {
          #printable-area-wrapper {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden printable area */}
      {selClass && selExam && printType && (
        <div id="printable-area-wrapper">
          {printType === 'dmc' && activeStudent && (
            <div className="dmc-print-card" style={{
              background: 'white',
              width: '740px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'system-ui, sans-serif',
              color: '#1e293b'
            }}>
              {/* Header Banner */}
              <div className="header-banner-print" style={{
                background: '#006ac3',
                color: 'white',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '80px 1fr 80px',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px' }} />
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{customSchoolName}</h2>
                  <div style={{ fontSize: '11px', opacity: 0.95, marginTop: '3px', fontWeight: 500 }}>{customLocation}</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>Ph: ${customPhone}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, textDecoration: 'underline', marginTop: '8px', textTransform: 'uppercase' }}>Detailed Marks Certificate</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '3px' }}>{activeExamName} {customExamYear}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    border: '2px solid white',
                    background: '#e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569'
                  }}>
                    {activeStudent.photo_url ? (
                      <img src={activeStudent.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                </div>
              </div>

              {/* Student Info Box */}
              <div style={{ padding: '15px', borderBottom: '1.5px solid #cbd5e1' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ height: '32px' }}>
                      <td style={{ width: '15%', fontSize: '12px', color: '#475569' }}>Student&apos;s Name:</td>
                      <td style={{ width: '35%', paddingRight: '10px' }}>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeStudent.name}</span>
                      </td>
                      <td style={{ width: '18%', fontSize: '12px', color: '#475569' }}>Roll No:</td>
                      <td style={{ width: '32%' }}>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeStudent.roll_no || '—'}</span>
                      </td>
                    </tr>
                    <tr style={{ height: '32px' }}>
                      <td style={{ fontSize: '12px', color: '#475569' }}>Father&apos;s Name:</td>
                      <td style={{ paddingRight: '10px' }}>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeStudent.father_name || '—'}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>Section:</td>
                      <td>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeStudent.section_name || '—'}</span>
                      </td>
                    </tr>
                    <tr style={{ height: '32px' }}>
                      <td style={{ fontSize: '12px', color: '#475569' }}>Class:</td>
                      <td style={{ paddingRight: '10px' }}>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeClassName}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>Date Of Birth:</td>
                      <td>
                        <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '13px', display: 'block', paddingBottom: '1px' }}>{activeStudent.dob ? formatDateNumeric(activeStudent.dob) : '—'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table Section */}
              <div style={{ padding: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="blue-th-print" style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '8px', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left', width: '35%' }}>Subjects</th>
                      <th className="blue-th-print" style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '8px', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center', width: '20%' }}>Maximum Marks</th>
                      <th className="blue-th-print" style={{ backgroundColor: '#006ac3', color: 'white', border: '1px solid #006ac3', padding: '8px', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center', width: '45%' }} colSpan={2}>Obtained Marks</th>
                    </tr>
                    <tr style={{ backgroundColor: '#e2e8f0' }}>
                      <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                      <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold' }}>Total</th>
                      <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold', width: '15%' }}>Total</th>
                      <th style={{ border: '1px solid #c5d2e0', padding: '4px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'left', fontWeight: 'bold', width: '30%' }}>In Words</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDmcRows.map(r => (
                      <tr key={r.id}>
                        <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '13px', fontWeight: 500 }}>{r.name}</td>
                        <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '13px', textAlign: 'center' }}>{r.max}</td>
                        <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>{r.obtStr !== '' ? r.obt : '—'}</td>
                        <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '12px', fontStyle: 'italic' }}>{r.words}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '12px', textAlign: 'right', textTransform: 'uppercase' }}>Total:</td>
                      <td style={{ padding: '10px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                        <span className="badge-pill-blue-print" style={{ background: '#006ac3', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{activeTotalMax}</span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                        <span className="badge-pill-blue-print" style={{ background: '#006ac3', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{activeTotalObt}</span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #c5d2e0', fontSize: '12px', color: '#1e3a8a' }}>
                        <span className="badge-pill-blue-print" style={{ background: '#006ac3', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{activeTotalObtWords}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Performance Grid */}
              <div style={{ padding: '0 15px 15px' }}>
                <table style={{ width: '100%', fontSize: '11px', textAlign: 'center', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', color: '#64748b' }}>Class Position</td>
                      <td style={{ padding: '4px', color: '#64748b' }}>Section Position</td>
                      <td style={{ padding: '4px', color: '#64748b' }}>%age</td>
                      <td style={{ padding: '4px', color: '#64748b' }}>Grade</td>
                      <td style={{ padding: '4px', color: '#64748b' }}>Remarks</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '12px', display: 'inline-block', width: '90%' }}>{activeClassRankStr}</span></td>
                      <td style={{ padding: '4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '12px', display: 'inline-block', width: '90%' }}>{activeSecRankStr}</span></td>
                      <td style={{ padding: '4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '12px', display: 'inline-block', width: '90%' }}>{activeTotalPct}%</span></td>
                      <td style={{ padding: '4px' }}>
                        <span className="badge-green-print" style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>{activeGrade}</span>
                      </td>
                      <td style={{ padding: '4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '12px', display: 'inline-block', width: '90%' }}>{activeRemarks}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Passed Badge */}
              {activePassed !== null && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                  <div className={activePassed ? 'status-badge-passed-print' : 'status-badge-failed-print'} style={{
                    background: activePassed ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '8px 24px',
                    borderRadius: '24px',
                    fontWeight: 800,
                    fontSize: '15px'
                  }}>
                    {activePassed ? '✓ PASSED' : '✗ FAILED'}
                  </div>
                </div>
              )}

              {/* Bar Chart Visual */}
              {classSubs.length > 0 && activeTotalMax > 0 && (
                <div className="chart-bg-print" style={{ padding: '15px 30px', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', maxWidth: '580px', margin: '0 auto', paddingBottom: '4px' }}>
                    {classSubs.map(sub => {
                      const entry = dmcResults.find(r => String(r.subject_id) === String(sub.id))
                      const max = Number(entry?.total_marks || 100)
                      const obt = Number(entry?.marks_obtained || 0)
                      const pct = entry?.marks_obtained !== undefined ? Math.round((obt / max) * 100) : 0
                      
                      const colorsMap: Record<string, string> = {
                        'english': '#3b82f6',
                        'urdu': '#60a5fa',
                        'islamiyat': '#10b981',
                        'physics': '#f97316',
                        'chemistry': '#8b5cf6',
                        'biology': '#14b8a6',
                        'pak study': '#ec4899',
                        'mutalia quran': '#0f766e',
                        'math': '#2563eb'
                      }
                      
                      const nameLower = sub.name.toLowerCase()
                      let barColor = '#4f46e5'
                      for (const [k, col] of Object.entries(colorsMap)) {
                        if (nameLower.includes(k)) {
                          barColor = col
                          break
                        }
                      }

                      return (
                        <div key={sub.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 4px', maxWidth: '50px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>{entry?.marks_obtained !== undefined ? `${pct}%` : '—'}</span>
                          <div className="bar-color-print" style={{
                            width: '20px',
                            height: `${pct}%`,
                            background: barColor,
                            borderRadius: '3px 3px 0 0'
                          }} />
                          <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{sub.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Footer Rules & Signatures */}
              <div style={{ padding: '20px 25px', display: 'grid', gridTemplateColumns: '2fr 1fr', alignItems: 'flex-end', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                  1. Passing %age in any subject is 40.<br />
                  2. Failure in any two subjects will be considered as Failed
                  <div style={{ marginTop: '40px', fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>
                    <span style={{ borderTop: '1px solid #64748b', paddingTop: '3px', display: 'inline-block', width: '160px' }}>Incharge Examination Cell</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: '100px', height: '60px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '4px', background: '#f8fafc' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>Class Teacher</span>
                </div>
              </div>

            </div>
          )}

          {printType === 'schedule' && (
            <div style={{
              background: 'white',
              width: '740px',
              margin: '0 auto',
              padding: '20px',
              fontFamily: 'system-ui, sans-serif'
            }}>
              <div style={{
                textAlign: 'center',
                borderBottom: '3px double #222',
                paddingBottom: '12px',
                marginBottom: '25px'
              }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Date Sheet & Schedule</h1>
                <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '5px', color: '#1e3a8a' }}>Class: {activeClassName}</div>
                <div style={{ fontSize: '14px', color: '#555', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{activeExamName}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '10%', fontWeight: 'bold', textTransform: 'uppercase' }}>S.No</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '40%', fontWeight: 'bold', textTransform: 'uppercase' }}>Subject</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '30%', fontWeight: 'bold', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', width: '20%', fontWeight: 'bold', textTransform: 'uppercase' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesList.filter(s => s.date || s.time).map((s, idx) => (
                    <tr key={s.subject_id} style={idx % 2 === 1 ? { backgroundColor: '#fafafa' } : {}}>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}><strong>{s.subject_name}</strong></td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>{s.date ? new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>{s.time || '—'}</td>
                    </tr>
                  ))}
                  {schedulesList.filter(s => s.date || s.time).length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#666', padding: '12px' }}>No subjects scheduled yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {printType === 'roll-no-slip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '10px', background: 'white' }}>
              {(() => {
                const activeExamName = examTypes.find(e => e.id === selExam)?.name || ''
                const activeClassName = classes.find(c => c.id === selClass)?.name || ''
                const printStudents = selStudent 
                  ? students.filter(s => s.id === selStudent)
                  : students

                return printStudents.map(student => {
                  const sectionName = student.section_name || '—'
                  return (
                    <div 
                      key={student.id} 
                      style={{ 
                        pageBreakAfter: 'always', 
                        border: '1.5px dashed #475569', 
                        borderRadius: '8px', 
                        padding: '20px', 
                        background: 'white',
                        fontFamily: 'system-ui, sans-serif',
                        color: '#1e293b',
                        width: '680px',
                        margin: '0 auto'
                      }}
                    >
                      {/* Slip Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #006ac3', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {customLogoUrl ? (
                            <img src={customLogoUrl} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: '2rem' }}>🏫</div>
                          )}
                          <div>
                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#006ac3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{customSchoolName}</h3>
                            <span style={{ fontSize: '0.75rem', color: '#475569' }}>{customLocation}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: 'white', background: '#006ac3', padding: '0.3rem 0.75rem', borderRadius: '4px', display: 'inline-block' }}>
                            ROLL NO SLIP
                          </span>
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.3rem', fontWeight: 600 }}>{activeExamName}</div>
                        </div>
                      </div>

                      {/* Student Details and Photo Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1.5rem', marginBottom: '1.25rem' }}>
                        {/* Info Column */}
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                          <span style={{ color: '#475569' }}>Student Name:</span>
                          <strong style={{ color: '#0f172a' }}>{student.name}</strong>

                          <span style={{ color: '#475569' }}>Father's Name:</span>
                          <strong style={{ color: '#0f172a' }}>{student.father_name || '—'}</strong>

                          <span style={{ color: '#475569' }}>Class & Section:</span>
                          <strong style={{ color: '#0f172a' }}>{activeClassName} ({sectionName})</strong>

                          <span style={{ color: '#475569' }}>Roll No:</span>
                          <strong style={{ color: '#0f172a' }}>{student.roll_no || '—'}</strong>

                          <span style={{ color: '#475569' }}>Student ID:</span>
                          <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 'bold' }}>{student.id.slice(0, 8)}</span>
                        </div>

                        {/* Image Box */}
                        <div style={{ width: '90px', height: '105px', border: '2px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {student.photo_url ? (
                            <img src={student.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '2.5rem', color: '#cbd5e1' }}>👤</span>
                          )}
                        </div>
                      </div>

                      {/* Exam Schedule Sub-table */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px' }}>📅 Exam Schedule</span>
                        {schedulesList.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>No exam schedules set for this class.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Subject</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Date</th>
                                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedulesList.map(s => (
                                <tr key={s.subject_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: '#0f172a' }}>{s.subject_name}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', color: '#334155' }}>{s.date ? formatDateNumeric(s.date) : '—'}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', color: '#334155' }}>{s.time || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Instructions */}
                      <div style={{ fontSize: '0.75rem', color: '#475569', borderTop: '1.5px solid #cbd5e1', paddingTop: '0.65rem', lineHeight: '1.5' }}>
                        <strong>Important Instructions:</strong>
                        <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                          <li>Please bring this Roll No Slip to the examination hall daily.</li>
                          <li>Mobile phones, smartwatches, and helper materials are strictly prohibited.</li>
                          <li>Arrive at least 15 minutes before the exam starts.</li>
                        </ul>
                      </div>

                      {/* Signatures */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>
                        <div style={{ width: '220px', borderTop: '1px solid #94a3b8', paddingTop: '4px', textAlign: 'center' }}>Class Teacher Signature</div>
                        <div style={{ width: '220px', borderTop: '1px solid #94a3b8', paddingTop: '4px', textAlign: 'center' }}>Principal Signature</div>
                      </div>

                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
