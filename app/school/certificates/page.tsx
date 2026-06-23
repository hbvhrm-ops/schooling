'use client'
import { useState, useEffect, useCallback } from 'react'

interface Student {
  id: string
  name: string
  father_name: string
  class_id: string
  class_name: string
  section_id: string
  section_name: string
  roll_no: string
  gender: string
  dob?: string
  contact: string
  status: string
  reg_date: string
  address?: string
}

interface ClassItem { id: string; name: string }
interface SectionItem { id: string; class_id: string; name: string }
interface SubjectItem { id: string; class_id: string; name: string; class_name?: string }
interface ExamType { id: string; name: string }

interface CertificateTemplate {
  logo_url: string
  title: string
  body_text: string
  signature_title: string
}

type DocType = 'slc' | 'birth' | 'character' | 'sports' | 'top_positions' | 'admission' | 'award_list'
type TabType = 'generate' | 'template'

export default function CertificatesPage() {
  const [activeDoc, setActiveDoc] = useState<DocType>('slc')
  const [tab, setTab] = useState<TabType>('generate')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  
  // Data lists
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])

  // School metadata
  const [schoolName, setSchoolName] = useState('EduManage School')

  // Certificate template state (for currently active type)
  const [template, setTemplate] = useState<CertificateTemplate>({
    logo_url: '',
    title: '',
    body_text: '',
    signature_title: 'Principal'
  })
  
  // Forms states for template configuration
  const [logoUrlForm, setLogoUrlForm] = useState('')
  const [titleForm, setTitleForm] = useState('')
  const [bodyTextForm, setBodyTextForm] = useState('')
  const [signatureTitleForm, setSignatureTitleForm] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Certificate Variables States
  const [selectedStudentId, setSelectedStudentId] = useState('')
  
  // SLC specific states
  const [leavingDate, setLeavingDate] = useState(new Date().toISOString().split('T')[0])
  const [leavingReason, setLeavingReason] = useState('Completion of studies')
  const [conduct, setConduct] = useState('Excellent')

  // Birth Certificate specific states
  const [birthPlace, setBirthPlace] = useState('')
  const [birthRegisterNo, setBirthRegisterNo] = useState('')

  // Sports Certificate specific states
  const [sportName, setSportName] = useState('Athletics')
  const [sportAchievement, setSportAchievement] = useState('Winner')
  const [sportEventName, setSportEventName] = useState('Annual Sports Gala')
  const [sportDate, setSportDate] = useState(new Date().toISOString().split('T')[0])

  // Top Positions Certificate specific states
  const [topPosition, setTopPosition] = useState('1st')
  const [topExamName, setTopExamName] = useState('Final Term Examination')
  const [topMarksObtained, setTopMarksObtained] = useState('945')
  const [topTotalMarks, setTopTotalMarks] = useState('1100')

  // Admission Form specific states
  const [admissionFormMode, setAdmissionFormMode] = useState<'blank' | 'student'>('blank')

  // Award List specific states
  const [awardClass, setAwardClass] = useState('')
  const [awardSection, setAwardSection] = useState('')
  const [awardSubject, setAwardSubject] = useState('')
  const [awardExam, setAwardExam] = useState('')
  const [awardLoading, setAwardLoading] = useState(false)
  const [awardResults, setAwardResults] = useState<any[]>([])

  // Load basic lists
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsRes, classesRes, subjectsRes, examsRes] = await Promise.all([
        fetch('/api/school/students').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/subjects').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/results').then(r => r.json()).catch(() => ({})),
      ])

      const fetchedStudents = studentsRes.students || []
      setStudents(fetchedStudents)
      setClasses(classesRes.classes || [])
      setSections(classesRes.sections || [])
      setSubjects(subjectsRes.subjects || [])
      setExamTypes(examsRes.examTypes || [])

      if (fetchedStudents.length > 0) {
        setSelectedStudentId(fetchedStudents[0].id)
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error loading workspace metadata' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load certificate template when activeDoc changes
  const loadTemplate = useCallback(async (type: string) => {
    if (type === 'admission' || type === 'award_list') return
    try {
      const res = await fetch(`/api/school/certificate-templates?type=${type}`)
      const data = await res.json()
      if (res.ok && data.template) {
        setTemplate(data.template)
        setLogoUrlForm(data.template.logo_url || '')
        setTitleForm(data.template.title || '')
        setBodyTextForm(data.template.body_text || '')
        setSignatureTitleForm(data.template.signature_title || 'Principal')
        if (data.schoolName) {
          setSchoolName(data.schoolName)
        }
      }
    } catch {
      console.error('Error fetching template configuration')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadTemplate(activeDoc)
    setTab('generate')
    setMsg(null)
  }, [activeDoc, loadTemplate])

  // Fetch results for Award List
  const loadAwardResults = useCallback(async () => {
    if (!awardClass || !awardExam) return
    setAwardLoading(true)
    try {
      let url = `/api/school/results?class_id=${awardClass}&exam_type_id=${awardExam}`
      if (awardSubject) url += `&subject_id=${awardSubject}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setAwardResults(data.results || [])
      }
    } catch {
      console.error('Error loading award list results')
    } finally {
      setAwardLoading(false)
    }
  }, [awardClass, awardExam, awardSubject])

  useEffect(() => {
    loadAwardResults()
  }, [loadAwardResults])

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // Date conversion helper
  function convertDateToWords(dateStr?: string) {
    if (!dateStr) return '—'
    try {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = date.toLocaleString('en-US', { month: 'long' })
      const year = date.getFullYear()

      const ones = [
        '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 
        'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 
        'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Twenty-Third', 
        'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 
        'Thirtieth', 'Thirty-First'
      ]

      const dayWord = ones[day] || String(day)
      return `${dayWord} of ${month}, ${year}`
    } catch {
      return dateStr
    }
  }

  // Template compiler logic
  function compileTemplate(body: string, student: Student) {
    if (!body) return ''
    return body
      .replace(/{name}/g, student.name || '')
      .replace(/{father_name}/g, student.father_name || '—')
      .replace(/{class_name}/g, student.class_name || '—')
      .replace(/{roll_no}/g, student.roll_no || '—')
      .replace(/{gender}/g, student.gender || '—')
      .replace(/{address}/g, student.address || '—')
      .replace(/{dob}/g, student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      .replace(/{dob_words}/g, student.dob ? convertDateToWords(student.dob) : '—')
      .replace(/{reg_date}/g, student.reg_date ? new Date(student.reg_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      
      // SLC specific
      .replace(/{leaving_date}/g, leavingDate ? new Date(leavingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      .replace(/{leaving_reason}/g, leavingReason || '—')
      .replace(/{conduct}/g, conduct || '—')
      
      // Birth specific
      .replace(/{birth_place}/g, birthPlace || '—')
      .replace(/{register_no}/g, birthRegisterNo || '—')
      
      // Sports specific
      .replace(/{sport_name}/g, sportName || '—')
      .replace(/{achievement}/g, sportAchievement || '—')
      .replace(/{event_name}/g, sportEventName || '—')
      .replace(/{date}/g, sportDate ? new Date(sportDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      
      // Top Positions specific
      .replace(/{position}/g, topPosition || '—')
      .replace(/{exam_name}/g, topExamName || '—')
      .replace(/{marks_obtained}/g, topMarksObtained || '—')
      .replace(/{total_marks}/g, topTotalMarks || '—')
      .replace(/{percentage}/g, topMarksObtained && topTotalMarks ? String(Math.round((Number(topMarksObtained) / Number(topTotalMarks)) * 100)) : '0')
  }

  // Update Template configs
  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSavingTemplate(true)
    setMsg(null)

    const logoUrl = logoUrlForm.trim()
    const isBase64 = logoUrl.startsWith('data:image/') || logoUrl.startsWith('data:application/pdf')
    const logoRegex = /\.(pdf|png|jpg|jpeg)(\?.*)?$/i
    if (logoUrl && !isBase64 && !logoRegex.test(logoUrl)) {
      setMsg({ type: 'danger', text: 'Logo URL must point to a .pdf, .png, .jpg, or .jpeg file.' })
      setSavingTemplate(false)
      return
    }

    try {
      const res = await fetch('/api/school/certificate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeDoc,
          logo_url: logoUrl,
          title: titleForm.trim(),
          body_text: bodyTextForm,
          signature_title: signatureTitleForm.trim(),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'success', text: 'Certificate template updated successfully!' })
        if (data.template) {
          setTemplate(data.template)
        }
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to save template' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to server' })
    } finally {
      setSavingTemplate(false)
    }
  }

  // Print single certificate
  function handlePrintCertificate() {
    if (!selectedStudent) return
    const compiledBody = compileTemplate(template.body_text, selectedStudent)
    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <html>
        <head>
          <title>${template.title} - ${selectedStudent.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
            @page {
              size: landscape;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #fff;
            }
            body {
              font-family: 'Playfair Display', serif;
              color: #2c2c2c;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .certificate-container {
              width: 297mm;
              height: 210mm;
              padding: 12mm 15mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fdfbf7;
              overflow: hidden;
              position: relative;
            }
            .border-outer {
              border: 12px double #4a3e28;
              padding: 6px;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .border-inner {
              border: 2px solid #6e5a3c;
              padding: 4vh 6vw;
              position: relative;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              min-height: 0;
            }
            .badge-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 260px;
              opacity: 0.03;
              pointer-events: none;
              user-select: none;
              z-index: 0;
            }
            .content-wrapper {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
              min-height: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              flex-shrink: 0;
            }
            .logo {
              max-height: 50px;
              margin-bottom: 4px;
              object-fit: contain;
            }
            .logo-placeholder {
              font-size: 28px;
              margin-bottom: 3px;
              color: #4a3e28;
            }
            .school-title {
              font-family: 'Cinzel', serif;
              font-size: 15px;
              font-weight: 800;
              color: #4a3e28;
              letter-spacing: 1.5px;
              margin-bottom: 1px;
              text-transform: uppercase;
            }
            .cert-title {
              font-family: 'Cinzel', serif;
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 3px;
              margin: 4px 0 2px;
              color: #6e5a3c;
              text-transform: uppercase;
              border-bottom: 2px double #6e5a3c;
              display: inline-block;
              padding-bottom: 2px;
            }
            .cert-subtitle {
              font-size: 8px;
              color: #777;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .cert-body {
              font-size: 16.5px;
              line-height: 1.8;
              text-align: justify;
              margin: 8px 0;
              white-space: pre-line;
              text-indent: 30px;
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 6;
              -webkit-box-orient: vertical;
              text-overflow: ellipsis;
            }
            /* Robust handles for name or academic inline-block scaling */
            .cert-body span.highlight, .cert-body strong.highlight {
              display: inline-block;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              vertical-align: bottom;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
              flex-shrink: 0;
            }
            .sig-block {
              text-align: center;
              width: 220px;
            }
            .sig-line {
              border-top: 1px solid #777;
              margin-top: 30px;
              padding-top: 6px;
              font-family: 'Cinzel', serif;
              font-size: 10px;
              font-weight: 800;
              color: #4a3e28;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            @media print {
              body {
                background: none;
                padding: 0;
              }
              .certificate-container {
                margin: 0;
                width: 297mm;
                height: 210mm;
                max-width: 100vw;
                max-height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <div class="border-outer">
              <div class="border-inner">
                <div class="badge-watermark">🎓</div>
                <div class="content-wrapper">
                  <div class="header">
                    ${template.logo_url ? `<img class="logo" src="${template.logo_url}" alt="School Logo" />` : '<div class="logo-placeholder">🎓</div>'}
                    <div class="school-title">${schoolName}</div>
                    <div class="cert-title">${template.title}</div>
                    <div class="cert-subtitle">Official Institution Release Document</div>
                  </div>
                  <div class="cert-body">
                    ${compiledBody}
                  </div>
                  <div class="footer">
                    <div class="sig-block">
                      <div style="font-size: 13px; color: #555; text-align: left;">
                        <strong>Date:</strong> ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <div class="sig-block">
                      <div class="sig-line">${template.signature_title}</div>
                    </div>
                  </div>
                </div>
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

  // Print Admission Form
  function handlePrintAdmissionForm() {
    const win = window.open('', '_blank')
    if (!win) return

    const studentInfo = admissionFormMode === 'student' && selectedStudent ? selectedStudent : null;

    win.document.write(`
      <html>
        <head>
          <title>Admission Form - ${studentInfo ? studentInfo.name : 'Blank'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #222;
              margin: 30px;
              padding: 0;
              font-size: 13.5px;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .logo-cell {
              width: 80px;
              text-align: center;
            }
            .title-cell {
              text-align: center;
              vertical-align: middle;
            }
            .photo-box {
              width: 110px;
              height: 130px;
              border: 1px solid #777;
              text-align: center;
              font-size: 10px;
              color: #666;
              vertical-align: middle;
              display: table-cell;
            }
            .photo-wrapper {
              display: inline-block;
              width: 110px;
              height: 130px;
              vertical-align: top;
            }
            .section-header {
              background: #f0f0f0;
              padding: 6px 10px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
              border-left: 5px solid #2c3e50;
              margin: 20px 0 10px 0;
            }
            .form-grid {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .form-grid td {
              padding: 8px 5px;
              vertical-align: bottom;
            }
            .form-grid td.label {
              width: 180px;
              color: #444;
              font-weight: 600;
            }
            .form-grid td.underline {
              border-bottom: 1px solid #999;
              font-weight: bold;
              font-size: 14.5px;
            }
            .checkbox-group {
              display: inline-block;
              margin-right: 15px;
            }
            .footer-signatures {
              margin-top: 50px;
              width: 100%;
              border-collapse: collapse;
            }
            .footer-signatures td {
              text-align: center;
              width: 33%;
              vertical-align: bottom;
              padding-top: 60px;
            }
            .sig-line {
              border-top: 1px solid #888;
              width: 80%;
              margin: 0 auto;
              padding-top: 5px;
              font-weight: bold;
              font-size: 11px;
              color: #555;
            }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-cell">
                <span style="font-size: 40px;">🏫</span>
              </td>
              <td class="title-cell">
                <div style="font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${schoolName}</div>
                <div style="font-size: 15px; font-weight: bold; color: #555; margin-top: 4px; letter-spacing: 2px;">STUDENT ADMISSION FORM</div>
                <div style="font-size: 11px; color: #777; margin-top: 2px;">Official Registration Record</div>
              </td>
              <td style="width: 120px; text-align: right;">
                <div class="photo-wrapper">
                  <div class="photo-box">
                    ${studentInfo ? '<br/><br/><br/>PHOTO ATTACHED' : '<br/><br/>PASTE<br/>PASSPORT SIZE<br/>PHOTO HERE'}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <div class="section-header">Academic Details</div>
          <table class="form-grid">
            <tr>
              <td class="label">Admission Number:</td>
              <td class="underline">${studentInfo ? studentInfo.roll_no || '—' : '___________________________'}</td>
              <td class="label" style="padding-left: 20px;">Class Applied for:</td>
              <td class="underline">${studentInfo ? studentInfo.class_name || '—' : '___________________________'}</td>
            </tr>
            <tr>
              <td class="label">Section / Group:</td>
              <td class="underline">${studentInfo ? studentInfo.section_name || '—' : '___________________________'}</td>
              <td class="label" style="padding-left: 20px;">Admission Date:</td>
              <td class="underline">${studentInfo ? new Date(studentInfo.reg_date).toLocaleDateString() : '___________________________'}</td>
            </tr>
          </table>

          <div class="section-header">Personal Information (Student)</div>
          <table class="form-grid">
            <tr>
              <td class="label">Full Name of Student:</td>
              <td class="underline" colspan="3">${studentInfo ? studentInfo.name : '__________________________________________________________________________'}</td>
            </tr>
            <tr>
              <td class="label">Father's Name:</td>
              <td class="underline" colspan="3">${studentInfo ? studentInfo.father_name : '__________________________________________________________________________'}</td>
            </tr>
            <tr>
              <td class="label">Date of Birth (DOB):</td>
              <td class="underline">${studentInfo ? (studentInfo.dob ? new Date(studentInfo.dob).toLocaleDateString() : '—') : '___________________________'}</td>
              <td class="label" style="padding-left: 20px;">Gender:</td>
              <td class="underline">
                ${studentInfo ? studentInfo.gender : '⬜ Male &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⬜ Female &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⬜ Other'}
              </td>
            </tr>
            <tr>
              <td class="label">Contact / Phone Number:</td>
              <td class="underline">${studentInfo ? studentInfo.contact || '—' : '___________________________'}</td>
              <td class="label" style="padding-left: 20px;">Emergency Contact:</td>
              <td class="underline">___________________________</td>
            </tr>
            <tr>
              <td class="label">Residential Address:</td>
              <td class="underline" colspan="3">${studentInfo ? studentInfo.address || '—' : '__________________________________________________________________________'}</td>
            </tr>
          </table>

          <div class="section-header">Parent / Guardian Undertaking</div>
          <p style="font-size: 11.5px; line-height: 1.5; color: #555; text-align: justify; margin: 10px 5px 20px 5px;">
            I hereby certify that all information submitted in this registration process is correct and complete. I agree to abide by the rules, code of conduct, and fee regulations set by the administration of ${schoolName}. I verify that the date of birth and spelling of name entered above are correct and will not be requested for change later.
          </p>

          <table class="footer-signatures">
            <tr>
              <td>
                <div class="sig-line">Date of Submission</div>
              </td>
              <td>
                <div class="sig-line">Signature of Parent / Guardian</div>
              </td>
              <td>
                <div class="sig-line">Principal Signature / Seal</div>
              </td>
            </tr>
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

  // Print Award List
  function handlePrintAwardList() {
    if (!awardClass || !awardExam) return
    const win = window.open('', '_blank')
    if (!win) return

    const className = classes.find(c => c.id === awardClass)?.name || 'Class'
    const sectionName = awardSection ? (sections.find(s => s.id === awardSection)?.name || '') : 'All Sections'
    const examName = examTypes.find(e => e.id === awardExam)?.name || 'Examination'
    const subjectName = awardSubject ? (subjects.find(s => s.id === awardSubject)?.name || '') : 'All Subjects'

    // Sort students by roll no (or name if roll no missing)
    const filteredStudents = students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection))
    filteredStudents.sort((a, b) => {
      const aRoll = Number(a.roll_no) || 9999
      const bRoll = Number(b.roll_no) || 9999
      if (aRoll !== bRoll) return aRoll - bRoll
      return a.name.localeCompare(b.name)
    })

    const rowsHTML = filteredStudents.map((s, idx) => {
      const resultObj = awardResults.find(r => r.student_id === s.id)
      const obtained = resultObj ? resultObj.marks_obtained : ''
      const total = resultObj ? resultObj.total_marks : ''
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.roll_no || '—'}</td>
          <td class="student-name">${s.name}</td>
          <td>${obtained !== '' ? obtained : ' &nbsp; '}</td>
          <td>${total !== '' ? total : ' &nbsp; '}</td>
          <td> &nbsp; </td>
          <td> &nbsp; </td>
        </tr>
      `
    }).join('')

    win.document.write(`
      <html>
        <head>
          <title>Award List - Class ${className} - ${examName}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #111;
              margin: 30px;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 3px double #222;
              padding-bottom: 12px;
            }
            .school-name {
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sheet-title {
              font-size: 15px;
              font-weight: bold;
              margin-top: 5px;
              letter-spacing: 1px;
              color: #444;
            }
            .meta-table {
              width: 100%;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .meta-table td {
              padding: 4px 0;
            }
            .meta-table td.bold {
              font-weight: bold;
            }
            .award-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-bottom: 30px;
            }
            .award-table th, .award-table td {
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
            }
            .award-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11.5px;
            }
            .award-table td.student-name {
              text-align: left;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .sig-block {
              text-align: center;
              width: 250px;
            }
            .sig-line {
              border-top: 1.5px solid #222;
              margin-top: 50px;
              padding-top: 5px;
              font-size: 12px;
              font-weight: bold;
            }
            @media print {
              body { margin: 15px; }
              .award-table th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolName}</div>
            <div class="sheet-title">EXAMINATION AWARD LIST</div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 12%">Class:</td>
              <td class="bold" style="width: 28%">${className}</td>
              <td style="width: 12%">Exam:</td>
              <td class="bold" style="width: 48%">${examName}</td>
            </tr>
            <tr>
              <td>Section:</td>
              <td class="bold">${sectionName}</td>
              <td>Subject:</td>
              <td class="bold">${subjectName || 'All Subjects'}</td>
            </tr>
            <tr>
              <td>Date:</td>
              <td class="bold">${new Date().toLocaleDateString()}</td>
              <td>Total Registered:</td>
              <td class="bold">${filteredStudents.length} Students</td>
            </tr>
          </table>

          <table class="award-table">
            <thead>
              <tr>
                <th style="width: 6%">S.No</th>
                <th style="width: 10%">Roll No</th>
                <th style="width: 32%">Student Name</th>
                <th style="width: 13%">Marks Obt.</th>
                <th style="width: 13%">Max Marks</th>
                <th style="width: 13%">Marks in Words</th>
                <th style="width: 13%">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || '<tr><td colspan="7" style="padding: 20px; color: #555;">No registered students found in the selected class and section.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-block">
              <div class="sig-line">Subject Teacher Signature</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">Examiner / Controller Signature</div>
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

  // Pre-compiled live preview text
  const compiledPreviewBody = selectedStudent ? compileTemplate(template.body_text, selectedStudent) : ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Workspace Sub-sidebar */}
      <aside style={{ width: '240px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>📜 Documents Hub</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Generate certificates & forms</p>
        </div>
        <nav style={{ flex: 1, padding: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.5rem 0.75rem', letterSpacing: '0.5px' }}>Certificates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <button className={`nav-item ${activeDoc === 'slc' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('slc')}>
              <span style={{ marginRight: '0.5rem' }}>📜</span> Leaving Certificate (SLC)
            </button>
            <button className={`nav-item ${activeDoc === 'birth' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('birth')}>
              <span style={{ marginRight: '0.5rem' }}>👶</span> Birth Certificate (BTH)
            </button>
            <button className={`nav-item ${activeDoc === 'character' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('character')}>
              <span style={{ marginRight: '0.5rem' }}>🎖️</span> Character Certificate
            </button>
            <button className={`nav-item ${activeDoc === 'sports' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('sports')}>
              <span style={{ marginRight: '0.5rem' }}>🏆</span> Sports Certificate
            </button>
            <button className={`nav-item ${activeDoc === 'top_positions' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('top_positions')}>
              <span style={{ marginRight: '0.5rem' }}>🥇</span> Top 3 Positions Cert
            </button>
          </div>
          
          <div style={{ height: '1.25rem' }} />
          
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.5rem 0.75rem', letterSpacing: '0.5px' }}>Official Forms</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <button className={`nav-item ${activeDoc === 'admission' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('admission')}>
              <span style={{ marginRight: '0.5rem' }}>📝</span> Admission Form
            </button>
            <button className={`nav-item ${activeDoc === 'award_list' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('award_list')}>
              <span style={{ marginRight: '0.5rem' }}>📊</span> Marks Award List
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Workspace Body */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        
        {/* Module Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.2rem' }}>
            {activeDoc === 'slc' && '📜 School Leaving Certificate (SLC)'}
            {activeDoc === 'birth' && '👶 Birth Certificate (BTH)'}
            {activeDoc === 'character' && '🎖️ Character Certificate'}
            {activeDoc === 'sports' && '🏆 Sports Achievement Certificate'}
            {activeDoc === 'top_positions' && '🥇 Academic Top Positions Certificate'}
            {activeDoc === 'admission' && '📝 Student Admission Form'}
            {activeDoc === 'award_list' && '📊 Examination Award List Sheet'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {activeDoc === 'slc' && 'Customize default templates and print official release papers.'}
            {activeDoc === 'birth' && 'Record and generate formal proof of birth documents.'}
            {activeDoc === 'character' && 'Generate certified student character evaluations and conduct ratings.'}
            {activeDoc === 'sports' && 'Award students for tournament excellence and sports participation.'}
            {activeDoc === 'top_positions' && 'Honor academic excellence in class final, mid or monthly tests.'}
            {activeDoc === 'admission' && 'Print blank or prefilled student registration templates.'}
            {activeDoc === 'award_list' && 'Create examiner grade tables with student indices for marking sheets.'}
          </p>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '1000px' }}>
            {msg.text}
          </div>
        )}

        {/* Tab Selection (only for customizable certificates) */}
        {activeDoc !== 'admission' && activeDoc !== 'award_list' && (
          <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
            <button className={`tab-btn ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
              ⚡ Generate Document
            </button>
            <button className={`tab-btn ${tab === 'template' ? 'active' : ''}`} onClick={() => setTab('template')}>
              ⚙️ Customize Template
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            ⏳ Loading workspace configurations and record indices...
          </div>
        ) : (
          <>
            {/* ── GENERATE VIEW ── */}
            {tab === 'generate' && activeDoc !== 'admission' && activeDoc !== 'award_list' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                
                {/* Inputs card */}
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Variables & Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div className="form-group">
                      <label className="form-label">Select Student *</label>
                      {students.length === 0 ? (
                        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ No active students registered in database.</p>
                      ) : (
                        <select className="form-select" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Roll: {s.roll_no || '—'}) - {s.class_name || '—'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* SLC fields */}
                    {activeDoc === 'slc' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Leaving Date *</label>
                          <input type="date" className="form-input" value={leavingDate} onChange={e => setLeavingDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Reason for Leaving *</label>
                          <input type="text" className="form-input" value={leavingReason} onChange={e => setLeavingReason(e.target.value)} placeholder="e.g. Completed school term / Relocation" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Conduct & Behavior *</label>
                          <input type="text" className="form-input" value={conduct} onChange={e => setConduct(e.target.value)} placeholder="e.g. Excellent / Exemplary" />
                        </div>
                      </>
                    )}

                    {/* Birth Certificate fields */}
                    {activeDoc === 'birth' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Place of Birth *</label>
                          <input type="text" className="form-input" value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="e.g. Swat, KP, Pakistan" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Register Entry Number *</label>
                          <input type="text" className="form-input" value={birthRegisterNo} onChange={e => setBirthRegisterNo(e.target.value)} placeholder="e.g. B-4529" />
                        </div>
                      </>
                    )}

                    {/* Character Certificate fields */}
                    {activeDoc === 'character' && (
                      <div className="form-group">
                        <label className="form-label">Conduct Evaluation *</label>
                        <select className="form-select" value={conduct} onChange={e => setConduct(e.target.value)}>
                          <option value="Excellent">Excellent</option>
                          <option value="Exemplary">Exemplary</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Satisfactory">Satisfactory</option>
                        </select>
                      </div>
                    )}

                    {/* Sports Certificate fields */}
                    {activeDoc === 'sports' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Sport Name *</label>
                          <input type="text" className="form-input" value={sportName} onChange={e => setSportName(e.target.value)} placeholder="e.g. Football / Cricket" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Achievement Role *</label>
                          <input type="text" className="form-input" value={sportAchievement} onChange={e => setSportAchievement(e.target.value)} placeholder="e.g. Winner / Runner-up / Best Player" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tournament / Event Title *</label>
                          <input type="text" className="form-input" value={sportEventName} onChange={e => setSportEventName(e.target.value)} placeholder="e.g. Annual Inter-School Championship" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Event Date *</label>
                          <input type="date" className="form-input" value={sportDate} onChange={e => setSportDate(e.target.value)} />
                        </div>
                      </>
                    )}

                    {/* Top Positions fields */}
                    {activeDoc === 'top_positions' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Position Secured *</label>
                          <select className="form-select" value={topPosition} onChange={e => setTopPosition(e.target.value)}>
                            <option value="1st">1st Position</option>
                            <option value="2nd">2nd Position</option>
                            <option value="3rd">3rd Position</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Exam Name *</label>
                          <input type="text" className="form-input" value={topExamName} onChange={e => setTopExamName(e.target.value)} placeholder="e.g. Mid-Term Examination 2026" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Marks Obtained *</label>
                            <input type="number" className="form-input" value={topMarksObtained} onChange={e => setTopMarksObtained(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Total Marks *</label>
                            <input type="number" className="form-input" value={topTotalMarks} onChange={e => setTopTotalMarks(e.target.value)} />
                          </div>
                        </div>
                      </>
                    )}

                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }} onClick={handlePrintCertificate} disabled={!selectedStudentId}>
                      🖨️ Print Custom Document
                    </button>
                  </div>
                </div>

                {/* Preview card */}
                <div className="card" style={{ background: '#faf6f0', border: '1px solid #d4c5b3', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontWeight: 700, color: '#4a3e28', marginBottom: '1.25rem', borderBottom: '1px solid #d4c5b3', paddingBottom: '0.5rem' }}>
                    Document Live Preview
                  </h3>
                  
                  {selectedStudent ? (
                    <div style={{ 
                      border: '4px double #6e5a3c', 
                      padding: '1.5rem 2rem', 
                      background: '#fff', 
                      color: '#2c2c2c', 
                      fontFamily: 'Georgia, serif', 
                      lineHeight: '1.7', 
                      fontSize: '0.9rem',
                      aspectRatio: '1.414 / 1',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: '0.4rem', flexShrink: 0 }}>
                        {template.logo_url ? (
                          <img src={template.logo_url} alt="Logo" style={{ maxHeight: '40px', marginBottom: '3px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontSize: '1.8rem', marginBottom: '2px' }}>🎓</div>
                        )}
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a3e28', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {schoolName}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px', color: '#6e5a3c', margin: '3px 0 1px', textTransform: 'uppercase', borderBottom: '1px solid #eaeaea', display: 'inline-block', paddingBottom: '2px' }}>
                          {template.title || 'CERTIFICATE'}
                        </div>
                        <div style={{ fontSize: '0.52rem', color: '#777', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Official Institution Release Document
                        </div>
                      </div>

                      <div style={{ 
                        margin: '1rem 0', 
                        textAlign: 'justify', 
                        whiteSpace: 'pre-line', 
                        flex: '1 1 auto', 
                        minHeight: 0, 
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        textOverflow: 'ellipsis'
                      }}>
                        {compiledPreviewBody}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: '#555' }}>
                          <strong>Date:</strong> {new Date().toLocaleDateString()}
                        </div>
                        <div style={{ textAlign: 'center', borderTop: '1px solid #777', width: '140px', paddingTop: '4px', fontSize: '0.78rem', fontWeight: 'bold', color: '#4a3e28' }}>
                          {template.signature_title}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                      Select a student to see the live compiled document preview.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── CUSTOMIZE TEMPLATE VIEW ── */}
            {tab === 'template' && activeDoc !== 'admission' && activeDoc !== 'award_list' && (
              <div className="card" style={{ maxWidth: '800px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚙️ Configure Certificate Body</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Define headings and rich text certificate variables inside curly brackets to merge student details dynamically on generation.
                </p>

                <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  
                  <div className="form-group">
                    <label className="form-label">School Logo (Upload from device)</label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label className="btn btn-secondary btn-sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        📁 Choose Logo Image
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
                              if (!validTypes.includes(file.type)) {
                                alert('Please upload a PNG, JPG, or JPEG image file.')
                                return
                              }
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const result = event.target?.result
                                if (typeof result === 'string') {
                                  setLogoUrlForm(result)
                                }
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                      {logoUrlForm ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <img src={logoUrlForm} alt="Preview Logo" style={{ maxHeight: '36px', maxWidth: '36px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logo Uploaded</span>
                          <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setLogoUrlForm('')}>
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No logo selected</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Certificate Title *</label>
                    <input type="text" className="form-input" value={titleForm} onChange={e => setTitleForm(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Certificate Customizable Body Text *</label>
                    <textarea 
                      className="form-input" 
                      style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6', padding: '0.75rem' }} 
                      value={bodyTextForm} 
                      onChange={e => setBodyTextForm(e.target.value)} 
                      required 
                    />
                    
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.65rem' }}>
                      {/* Shared tags */}
                      {['{name}', '{father_name}', '{class_name}', '{roll_no}', '{dob}', '{gender}', '{address}', '{reg_date}'].map(tag => (
                        <button key={tag} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setBodyTextForm(prev => prev + tag)}>
                          {tag}
                        </button>
                      ))}
                      
                      {/* SLC tags */}
                      {activeDoc === 'slc' && ['{leaving_date}', '{leaving_reason}', '{conduct}'].map(tag => (
                        <button key={tag} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#0093cb12', borderColor: '#0093cb25', color: '#0093cb' }} onClick={() => setBodyTextForm(prev => prev + tag)}>
                          {tag}
                        </button>
                      ))}

                      {/* Birth tags */}
                      {activeDoc === 'birth' && ['{dob_words}', '{birth_place}', '{register_no}'].map(tag => (
                        <button key={tag} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#10b98112', borderColor: '#10b98125', color: '#10b981' }} onClick={() => setBodyTextForm(prev => prev + tag)}>
                          {tag}
                        </button>
                      ))}

                      {/* Sports tags */}
                      {activeDoc === 'sports' && ['{sport_name}', '{achievement}', '{event_name}', '{date}'].map(tag => (
                        <button key={tag} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f59e0b12', borderColor: '#f59e0b25', color: '#f59e0b' }} onClick={() => setBodyTextForm(prev => prev + tag)}>
                          {tag}
                        </button>
                      ))}

                      {/* Top Position tags */}
                      {activeDoc === 'top_positions' && ['{position}', '{exam_name}', '{marks_obtained}', '{total_marks}', '{percentage}'].map(tag => (
                        <button key={tag} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#8b5cf612', borderColor: '#8b5cf625', color: '#8b5cf6' }} onClick={() => setBodyTextForm(prev => prev + tag)}>
                          {tag}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                      💡 Tip: Click tags above to append them into template editor cursor position.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Signature Title *</label>
                    <input type="text" className="form-input" value={signatureTitleForm} onChange={e => setSignatureTitleForm(e.target.value)} required />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={savingTemplate}>
                    {savingTemplate ? '⏳ Saving Custom Config...' : '💾 Save Template config'}
                  </button>
                </form>
              </div>
            )}

            {/* ── ADMISSION FORM VIEW ── */}
            {activeDoc === 'admission' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Admission Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div className="form-group">
                      <label className="form-label">Form Record Mode</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={`btn ${admissionFormMode === 'blank' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setAdmissionFormMode('blank')}>
                          📄 Blank Form
                        </button>
                        <button className={`btn ${admissionFormMode === 'student' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setAdmissionFormMode('student')}>
                          👤 Prefill Student
                        </button>
                      </div>
                    </div>

                    {admissionFormMode === 'student' && (
                      <div className="form-group animate-fade">
                        <label className="form-label">Select Registered Student</label>
                        {students.length === 0 ? (
                          <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ No students registered.</p>
                        ) : (
                          <select className="form-select" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} - {s.class_name || '—'}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }} onClick={handlePrintAdmissionForm}>
                      🖨️ Print Admission Form
                    </button>
                  </div>
                </div>

                {/* Admission Form Preview */}
                <div className="card" style={{ background: '#fcfcfc', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', color: '#111' }}>
                  <h3 style={{ fontWeight: 700, color: '#333', marginBottom: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
                    Form Sheet Preview
                  </h3>

                  <div style={{ border: '1px solid #777', padding: '1.5rem', background: '#fff', fontSize: '0.75rem', fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{schoolName}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#555', marginTop: '2px' }}>STUDENT ADMISSION FORM</div>
                      </div>
                      <div style={{ width: '70px', height: '85px', border: '1px solid #888', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '7px', color: '#666' }}>
                        {admissionFormMode === 'student' && selectedStudent ? 'PHOTO ATTACHED' : 'PASSPORT PHOTO'}
                      </div>
                    </div>

                    {/* Grid info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}><strong>Student Name:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.name : '________________________'}</div>
                        <div style={{ flex: 1 }}><strong>Class Applied:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.class_name || '—' : '________________________'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}><strong>Father\'s Name:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.father_name : '________________________'}</div>
                        <div style={{ flex: 1 }}><strong>Section:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.section_name || '—' : '________________________'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}><strong>Date of Birth:</strong> {admissionFormMode === 'student' && selectedStudent && selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '____/____/________'}</div>
                        <div style={{ flex: 1 }}><strong>Gender:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.gender : '⬜ M  &nbsp; ⬜ F'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}><strong>Contact Number:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.contact || '—' : '________________________'}</div>
                        <div style={{ flex: 1 }}><strong>Admission Date:</strong> {admissionFormMode === 'student' && selectedStudent ? new Date(selectedStudent.reg_date).toLocaleDateString() : '____/____/________'}</div>
                      </div>
                      <div><strong>Address:</strong> {admissionFormMode === 'student' && selectedStudent ? selectedStudent.address || '—' : '____________________________________________________________________'}</div>
                    </div>

                    <div style={{ borderTop: '1px solid #ddd', marginTop: '2.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#555', fontWeight: 'bold' }}>
                      <div style={{ borderTop: '1px solid #777', width: '100px', textAlign: 'center', paddingTop: '3px' }}>PARENT SIGNATURE</div>
                      <div style={{ borderTop: '1px solid #777', width: '100px', textAlign: 'center', paddingTop: '3px' }}>PRINCIPAL VERIFICATION</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MARKS AWARD LIST VIEW ── */}
            {activeDoc === 'award_list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
                
                {/* Filters card */}
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Award List Selection</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                    
                    <div className="form-group">
                      <label className="form-label">Class *</label>
                      <select className="form-select" value={awardClass} onChange={e => { setAwardClass(e.target.value); setAwardSection(''); setAwardSubject('') }}>
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Section (Optional)</label>
                      <select className="form-select" value={awardSection} onChange={e => setAwardSection(e.target.value)} disabled={!awardClass}>
                        <option value="">All Sections</option>
                        {sections.filter(s => s.class_id === awardClass).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject (Optional)</label>
                      <select className="form-select" value={awardSubject} onChange={e => setAwardSubject(e.target.value)} disabled={!awardClass}>
                        <option value="">All Subjects</option>
                        {subjects.filter(s => s.class_id === awardClass).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Exam Type *</label>
                      <select className="form-select" value={awardExam} onChange={e => setAwardExam(e.target.value)}>
                        <option value="">Select Exam</option>
                        {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>

                  </div>
                </div>

                {/* Grade Table card */}
                {awardClass && awardExam ? (
                  <div className="card animate-fade">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 700 }}>Sheet Preview</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Showing students in {classes.find(c => c.id === awardClass)?.name} &nbsp;•&nbsp; Exam: {examTypes.find(e => e.id === awardExam)?.name}
                        </p>
                      </div>
                      <button className="btn btn-primary" onClick={handlePrintAwardList}>
                        🖨️ Print Official Sheet
                      </button>
                    </div>

                    {awardLoading ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        ⏳ Fetching student marks records...
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: '80px' }}>S.No</th>
                              <th style={{ width: '120px' }}>Roll No</th>
                              <th>Student Name</th>
                              <th style={{ width: '150px' }}>Marks Obt.</th>
                              <th style={{ width: '150px' }}>Max Marks</th>
                              <th>Examiner Marks Sign</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection)).length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                  No registered student rows found for this filter selection.
                                </td>
                              </tr>
                            ) : (
                              students
                                .filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection))
                                .map((s, idx) => {
                                  const res = awardResults.find(r => r.student_id === s.id)
                                  return (
                                    <tr key={s.id}>
                                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                      <td style={{ fontWeight: 'bold' }}>{s.roll_no || '—'}</td>
                                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                                      <td>
                                        <div style={{ padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-base)', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>
                                          {res ? res.marks_obtained : '—'}
                                        </div>
                                      </td>
                                      <td>
                                        <div style={{ padding: '0.4rem', border: '1px dashed var(--border)', background: 'var(--bg-base)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                          {res ? res.total_marks : '—'}
                                        </div>
                                      </td>
                                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                        Pending signature
                                      </td>
                                    </tr>
                                  )
                                })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Select Class and Exam Type filters above to generate the examiner award list grade sheet.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
