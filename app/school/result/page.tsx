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

// Helper: Convert date of birth (e.g. 2010-02-01) to words (e.g. "First February Two Thousand Ten")
function dateToWords(dobStr: string): string {
  if (!dobStr) return '—'
  const date = new Date(dobStr)
  if (isNaN(date.getTime())) return '—'
  
  const days = [
    '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
    'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
    'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'
  ]
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  const yearWords = numberToWords(year)
  
  return `${days[day]} ${month} ${yearWords}`
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
  const [customLogoText, setCustomLogoText] = useState('AES')
  const [customExamYear, setCustomExamYear] = useState('2026')
  const [customAdmNo, setCustomAdmNo] = useState('')

  // Load basics
  useEffect(() => {
    fetch('/api/school/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
    fetch('/api/school/results').then(r => r.json()).then(d => setExamTypes(d.examTypes || []))
    fetch('/api/school/subjects').then(r => r.json()).then(d => setSubjects(d.subjects || []))
    
    // Also try to pre-fill school details from dashboard/session
    fetch('/api/school/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.schoolName) {
          setCustomSchoolName(d.schoolName)
        }
      })
      .catch(() => {})
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

  // Pre-fill admission number input when student changes
  useEffect(() => {
    if (selStudent) {
      const idx = students.findIndex(s => s.id === selStudent)
      if (idx !== -1) {
        setCustomAdmNo(String(idx + 1))
      }
    }
  }, [selStudent, students])

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
    const examName = examTypes.find(e => e.id === selExam)?.name || 'Examination'
    const className = classes.find(c => c.id === selClass)?.name || ''
    const win = window.open('', '_blank')
    if (!win) return

    const rowsHTML = schedulesList
      .filter(s => s.date || s.time)
      .map((s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.subject_name}</strong></td>
          <td>${s.date ? new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td>
          <td>${s.time || '—'}</td>
        </tr>
      `).join('')

    win.document.write(`
      <html>
        <head>
          <title>Exam Schedule - ${examName} - Class ${className}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #111;
              margin: 40px;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #222;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
            }
            .class-name {
              font-size: 18px;
              font-weight: 600;
              margin-top: 5px;
              color: #1e3a8a;
            }
            .subtitle {
              font-size: 14px;
              color: #555;
              margin-top: 5px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            @media print {
              body { margin: 20px; }
              th { background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Date Sheet & Schedule</h1>
            <div class="class-name">Class: ${className}</div>
            <div class="subtitle">${examName}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">S.No</th>
                <th style="width: 40%">Subject</th>
                <th style="width: 30%">Date</th>
                <th style="width: 20%">Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || '<tr><td colspan="4" style="text-align:center;color:#666">No subjects scheduled yet.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  // Print DMC logic
  function printDmc() {
    const student = students.find(s => s.id === selStudent)
    if (!student) return
    const examName = examTypes.find(e => e.id === selExam)?.name || 'Final Term Exam'
    const className = classes.find(c => c.id === selClass)?.name || ''
    
    const classSubs = subjects.filter(s => String(s.class_id) === String(selClass))
    
    let totalMax = 0
    let totalObt = 0
    let failedCount = 0

    const rowsHTML = classSubs.map((sub) => {
      const entry = dmcResults.find(r => String(r.subject_id) === String(sub.id))
      const max = Number(entry?.total_marks || 100)
      const obtStr = entry?.marks_obtained !== undefined ? String(entry.marks_obtained) : ''
      const obt = Number(obtStr || 0)
      
      if (obtStr !== '') {
        totalMax += max
        totalObt += obt
        if ((obt / max) * 100 < 40) {
          failedCount++
        }
      }

      const obtWords = obtStr !== '' ? numberToWords(obt) : '—'

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #c5d2e0; font-weight: 500; font-size: 13px;">${sub.name}</td>
          <td style="padding: 10px; border: 1px solid #c5d2e0; text-align: center; font-size: 13px;">${max}</td>
          <td style="padding: 10px; border: 1px solid #c5d2e0; text-align: center; font-size: 13px;">${obtStr !== '' ? obt : '—'}</td>
          <td style="padding: 10px; border: 1px solid #c5d2e0; font-size: 13px; font-style: italic;">${obtWords}</td>
        </tr>
      `
    }).join('')

    const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : 0
    const grade = totalMax > 0 ? getGradeForPct(totalPct) : '—'
    const remarks = totalMax > 0 ? getRemarksForGrade(grade) : '—'
    const passed = dmcResults.length > 0 ? (failedCount < 2) : null
    
    const totalObtWords = totalObt > 0 ? numberToWords(totalObt) : '—'
    
    // Rankings
    const classRankInfo = classRankings[student.id]
    const secRankInfo = sectionRankings[student.id]
    
    const classRankStr = classRankInfo ? `${getOrdinal(classRankInfo.rank)} Out of ${classRankInfo.total}` : '—'
    const secRankStr = secRankInfo ? `${getOrdinal(secRankInfo.rank)} Out of ${secRankInfo.total}` : '—'
    
    // Charts logic
    const barWidth = 100 / classSubs.length
    const chartBarsHTML = classSubs.map(sub => {
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

      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 130px; position: relative;">
          <span style="font-size: 9px; font-weight: bold; margin-bottom: 2px; color: #374151;">${entry?.marks_obtained !== undefined ? pct + '%' : '—'}</span>
          <div style="width: 25px; height: ${pct}%; background: ${barColor}; border-radius: 3px 3px 0 0; transition: height 0.3s ease;"></div>
          <span style="font-size: 8px; font-weight: 600; color: #4b5563; text-align: center; margin-top: 6px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${sub.name}">${sub.name}</span>
        </div>
      `
    }).join('')

    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <html>
        <head>
          <title>DMC - ${student.name}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: white;
              }
              .dmc-card {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                width: 100% !important;
              }
              .print-btn-bar {
                display: none !important;
              }
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              background-color: #f1f5f9;
              padding: 20px;
              display: flex;
              justify-content: center;
            }
            .dmc-card {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              border: 1px solid #e2e8f0;
              width: 760px;
              padding: 0;
              display: flex;
              flex-direction: column;
            }
            .header-banner {
              background: #006ac3;
              color: white;
              border-top-left-radius: 11px;
              border-top-right-radius: 11px;
              padding: 16px 20px;
              display: grid;
              grid-template-columns: 80px 1fr 80px;
              align-items: center;
              text-align: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .logo-circle {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: white;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #006ac3;
              font-weight: 800;
              font-size: 18px;
              margin: 0 auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .photo-frame {
              width: 60px;
              height: 60px;
              border-radius: 6px;
              border: 2px solid white;
              background: #e2e8f0;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #475569;
              margin: 0 auto;
            }
            .student-info-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .student-info-table td {
              padding: 6px 12px;
              font-size: 12px;
              color: #334155;
            }
            .underline-val {
              border-bottom: 1.5px solid #1e293b;
              font-weight: 700;
              color: #0f172a;
              display: inline-block;
              width: 100%;
              padding-bottom: 1px;
            }
            .blue-th {
              background-color: #006ac3 !important;
              color: white;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
              padding: 8px;
              border: 1px solid #006ac3;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-pill-blue {
              background-color: #006ac3 !important;
              color: white !important;
              padding: 4px 12px;
              border-radius: 9999px;
              font-weight: bold;
              display: inline-block;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .status-badge {
              padding: 8px 24px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 16px;
              display: inline-block;
              margin: 15px auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .passed-badge {
              background-color: #10b981 !important;
              color: white;
            }
            .failed-badge {
              background-color: #ef4444 !important;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="dmc-card">
            <!-- Header Banner -->
            <div class="header-banner">
              <div>
                <div class="logo-circle">${customLogoText}</div>
              </div>
              <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${customSchoolName}</h2>
                <div style="font-size: 11px; opacity: 0.95; margin-top: 3px; font-weight: 500;">${customLocation}</div>
                <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Ph: ${customPhone}</div>
                <div style="font-size: 13px; font-weight: 700; text-decoration: underline; margin-top: 8px; text-transform: uppercase;">Detailed Marks Certificate</div>
                <div style="font-size: 12px; font-weight: 600; margin-top: 3px;">${examName} ${customExamYear}</div>
              </div>
              <div>
                <div class="photo-frame">
                  ${student.photo_url ? `<img src="${student.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : '👤'}
                </div>
              </div>
            </div>

            <!-- Student Info Box -->
            <div style="padding: 15px; border-bottom: 1.5px solid #cbd5e1;">
              <table class="student-info-table">
                <tr>
                  <td style="width: 15%">Student's Name:</td>
                  <td style="width: 35%"><span class="underline-val">${student.name}</span></td>
                  <td style="width: 18%">Student's Adm No:</td>
                  <td style="width: 32%"><span class="underline-val">${customAdmNo || '—'}</span></td>
                </tr>
                <tr>
                  <td>Father's Name:</td>
                  <td><span class="underline-val">${student.father_name || '—'}</span></td>
                  <td>Roll No:</td>
                  <td><span class="underline-val">${student.roll_no || '—'}</span></td>
                </tr>
                <tr>
                  <td>Class:</td>
                  <td><span class="underline-val">${className}</span></td>
                  <td>Section:</td>
                  <td><span class="underline-val">${student.section_name || '—'}</span></td>
                </tr>
                <tr>
                  <td>Date Of Birth:</td>
                  <td colspan="3">
                    <span class="underline-val">${student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} &nbsp;&nbsp;&nbsp;&nbsp; <strong>In Words:</strong> ${student.dob ? dateToWords(student.dob) : '—'}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Table Section -->
            <div style="padding: 15px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th class="blue-th" style="width: 35%; text-align: left;">Subjects</th>
                    <th class="blue-th" style="width: 20%; text-align: center;">Maximum Marks</th>
                    <th class="blue-th" style="width: 45%; text-align: center;" colspan="2">Obtained Marks</th>
                  </tr>
                  <tr>
                    <th style="border: 1px solid #c5d2e0; background: #e2e8f0; font-size: 10px; font-weight: bold; padding: 4px; text-align: left; text-transform: uppercase;">Name</th>
                    <th style="border: 1px solid #c5d2e0; background: #e2e8f0; font-size: 10px; font-weight: bold; padding: 4px; text-align: center; text-transform: uppercase;">Total</th>
                    <th style="border: 1px solid #c5d2e0; background: #e2e8f0; font-size: 10px; font-weight: bold; padding: 4px; text-align: center; text-transform: uppercase; width: 15%;">Total</th>
                    <th style="border: 1px solid #c5d2e0; background: #e2e8f0; font-size: 10px; font-weight: bold; padding: 4px; text-align: left; text-transform: uppercase; width: 30%;">In Words</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHTML || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No results entered for this student.</td></tr>'}
                  <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td style="padding: 10px; border: 1px solid #c5d2e0; text-align: right; text-transform: uppercase; font-size: 12px;">Total:</td>
                    <td style="padding: 10px; border: 1px solid #c5d2e0; text-align: center;">
                      <span class="badge-pill-blue">${totalMax}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #c5d2e0; text-align: center;">
                      <span class="badge-pill-blue">${totalObt}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #c5d2e0; font-size: 12px; font-style: normal; color: #1e3a8a;">
                      <span class="badge-pill-blue">${totalObtWords}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Performance Grid -->
            <div style="padding: 0 15px 15px;">
              <table style="width: 100%; font-size: 11px; text-align: center; border-collapse: collapse;">
                <tr>
                  <td style="width: 22%; padding: 4px 6px;">Class Position:</td>
                  <td style="width: 22%; padding: 4px 6px;">Section Position:</td>
                  <td style="width: 16%; padding: 4px 6px;">%age:</td>
                  <td style="width: 16%; padding: 4px 6px;">Grade:</td>
                  <td style="width: 24%; padding: 4px 6px;">Remarks:</td>
                </tr>
                <tr>
                  <td style="padding: 4px 6px;"><span class="underline-val" style="font-size:12px;">${classRankStr}</span></td>
                  <td style="padding: 4px 6px;"><span class="underline-val" style="font-size:12px;">${secRankStr}</span></td>
                  <td style="padding: 4px 6px;"><span class="underline-val" style="font-size:12px;">${totalPct}%</span></td>
                  <td style="padding: 4px 6px;">
                    <span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${grade}</span>
                  </td>
                  <td style="padding: 4px 6px;"><span class="underline-val" style="font-size:12px;">${remarks}</span></td>
                </tr>
              </table>
            </div>

            <!-- Pass / Fail Badge -->
            ${passed !== null ? `
            <div style="text-align: center; margin-top: 5px;">
              <div class="status-badge ${passed ? 'passed-badge' : 'failed-badge'}">
                ${passed ? '✓ PASSED' : '✗ FAILED'}
              </div>
            </div>
            ` : ''}

            <!-- Bar Chart Section -->
            ${classSubs.length > 0 && totalMax > 0 ? `
            <div style="padding: 10px 30px; border-top: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0; background: #fafafa; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 160px; max-width: 600px; margin: 0 auto; padding-bottom: 5px;">
                ${chartBarsHTML}
              </div>
            </div>
            ` : ''}

            <!-- Rules & Footer Signatures -->
            <div style="padding: 20px 25px; display: grid; grid-template-columns: 2fr 1fr; align-items: flex-end;">
              <div style="font-size: 11px; line-height: 1.6; color: #475569;">
                1. Passing %age in any subject is 40.<br/>
                2. Failure in any two subjects will be considered as Failed
                
                <div style="margin-top: 50px; font-weight: 700; color: #1e293b; font-size: 12px;">
                  <span style="border-top: 1.5px solid #475569; padding-top: 4px; display: inline-block; width: 180px;">Incharge Examination Cell</span>
                </div>
              </div>
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 120px; height: 75px; border: 1.5px solid #94a3b8; border-radius: 4px; margin-bottom: 4px; background: #fff;"></div>
                <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Class Teacher</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

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
          ['dmc', '📄 DMC']
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
              <label className="form-label">Logo Abbreviation</label>
              <input className="form-input" value={customLogoText} onChange={e => setCustomLogoText(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Exam Year</label>
              <input className="form-input" value={customExamYear} onChange={e => setCustomExamYear(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Admission No.</label>
              <input className="form-input" value={customAdmNo} onChange={e => setCustomAdmNo(e.target.value)} placeholder="Auto-generated if empty" />
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
              const student = students.find(s => s.id === selStudent)
              if (!student) return <div className="card empty-state"><p>Student not found</p></div>
              
              const classSubs = subjects.filter(s => String(s.class_id) === String(selClass))
              
              let totalMax = 0
              let totalObt = 0
              let failedCount = 0

              const examName = examTypes.find(e => e.id === selExam)?.name || 'Final Term Exam'
              
              const rows = classSubs.map(sub => {
                const entry = dmcResults.find(r => String(r.subject_id) === String(sub.id))
                const max = Number(entry?.total_marks || 100)
                const obtStr = entry?.marks_obtained !== undefined ? String(entry.marks_obtained) : ''
                const obt = Number(obtStr || 0)
                
                if (obtStr !== '') {
                  totalMax += max
                  totalObt += obt
                  if ((obt / max) * 100 < 40) {
                    failedCount++
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

              const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : 0
              const grade = totalMax > 0 ? getGradeForPct(totalPct) : '—'
              const remarks = totalMax > 0 ? getRemarksForGrade(grade) : '—'
              const passed = dmcResults.length > 0 ? (failedCount < 2) : null
              
              // Rankings
              const classRankInfo = classRankings[student.id]
              const secRankInfo = sectionRankings[student.id]
              
              const classRankStr = classRankInfo ? `${getOrdinal(classRankInfo.rank)} Out of ${classRankInfo.total}` : '—'
              const secRankStr = secRankInfo ? `${getOrdinal(secRankInfo.rank)} Out of ${secRankInfo.total}` : '—'

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
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'white',
                          border: '2px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#006ac3',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}>{customLogoText}</div>
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{customSchoolName}</h2>
                        <div style={{ fontSize: '0.75rem', opacity: 0.95, marginTop: '2px', fontWeight: 500 }}>{customLocation}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.9, marginTop: '1px' }}>Ph: {customPhone}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, textDecoration: 'underline', marginTop: '6px', textTransform: 'uppercase' }}>Detailed Marks Certificate</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{examName} {customExamYear}</div>
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
                          {student.photo_url ? (
                            <img src={student.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{student.name}</span>
                            </td>
                            <td style={{ width: '18%', fontSize: '0.75rem', color: '#475569' }}>Student&apos;s Adm No:</td>
                            <td style={{ width: '32%' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{customAdmNo || '—'}</span>
                            </td>
                          </tr>
                          <tr style={{ height: '32px' }}>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Father&apos;s Name:</td>
                            <td style={{ paddingRight: '1rem' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{student.father_name || '—'}</span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Roll No:</td>
                            <td>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{student.roll_no || '—'}</span>
                            </td>
                          </tr>
                          <tr style={{ height: '32px' }}>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Class:</td>
                            <td style={{ paddingRight: '1rem' }}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{classes.find(c => c.id === selClass)?.name}</span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Section:</td>
                            <td>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>{student.section_name || '—'}</span>
                            </td>
                          </tr>
                          <tr style={{ height: '32px' }}>
                            <td style={{ fontSize: '0.75rem', color: '#475569' }}>Date Of Birth:</td>
                            <td colSpan={3}>
                              <span style={{ borderBottom: '1.5px solid #1e293b', fontWeight: 700, fontSize: '0.85rem', display: 'block', paddingBottom: '1px' }}>
                                {student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} &nbsp;&nbsp;&nbsp;&nbsp; <strong style={{ color: '#64748b', fontWeight: 600 }}>In Words:</strong> {student.dob ? dateToWords(student.dob) : '—'}
                              </span>
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
                          {rows.map(r => (
                            <tr key={r.id}>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', fontWeight: 500 }}>{r.name}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'center' }}>{r.max}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>{r.obtStr !== '' ? r.obt : '—'}</td>
                              <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>{r.words}</td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No subjects added.</td></tr>
                          )}
                          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', textAlign: 'right', textTransform: 'uppercase' }}>Total:</td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{totalMax}</span>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', textAlign: 'center' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{totalObt}</span>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #c5d2e0', fontSize: '0.8rem', color: '#1e3a8a' }}>
                              <span style={{ background: '#006ac3', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{totalObt > 0 ? numberToWords(totalObt) : '—'}</span>
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
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{classRankStr}</span></td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{secRankStr}</span></td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{totalPct}%</span></td>
                            <td style={{ padding: '2px 4px' }}>
                              <span style={{ background: '#10b981', color: 'white', padding: '1px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>{grade}</span>
                            </td>
                            <td style={{ padding: '2px 4px' }}><span style={{ borderBottom: '1px solid #64748b', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', width: '90%' }}>{remarks}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Passed Badge */}
                    {passed !== null && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                        <div style={{
                          background: passed ? '#10b981' : '#ef4444',
                          color: 'white',
                          padding: '6px 20px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                          {passed ? '✓ PASSED' : '✗ FAILED'}
                        </div>
                      </div>
                    )}

                    {/* Bar Chart Visual */}
                    {classSubs.length > 0 && totalMax > 0 && (
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
    </div>
  )
}
