'use client'
import { useState, useEffect, useCallback, Fragment } from 'react'

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
  additional_info?: Record<string, any>
  photo_url?: string
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

type DocType = 'slc' | 'birth' | 'character' | 'sports' | 'top_positions' | 'admission' | 'award_list' | 'progress_report'
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
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('')
  const [defaultSchoolLogo, setDefaultSchoolLogo] = useState('')
  const [schoolContact, setSchoolContact] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolPsra, setSchoolPsra] = useState('')
  const [schoolBise, setSchoolBise] = useState('')

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

  // Progress Report specific states
  const [progressReportMode, setProgressReportMode] = useState<'blank' | 'student'>('blank')

  // Award List specific states
  const [awardClass, setAwardClass] = useState('')
  const [awardSection, setAwardSection] = useState('')
  const [awardSubject, setAwardSubject] = useState('')
  const [awardExam, setAwardExam] = useState('')
  const [awardTotalMarks, setAwardTotalMarks] = useState('100')
  const [awardLoading, setAwardLoading] = useState(false)
  const [awardResults, setAwardResults] = useState<any[]>([])

  // Load basic lists
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsRes, classesRes, subjectsRes, examsRes, templateRes] = await Promise.all([
        fetch('/api/school/students').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/subjects').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/results').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=slc').then(r => r.json()).catch(() => ({})),
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

      if (templateRes.schoolLogo) {
        setDefaultSchoolLogo(templateRes.schoolLogo)
      }
      if (templateRes.template?.logo_url) {
        setSchoolLogoUrl(templateRes.template.logo_url)
      } else if (templateRes.schoolLogo) {
        setSchoolLogoUrl(templateRes.schoolLogo)
      }
      if (templateRes.schoolName) {
        setSchoolName(templateRes.schoolName)
      }
      if (templateRes.schoolContact) {
        setSchoolContact(templateRes.schoolContact)
      }
      if (templateRes.schoolAddress) {
        setSchoolAddress(templateRes.schoolAddress)
      }
      if (templateRes.schoolPsra) {
        setSchoolPsra(templateRes.schoolPsra)
      }
      if (templateRes.schoolBise) {
        setSchoolBise(templateRes.schoolBise)
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error loading workspace metadata' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load certificate template when activeDoc changes
  const loadTemplate = useCallback(async (type: string) => {
    if (type === 'admission' || type === 'award_list' || type === 'progress_report') return
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
        if (data.schoolLogo) {
          setDefaultSchoolLogo(data.schoolLogo)
        }
        if (data.schoolContact) {
          setSchoolContact(data.schoolContact)
        }
        if (data.schoolAddress) {
          setSchoolAddress(data.schoolAddress)
        }
        if (data.schoolPsra) {
          setSchoolPsra(data.schoolPsra)
        }
        if (data.schoolBise) {
          setSchoolBise(data.schoolBise)
        }
        if (data.template.logo_url) {
          setSchoolLogoUrl(data.template.logo_url)
        } else if (data.schoolLogo) {
          setSchoolLogoUrl(data.schoolLogo)
        } else {
          setSchoolLogoUrl('')
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
        const results = data.results || []
        setAwardResults(results)
        if (results.length > 0) {
          setAwardTotalMarks(String(results[0].total_marks || '100'))
        } else {
          setAwardTotalMarks('100')
        }
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

  // Helper for rendering name and text in block letters
  function getBlockLettersHtml(text: string, count: number = 25) {
    const chars = (text || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split('')
    let html = '<div style="display: inline-flex; border: 1px solid #1e3a8a; background: #fff;">'
    for (let i = 0; i < count; i++) {
      const char = chars[i] || ''
      const isLast = i === count - 1
      html += `
        <div style="
          width: 20px; 
          height: 24px; 
          border-right: ${isLast ? 'none' : '1px solid #1e3a8a'}; 
          text-align: center; 
          line-height: 24px; 
          font-size: 13px; 
          font-family: monospace; 
          font-weight: bold; 
          color: #000;
        ">
          ${char === ' ' ? '&nbsp;' : char}
        </div>
      `
    }
    html += '</div>'
    return html
  }

  // Helper for CNIC formatted boxes
  function getCnicHtml(nic: string) {
    const digits = (nic || '').replace(/[^0-9]/g, '').split('')
    let html = '<div style="display: inline-flex; align-items: center; gap: 3px;">'
    
    // Segment 1: 5 digits
    html += '<div style="display: inline-flex; border: 1px solid #1e3a8a; background: #fff;">'
    for (let i = 0; i < 5; i++) {
      const digit = digits[i] || ''
      const isLast = i === 4
      html += `
        <div style="
          width: 20px; 
          height: 24px; 
          border-right: ${isLast ? 'none' : '1px solid #1e3a8a'}; 
          text-align: center; 
          line-height: 24px; 
          font-size: 13px; 
          font-family: monospace; 
          font-weight: bold; 
          color: #000;
        ">${digit}</div>
      `
    }
    html += '</div>'
    
    // Dash
    html += '<span style="font-weight: bold; color: #1e3a8a; padding: 0 1px; font-size: 16px;">-</span>'
    
    // Segment 2: 7 digits
    html += '<div style="display: inline-flex; border: 1px solid #1e3a8a; background: #fff;">'
    for (let i = 5; i < 12; i++) {
      const digit = digits[i] || ''
      const isLast = i === 11
      html += `
        <div style="
          width: 20px; 
          height: 24px; 
          border-right: ${isLast ? 'none' : '1px solid #1e3a8a'}; 
          text-align: center; 
          line-height: 24px; 
          font-size: 13px; 
          font-family: monospace; 
          font-weight: bold; 
          color: #000;
        ">${digit}</div>
      `
    }
    html += '</div>'
    
    // Dash
    html += '<span style="font-weight: bold; color: #1e3a8a; padding: 0 1px; font-size: 16px;">-</span>'
    
    // Segment 3: 1 digit
    html += `
      <div style="display: inline-flex; border: 1px solid #1e3a8a; background: #fff;">
        <div style="
          width: 20px; 
          height: 24px; 
          text-align: center; 
          line-height: 24px; 
          font-size: 13px; 
          font-family: monospace; 
          font-weight: bold; 
          color: #000;
        ">${digits[12] || ''}</div>
      </div>
    `
    
    html += '</div>'
    return html
  }

  // Helper for DOB Figure box
  function getDobFigureHtml(dobStr?: string) {
    let val = ''
    if (dobStr) {
      try {
        const date = new Date(dobStr)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        val = `${day} - ${month} - ${year}`
      } catch {
        val = dobStr
      }
    }
    return `
      <div style="
        display: inline-block; 
        border: 1px solid #1e3a8a; 
        border-radius: 12px; 
        padding: 0 15px; 
        height: 26px; 
        line-height: 26px; 
        font-size: 13px; 
        font-family: monospace; 
        font-weight: bold; 
        background: #fff;
        color: #000;
        text-align: center;
        min-width: 155px;
      ">
        ${val || '&nbsp;'}
      </div>
    `
  }

  // Helper for rounded inputs
  function getRoundedTextBoxHtml(text: string, minWidth: string = '100%') {
    return `
      <div style="
        display: inline-block; 
        border: 1px solid #1e3a8a; 
        border-radius: 12px; 
        padding: 0 12px; 
        height: 26px; 
        line-height: 26px; 
        font-size: 13px; 
        background: #fff;
        color: #000;
        min-width: ${minWidth};
        box-sizing: border-box;
        vertical-align: middle;
      ">
        ${text || '&nbsp;'}
      </div>
    `
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
          setSchoolLogoUrl(data.template.logo_url || data.schoolLogo || defaultSchoolLogo || '')
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
              margin-bottom: 15px;
              flex-shrink: 0;
            }
            .logo {
              max-height: 80px;
              margin-bottom: 12px;
              object-fit: contain;
            }
            .logo-placeholder {
              font-size: 45px;
              margin-bottom: 10px;
              color: #4a3e28;
            }
            .school-title {
              font-family: 'Cinzel', serif;
              font-size: 24px;
              font-weight: 800;
              color: #4a3e28;
              letter-spacing: 2px;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .cert-title {
              font-family: 'Cinzel', serif;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: 4px;
              margin: 15px 0 5px;
              color: #6e5a3c;
              text-transform: uppercase;
              border-bottom: 3px double #6e5a3c;
              display: inline-block;
              padding-bottom: 4px;
            }
            .cert-subtitle {
              font-size: 11px;
              color: #777;
              letter-spacing: 3px;
              text-transform: uppercase;
              margin-bottom: 25px;
            }
            .cert-body {
              font-size: 20px;
              line-height: 2.0;
              text-align: justify;
              margin: 20px 0;
              white-space: pre-line;
              text-indent: 40px;
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
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
              width: 240px;
            }
            .sig-line {
              border-top: 1.5px solid #777;
              margin-top: 50px;
              padding-top: 8px;
              font-family: 'Cinzel', serif;
              font-size: 13px;
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
                    ${(template.logo_url || defaultSchoolLogo) ? `<img class="logo" src="${template.logo_url || defaultSchoolLogo}" alt="School Logo" />` : '<div class="logo-placeholder">🎓</div>'}
                    <div class="school-title">${schoolName}</div>
                    ${(schoolAddress || schoolContact) ? `
                      <div style="font-size: 11px; color: #555; text-align: center; margin-bottom: 5px; font-family: sans-serif; font-weight: bold;">
                        ${schoolAddress ? `${schoolAddress}` : ''}
                        ${schoolContact ? ` &nbsp;|&nbsp; Cell: ${schoolContact}` : ''}
                      </div>
                    ` : ''}
                    ${(schoolPsra || schoolBise) ? `
                      <div style="font-size: 10px; color: #666; text-align: center; margin-bottom: 8px; font-family: sans-serif; font-style: italic;">
                        ${schoolPsra ? `PSRA Reg No: ${schoolPsra}` : ''}
                        ${schoolBise ? `${schoolPsra ? ' &nbsp;|&nbsp; ' : ''}BISE No: ${schoolBise}` : ''}
                      </div>
                    ` : ''}
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

  function getProgressReportHtml(studentInfo: Student | null = null) {
    const sName = studentInfo ? studentInfo.name : ''
    const fName = studentInfo ? studentInfo.father_name : ''
    const sRoll = studentInfo ? studentInfo.roll_no : ''
    const sClass = studentInfo ? studentInfo.class_name : ''
    const sId = studentInfo ? studentInfo.id.slice(0, 8) : ''

    const underLine = (val: string, width: string = '100%') => `
      <span style="border-bottom: 1.5px solid #1e3a8a; display: inline-block; min-width: ${width}; font-weight: bold; color: #000; padding: 0 5px; text-align: left; vertical-align: bottom;">
        ${val || '&nbsp;'}
      </span>
    `

    const emptyBox = `<span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #1e3a8a; border-radius: 50%; vertical-align: middle; background: #fff; margin: 0 auto;"></span>`

    return `
      <div style="
        font-family: 'Arial', sans-serif;
        color: #1e3a8a;
        background-color: #fff;
        font-size: 11.5px;
        line-height: 1.35;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      ">
        <!-- Header Group -->
        <div style="display: flex; flex-direction: column; gap: 4px; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="width: 80px; display: flex; justify-content: center; align-items: center;">
              ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="Logo" style="max-height: 65px; max-width: 65px; object-fit: contain;" />` : `<div style="font-size: 40px; color: #1e3a8a;">🏫</div>`}
            </div>
            <div style="flex-grow: 1; text-align: center; padding: 0 10px;">
              <h1 style="font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px 0; color: #1e3a8a;">
                ${schoolName ? schoolName.toUpperCase() : 'THE ABU OBAIDA ISLAMIC MODEL SCHOOL'}
              </h1>
              ${(schoolAddress || schoolContact || schoolPsra || schoolBise) ? `
                <div style="font-size: 9px; font-weight: bold; color: #4b5563; margin-bottom: 2px;">
                  ${schoolAddress ? `${schoolAddress}` : ''}
                  ${schoolContact ? ` &bull; Cell: ${schoolContact}` : ''}
                </div>
                ${(schoolPsra || schoolBise) ? `
                  <div style="font-size: 8px; color: #64748b; font-style: italic; margin-bottom: 4px;">
                    ${schoolPsra ? `PSRA Reg: ${schoolPsra}` : ''}
                    ${schoolBise ? `${schoolPsra ? ' &bull; ' : ''}BISE: ${schoolBise}` : ''}
                  </div>
                ` : ''}
              ` : ''}
              <h2 style="font-size: 11px; font-weight: 800; margin: 0; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: underline;">
                STUDENT MONTHLY PROGRESS REPORT CARD
              </h2>
            </div>
            <div style="width: 80px;"></div>
          </div>
        </div>

        <!-- Student Meta Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 140px; flex-shrink: 0;">NAME OF THE STUDENT:</span>
            <span style="flex-grow: 1;">${underLine(sName, '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 100px; flex-shrink: 0;">FATHER NAME:</span>
            <span style="flex-grow: 1;">${underLine(fName, '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 60px; flex-shrink: 0;">ID NO:</span>
            <span style="flex-grow: 1;">${underLine(sId, '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 100px; flex-shrink: 0;">TEACHER NAME:</span>
            <span style="flex-grow: 1;">${underLine('', '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 60px; flex-shrink: 0;">CLASS:</span>
            <span style="flex-grow: 1;">${underLine(sClass, '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 100px; flex-shrink: 0;">MONTH/YEAR:</span>
            <span style="flex-grow: 1;">${underLine('', '100%')}</span>
          </div>
        </div>

        <!-- Skills and abilities / Attendance Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e3a8a; margin-bottom: 12px; font-size: 11px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #1e3a8a;">
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: left; width: 25%;">Attendance</th>
              <th colspan="3" style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: left;">Current Month Attendance: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; %</th>
              <th colspan="2" style="padding: 6px 8px; text-align: left;">Previous Month Attendance: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; %</th>
            </tr>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #1e3a8a;">
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: left;">Skills and abilities</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 15%;">Outstanding</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 15%;">Very Good</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 15%;">Good</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 15%;">Satisfactory</th>
              <th style="padding: 6px 8px; text-align: center; width: 15%;">Fair</th>
            </tr>
          </thead>
          <tbody>
            ${['Reading', 'Writing', 'Speaking', 'Art'].map(skill => `
              <tr style="border-bottom: 1px solid #1e3a8a;">
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; background: #fafafb;">${skill}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="padding: 6px 8px; text-align: center;">${emptyBox}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Monthly Test Report Table -->
        <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 11px;">Monthly Test Report of All Subject</div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e3a8a; margin-bottom: 12px; font-size: 11px;">
          <tbody>
            <tr style="border-bottom: 1.5px solid #1e3a8a; background: #f1f5f9; font-weight: bold;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; width: 35%;">Subject</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; width: 15%; text-align: center;">Marks Obtained</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; width: 35%;">Subject</td>
              <td style="padding: 6px 8px; width: 15%; text-align: center;">Marks Obtained</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">English</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; text-align: center;"></td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">Science</td>
              <td style="padding: 6px 8px; text-align: center;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">Math's</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; text-align: center;"></td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">physics</td>
              <td style="padding: 6px 8px; text-align: center;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">Social studies</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; text-align: center;"></td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">chemistry</td>
              <td style="padding: 6px 8px; text-align: center;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">Urdu</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; text-align: center;"></td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">biology</td>
              <td style="padding: 6px 8px; text-align: center;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold;">Islamiyat + Nazira</td>
              <td style="border-right: 1.5px solid #1e3a8a; padding: 6px 8px; text-align: center;"></td>
              <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; background: #fafafb;">Total and % age</td>
              <td style="padding: 6px 8px; text-align: center; font-weight: bold;"></td>
            </tr>
          </tbody>
        </table>

        <!-- Home Work Section -->
        <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 11px;">Home work</div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e3a8a; margin-bottom: 12px; font-size: 11px; text-align: center;">
          <tbody>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td rowspan="2" style="border-right: 1.5px solid #1e3a8a; padding: 8px; font-weight: bold; width: 15%; background: #f8fafc; text-align: left;">Home work</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; font-weight: bold; background: #fafafb; width: 15%; text-align: left;">Daily basis</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; width: 11.5%;">Monday</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; width: 11.5%;">Tuesday</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; width: 11.5%;">Wednesday</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; width: 11.5%;">Thursday</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; width: 11.5%;">Friday</td>
              <td style="padding: 4px 6px; width: 11.5%;">Saturday</td>
            </tr>
            <tr style="border-bottom: 1.5px solid #1e3a8a; height: 28px;">
              <td style="border-right: 1px solid #1e3a8a; background: #fafafb;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td></td>
            </tr>
            <tr style="border-bottom: 1px solid #1e3a8a;">
              <td rowspan="2" style="border-right: 1.5px solid #1e3a8a; padding: 8px; font-weight: bold; background: #f8fafc; text-align: left;">Weekly basis</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px; font-weight: bold; background: #fafafb; text-align: left;">Weeks</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px;">1<sup>st</sup> week</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px;">2<sup>nd</sup> week</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px;">3<sup>rd</sup> week</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px;">4<sup>th</sup> week</td>
              <td style="border-right: 1px solid #1e3a8a; padding: 4px 6px;">5<sup>th</sup> week</td>
              <td style="background: #fafafb; color: #94a3b8;">—</td>
            </tr>
            <tr style="height: 28px;">
              <td style="border-right: 1px solid #1e3a8a; background: #fafafb;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="border-right: 1px solid #1e3a8a;"></td>
              <td style="background: #fafafb;"></td>
            </tr>
          </tbody>
        </table>

        <!-- Personality and Character Section -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e3a8a; margin-bottom: 12px; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #1e3a8a;">
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: left; width: 25%;">PERSONALITY AND CHARACTER</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 18.75%;">All of the time</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 18.75%;">Often</th>
              <th style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center; width: 18.75%;">Rarely</th>
              <th style="padding: 6px 8px; text-align: center; width: 18.75%;">None of the time</th>
            </tr>
          </thead>
          <tbody>
            ${['Clean and orderly', 'Punctual', 'Attentive', 'Religious practices'].map(char => `
              <tr style="border-bottom: 1px solid #1e3a8a;">
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; background: #fafafb;">${char}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="border-right: 1px solid #1e3a8a; padding: 6px 8px; text-align: center;">${emptyBox}</td>
                <td style="padding: 6px 8px; text-align: center;">${emptyBox}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Remarks Section -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 130px; flex-shrink: 0;">TEACHER REMARKS:</span>
            <span style="flex-grow: 1;">${underLine('', '100%')}</span>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <span style="font-weight: bold; width: 140px; flex-shrink: 0;">PRINCIPAL REMARKS:</span>
            <span style="flex-grow: 1;">${underLine('', '100%')}</span>
          </div>
        </div>

        <!-- Date and Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-weight: bold; font-size: 11.5px; margin-top: 10px;">
          <div style="width: 200px;">Date: ________________________</div>
          <div style="width: 200px; text-align: center;">Teacher Signature</div>
          <div style="width: 200px; text-align: right;">Principal Signature</div>
        </div>
      </div>
    `
  }

  function handlePrintProgressReport() {
    const win = window.open('', '_blank')
    if (!win) return

    const studentInfo = progressReportMode === 'student' && selectedStudent ? selectedStudent : null;
    const bodyContent = getProgressReportHtml(studentInfo);

    win.document.write(`
      <html>
        <head>
          <title>Progress Report Form</title>
          <style>
            @page {
              size: portrait;
              margin: 10mm 15mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
            }
            .print-page {
              width: 100%;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            ${bodyContent}
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

  // Render full HTML body for admission form (shared between preview and print window)
  function getAdmissionFormHtml(studentInfo: Student | null) {
    const sName = studentInfo ? studentInfo.name : '';
    const fName = studentInfo ? studentInfo.father_name : '';
    const fNic = studentInfo ? (studentInfo.additional_info?.father_nic || studentInfo.additional_info?.father_cnic || studentInfo.additional_info?.cnic || '') : '';
    const dobFig = studentInfo ? studentInfo.dob || '' : '';
    const dobWords = studentInfo && studentInfo.dob ? convertDateToWords(studentInfo.dob) : '';
    const religion = studentInfo ? (studentInfo.additional_info?.religion || 'Islam') : '';
    const nationality = studentInfo ? (studentInfo.additional_info?.nationality || 'Pakistan') : '';
    const corrAddress = studentInfo ? studentInfo.address || '' : '';
    const postAddress = studentInfo ? (studentInfo.additional_info?.postal_address || (studentInfo.address ? 'As above' : '')) : '';
    const guardianNo = studentInfo ? studentInfo.contact || '' : '';
    const classAdmitted = studentInfo ? studentInfo.class_name || '' : '';
    const remarks = studentInfo ? (studentInfo.additional_info?.remarks || '') : '';
    const admissionNo = studentInfo ? studentInfo.roll_no || '' : '';
    const admissionDate = studentInfo ? (studentInfo.reg_date ? new Date(studentInfo.reg_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '') : '';

    // Generate grids & boxes using our local helpers
    const nameGrid = getBlockLettersHtml(sName, 25);
    const fatherGrid = getBlockLettersHtml(fName, 25);
    const nicGrid = getCnicHtml(fNic);
    const dobFigureBox = getDobFigureHtml(dobFig);
    const dobWordsBox = getRoundedTextBoxHtml(dobWords);
    const religionBox = getRoundedTextBoxHtml(religion, '120px');
    const nationalityBox = getRoundedTextBoxHtml(nationality, '150px');
    const corrAddressBox = getRoundedTextBoxHtml(corrAddress);
    const postAddressBox = getRoundedTextBoxHtml(postAddress);
    const guardianNoBox = getRoundedTextBoxHtml(guardianNo);

    // Office use boxes
    const classBox = getRoundedTextBoxHtml(classAdmitted);
    const remarksBox = getRoundedTextBoxHtml(remarks);
    const admNoBox = getRoundedTextBoxHtml(admissionNo);
    const admDateBox = getRoundedTextBoxHtml(admissionDate);

    // Seal and dynamic school name
    const sealText = schoolName ? schoolName.toUpperCase() : 'ABU OBAIDA ISLAMIC MODEL SCHOOL';

    return `
      <div class="admission-container" style="
        font-family: 'Arial', sans-serif;
        color: #1e3a8a;
        background-color: #fff;
        font-size: 13px;
        line-height: 1.4;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        padding: 0px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      ">
        <!-- Flex Item 1: Header Group -->
        <div class="header-group" style="display: flex; flex-direction: column; gap: 4px;">
          <!-- Header section -->
          <div class="header-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
            <div class="logo-container" style="width: 90px; display: flex; justify-content: center; align-items: center;">
              ${schoolLogoUrl ? `<img class="logo-img" src="${schoolLogoUrl}" alt="Logo" style="max-height: 75px; max-width: 75px; object-fit: contain;" />` : `<div class="logo-placeholder" style="font-size: 45px; color: #1e3a8a;">🏫</div>`}
            </div>
            <div class="title-container" style="flex-grow: 1; text-align: center; padding: 0 10px;">
              <h1 class="school-title" style="font-size: 19px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 3px 0; color: #1e3a8a;">${schoolName}</h1>
              <p class="school-subtitle" style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; color: #4b5563;">
                ${schoolAddress || 'Al-Haaj Bahri Karam Colony Amankot Swat.'}
              </p>
              <p class="school-contacts" style="font-size: 10.5px; font-weight: bold; color: #4b5563; margin: 0;">
                ${schoolContact ? `Cell: ${schoolContact}` : 'Cell: 0345-1908832 &nbsp;|&nbsp; Tel: 0946-724341'}
                ${schoolPsra ? ` &nbsp;|&nbsp; PSRA Reg No: ${schoolPsra}` : ''}
                ${schoolBise ? ` &nbsp;|&nbsp; BISE No: ${schoolBise}` : ''}
              </p>
            </div>
            <div class="header-right" style="width: 110px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
              <div class="photo-box" style="width: 85px; height: 95px; border: 1px solid #1e3a8a; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8px; font-weight: bold; color: #1e3a8a; background-color: #f8fafc;">
                ${studentInfo && studentInfo.photo_url ? `<img src="${studentInfo.photo_url}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;" />` : 'Photo'}
              </div>
              <div class="serial-no" style="font-size: 13px; font-weight: bold; color: #1e3a8a; margin-top: 4px; white-space: nowrap;">S. No. <u>&nbsp;${admissionNo || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</u></div>
            </div>
          </div>

          <!-- Title Banner -->
          <div class="banner-ribbon" style="background-color: #1e3a8a; color: #fff; font-weight: 900; text-transform: uppercase; text-align: center; font-size: 15px; padding: 5px 35px; margin: 5px auto; width: fit-content; letter-spacing: 1px; position: relative; clip-path: polygon(15px 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0% 50%);">Admission Form</div>
        </div>

        <!-- Flex Item 2: Student Data Fields -->
        <div class="form-grid" style="display: flex; flex-direction: column; gap: 8px;">
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Name of Student (In Block letters)</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${nameGrid}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Father's Name</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${fatherGrid}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Father NIC</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${nicGrid}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Date of Birth (in figure)</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${dobFigureBox}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Date of Birth (in words)</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${dobWordsBox}</span>
          </div>
          
          <div class="form-row" style="display: flex; align-items: center;">
            <div style="display: flex; flex: 1; align-items: center;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Religion</span>
              <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${religionBox}</span>
            </div>
            <div style="display: flex; flex: 1; align-items: center; justify-content: flex-end; padding-left: 20px;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 110px; text-align: right; padding-right: 15px; flex-shrink: 0;">Nationality</span>
              <span class="field-value" style="flex-grow: 0; display: flex; align-items: center;">${nationalityBox}</span>
            </div>
          </div>

          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Address for correspondence</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${corrAddressBox}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Postal Address</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${postAddressBox}</span>
          </div>
          <div class="form-row" style="display: flex; align-items: center;">
            <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 195px; flex-shrink: 0;">Father or Guardian No</span>
            <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${guardianNoBox}</span>
          </div>
        </div>

        <!-- Flex Item 3: Undertaking Group -->
        <div class="undertaking-group" style="display: flex; flex-direction: column; gap: 4px;">
          <div class="banner-ribbon" style="background-color: #1e3a8a; color: #fff; font-weight: 900; text-transform: uppercase; text-align: center; font-size: 13px; padding: 4px 20px; margin: 5px auto; width: fit-content; letter-spacing: 1px; position: relative; clip-path: polygon(15px 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0% 50%);">UNDERTAKING</div>
          <p class="undertaking-text" style="font-size: 11.5px; line-height: 1.45; text-align: justify; color: #1e3a8a; margin: 4px 0; font-weight: 500;">
            I solemnly declare that the informations given above are correct to the best of my knowledge. I shall abide by the rules/regulations laid down by the school administration.
          </p>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; color: #1e3a8a; font-size: 13px;">
            <div>Date: <u>&nbsp;&nbsp;${admissionDate || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;&nbsp;</u></div>
            <div>Parent's Sign ___________________________</div>
          </div>
        </div>

        <!-- Flex Item 4: Office Use Group -->
        <div class="office-use-container" style="border: 1.5px solid #1e3a8a; border-radius: 8px; padding: 10px 14px 14px 14px; background-color: #fdfeff; position: relative; box-sizing: border-box; margin-top: 5px;">
          <div class="banner-ribbon" style="background-color: #1e3a8a; color: #fff; font-weight: 900; text-transform: uppercase; text-align: center; font-size: 13px; padding: 4px 20px; margin: -24px auto 10px auto; width: fit-content; letter-spacing: 1px; position: relative; z-index: 5; clip-path: polygon(15px 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0% 50%);">FOR OFFICE USE ONLY</div>
          
          <div class="office-grid" style="display: flex; flex-direction: column; gap: 8px;">
            <div class="form-row" style="display: flex; align-items: center;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 200px; flex-shrink: 0;">Class in which Admitted:</span>
              <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${classBox}</span>
            </div>
            <div class="form-row" style="display: flex; align-items: center;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 200px; flex-shrink: 0;">Remarks of the adm. Committee:</span>
              <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${remarksBox}</span>
            </div>
            <div class="form-row" style="display: flex; align-items: center;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 200px; flex-shrink: 0;">Admission No:</span>
              <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${admNoBox}</span>
            </div>
            <div class="form-row" style="display: flex; align-items: center;">
              <span class="field-label" style="font-weight: bold; color: #1e3a8a; font-size: 13px; width: 200px; flex-shrink: 0;">Date of Admission:</span>
              <span class="field-value" style="flex-grow: 1; display: flex; align-items: center;">${admDateBox}</span>
            </div>
          </div>

          <!-- Office Signatures and Stamp Seal -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; font-weight: bold; color: #1e3a8a; font-size: 13px; position: relative;">
            <div>Clerk's Signature ______________________</div>
            <div>Principal ______________________</div>
            
            <!-- Circular Seal Stamp -->
            <div class="school-seal" style="width: 75px; height: 75px; border: 1.5px dashed rgba(30, 58, 138, 0.45); border-radius: 50%; display: flex; align-items: center; justify-content: center; position: absolute; right: 150px; bottom: 8px; transform: rotate(-10deg); font-family: Arial, sans-serif; color: rgba(30, 58, 138, 0.45); background-color: transparent; pointer-events: none; z-index: 10;">
              <div class="seal-inner" style="width: 67px; height: 67px; border: 0.75px solid rgba(30, 58, 138, 0.45); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                <div class="seal-text-curve" style="font-size: 4px; position: absolute; top: 5px; font-weight: bold; text-align: center; width: 100%; letter-spacing: 0.2px;">${sealText}</div>
                <div class="seal-center" style="font-size: 8.5px; font-weight: 900; letter-spacing: 0.5px; border-top: 0.75px solid rgba(30, 58, 138, 0.45); border-bottom: 0.75px solid rgba(30, 58, 138, 0.45); padding: 1px 2px;">PRINCIPAL</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Print Admission Form
  function handlePrintAdmissionForm() {
    const win = window.open('', '_blank')
    if (!win) return

    const studentInfo = admissionFormMode === 'student' && selectedStudent ? selectedStudent : null;
    const bodyContent = getAdmissionFormHtml(studentInfo);

    win.document.write(`
      <html>
        <head>
          <title>Admission Form - ${studentInfo ? studentInfo.name : 'Blank'}</title>
          <style>
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            @media print {
              @page {
                size: portrait;
                margin: 8mm 12mm 8mm 12mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              color: #1e3a8a;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .admission-container {
              height: calc(297mm - 16mm); /* exact height of A4 minus vertical margins of 8mm top & bottom */
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${bodyContent}
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

    // Get subjects for this class
    const classSubjects = awardSubject 
      ? subjects.filter(s => s.id === awardSubject)
      : subjects.filter(s => s.class_id === awardClass)

    // Sort students by roll no (or name if roll no missing)
    const filteredStudents = students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection))
    filteredStudents.sort((a, b) => {
      const aRoll = Number(a.roll_no) || 9999
      const bRoll = Number(b.roll_no) || 9999
      if (aRoll !== bRoll) return aRoll - bRoll
      return a.name.localeCompare(b.name)
    })

    const totalMarks = awardTotalMarks || '100'

    const rowsHTML = filteredStudents.map((s, idx) => {
      let totalObtained = 0
      let totalMax = 0
      
      const subjectCellsHTML = classSubjects.map(sub => {
        const resultObj = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id)
        if (resultObj) {
          totalObtained += Number(resultObj.marks_obtained) || 0
          totalMax += Number(resultObj.total_marks) || 100
          return `<td>${resultObj.marks_obtained}</td>`
        }
        return `<td>—</td>`
      }).join('')
      
      const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) + '%' : '—'
      const totalDisplay = totalMax > 0 ? `${totalObtained} / ${totalMax}` : '—'
      
      return `
        <tr>
          <td>${idx + 1}</td>
          <td class="roll-no">${s.roll_no || '—'}</td>
          <td class="student-name">${s.name}</td>
          ${subjectCellsHTML}
          <td class="marks-obtained" style="font-weight: bold;">${totalDisplay}</td>
          <td class="percentage" style="font-weight: bold;">${percentage}</td>
        </tr>
      `
    }).join('')

    win.document.write(`
      <html>
        <head>
          <title>Award List - Class ${className} - ${examName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 40px;
              padding: 0;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
            }
            .school-name {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 28px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
              margin-bottom: 8px;
            }
            .subject-info {
              font-size: 15px;
              font-weight: 600;
              color: #475569;
              margin-top: 5px;
              letter-spacing: 0.5px;
            }
            .subject-info span {
              color: #0f172a;
              font-weight: 700;
            }
            .sheet-title {
              font-size: 16px;
              font-weight: 800;
              margin-top: 15px;
              letter-spacing: 2px;
              color: #1e293b;
              text-transform: uppercase;
            }
            .meta-table {
              width: 100%;
              margin-bottom: 25px;
              font-size: 12px;
              border-collapse: collapse;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
            }
            .meta-table td {
              padding: 10px 14px;
              border: 1px solid #e2e8f0;
            }
            .meta-label {
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
              width: 15%;
            }
            .meta-value {
              font-weight: 700;
              color: #0f172a;
              font-size: 13px;
              width: 35%;
            }
            .award-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-bottom: 40px;
              border: 1px solid #cbd5e1;
            }
            .award-table th, .award-table td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: center;
            }
            .award-table th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .award-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .award-table td.student-name {
              text-align: left;
              font-weight: 700;
              color: #0f172a;
              padding-left: 20px;
            }
            .award-table td.roll-no {
              font-weight: 700;
              color: #475569;
            }
            .award-table td.marks-obtained {
              font-weight: 800;
              font-size: 14px;
              color: #0f172a;
            }
            .footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-block {
              text-align: center;
              width: 240px;
            }
            .sig-line {
              border-top: 1.5px dashed #64748b;
              margin-top: 50px;
              padding-top: 8px;
              font-size: 11px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            @media print {
              body { margin: 20px; }
              .meta-table { background-color: #f8fafc !important; }
              .award-table th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .award-table tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolName}</div>
            ${(schoolAddress || schoolContact || schoolPsra || schoolBise) ? `
              <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">
                ${schoolAddress ? `${schoolAddress}` : ''}
                ${schoolContact ? ` &bull; Cell: ${schoolContact}` : ''}
              </div>
              ${(schoolPsra || schoolBise) ? `
                <div style="font-size: 10px; color: #64748b; font-style: italic; margin-bottom: 8px;">
                  ${schoolPsra ? `PSRA Reg No: ${schoolPsra}` : ''}
                  ${schoolBise ? `${schoolPsra ? ' &bull; ' : ''}BISE No: ${schoolBise}` : ''}
                </div>
              ` : ''}
            ` : ''}
            <div class="subject-info">
              SUBJECT: <span>${subjectName || 'All Subjects'}</span> &nbsp;&bull;&nbsp; TOTAL MARKS: <span>${totalMarks}</span>
            </div>
            <div class="sheet-title">EXAMINATION AWARD LIST</div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="meta-label">Class:</td>
              <td class="meta-value">${className}</td>
              <td class="meta-label">Section:</td>
              <td class="meta-value">${sectionName}</td>
            </tr>
            <tr>
              <td class="meta-label">Exam:</td>
              <td class="meta-value">${examName}</td>
              <td class="meta-label">Date:</td>
              <td class="meta-value">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>

          <table class="award-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Roll No</th>
                <th>Student Name</th>
                ${classSubjects.map(sub => `<th>${sub.name}</th>`).join('')}
                <th>Total Marks</th>
                <th>%age</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || `<tr><td colspan="${3 + classSubjects.length + 2}" style="padding: 20px; color: #555;">No registered students found in the selected class and section.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-block">
              <div class="sig-line">Teacher Sign</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">Examiner Sign</div>
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
  const classSubjects = awardClass
    ? (awardSubject 
        ? subjects.filter(s => s.id === awardSubject)
        : subjects.filter(s => s.class_id === awardClass))
    : []

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
            <button className={`nav-item ${activeDoc === 'progress_report' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('progress_report')}>
              <span style={{ marginRight: '0.5rem' }}>📈</span> Progress Report Card
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
            {activeDoc === 'progress_report' && '📈 Monthly Progress Report Card'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {activeDoc === 'slc' && 'Customize default templates and print official release papers.'}
            {activeDoc === 'birth' && 'Record and generate formal proof of birth documents.'}
            {activeDoc === 'character' && 'Generate certified student character evaluations and conduct ratings.'}
            {activeDoc === 'sports' && 'Award students for tournament excellence and sports participation.'}
            {activeDoc === 'top_positions' && 'Honor academic excellence in class final, mid or monthly tests.'}
            {activeDoc === 'admission' && 'Print blank or prefilled student registration templates.'}
            {activeDoc === 'award_list' && 'Create examiner grade tables with student indices for marking sheets.'}
            {activeDoc === 'progress_report' && 'Print blank student monthly progress reports to fill manually.'}
          </p>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '1000px' }}>
            {msg.text}
          </div>
        )}

        {/* Tab Selection (only for customizable certificates) */}
        {activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && (
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
            {tab === 'generate' && activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && (
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
                      <div style={{ textAlign: 'center', marginBottom: '0.2rem', flexShrink: 0 }}>
                        {(template.logo_url || defaultSchoolLogo) ? (
                          <img src={template.logo_url || defaultSchoolLogo} alt="Logo" style={{ maxHeight: '30px', marginBottom: '2px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>🎓</div>
                        )}
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4a3e28', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {schoolName}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 'bold', letterSpacing: '1px', color: '#6e5a3c', margin: '2px 0 1px', textTransform: 'uppercase', borderBottom: '1px solid #eaeaea', display: 'inline-block', paddingBottom: '2px' }}>
                          {template.title || 'CERTIFICATE'}
                        </div>
                        <div style={{ fontSize: '0.48rem', color: '#777', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Official Institution Release Document
                        </div>
                      </div>

                      <div style={{ 
                        margin: '0.5rem 0 1.25rem 0', 
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
            {tab === 'template' && activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && (
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
                <div className="card" style={{ background: '#fcfcfc', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', color: '#111', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, color: '#333', marginBottom: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', width: '100%' }}>
                    Form Sheet Preview
                  </h3>

                  <div style={{ 
                    border: '1px solid #777', 
                    padding: '8mm 12mm', 
                    background: '#fff', 
                    boxSizing: 'border-box', 
                    width: '210mm', 
                    height: '297mm',
                    minWidth: '210mm',
                    minHeight: '297mm',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: getAdmissionFormHtml(admissionFormMode === 'student' && selectedStudent ? selectedStudent : null) }} style={{ height: '100%' }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRESS REPORT VIEW ── */}
            {activeDoc === 'progress_report' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Progress Report Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div className="form-group">
                      <label className="form-label">Form Record Mode</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={`btn ${progressReportMode === 'blank' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setProgressReportMode('blank')}>
                          📄 Blank Form
                        </button>
                        <button className={`btn ${progressReportMode === 'student' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setProgressReportMode('student')}>
                          👤 Prefill Student
                        </button>
                      </div>
                    </div>

                    {progressReportMode === 'student' && (
                      <div className="form-group animate-fade">
                        <label className="form-label">Select Registered Student</label>
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
                    )}

                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }} onClick={handlePrintProgressReport}>
                      🖨️ Print Progress Report Form
                    </button>
                  </div>
                </div>

                {/* Progress Report Preview */}
                <div className="card" style={{ background: '#fcfcfc', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', color: '#111', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, color: '#333', marginBottom: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', width: '100%' }}>
                    Form Sheet Preview
                  </h3>

                  <div style={{ 
                    border: '1px solid #777', 
                    padding: '6mm 10mm', 
                    background: '#fff', 
                    boxSizing: 'border-box', 
                    width: '210mm', 
                    height: '297mm',
                    minWidth: '210mm',
                    minHeight: '297mm',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: getProgressReportHtml(progressReportMode === 'student' && selectedStudent ? selectedStudent : null) }} style={{ height: '100%' }} />
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
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
                    
                    <div className="form-group" style={{ flex: '1 1 180px' }}>
                      <label className="form-label">Class *</label>
                      <select className="form-select" value={awardClass} onChange={e => { setAwardClass(e.target.value); setAwardSection(''); setAwardSubject('') }}>
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                      <label className="form-label">Section (Optional)</label>
                      <select className="form-select" value={awardSection} onChange={e => setAwardSection(e.target.value)} disabled={!awardClass}>
                        <option value="">All Sections</option>
                        {sections.filter(s => s.class_id === awardClass).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: '1 1 150px' }}>
                      <label className="form-label">Subject (Optional)</label>
                      <select className="form-select" value={awardSubject} onChange={e => setAwardSubject(e.target.value)} disabled={!awardClass}>
                        <option value="">All Subjects</option>
                        {subjects.filter(s => s.class_id === awardClass).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: '1 1 180px' }}>
                      <label className="form-label">Exam Type *</label>
                      <select className="form-select" value={awardExam} onChange={e => setAwardExam(e.target.value)}>
                        <option value="">Select Exam</option>
                        {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>

                    {awardClass && awardExam && (
                      <div className="form-group animate-fade" style={{ flex: '1 1 120px' }}>
                        <label className="form-label">Total Marks</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="100" 
                          value={awardTotalMarks} 
                          onChange={e => setAwardTotalMarks(e.target.value)} 
                        />
                      </div>
                    )}

                  </div>
                </div>

                {/* Grade Table card */}
                {awardClass && awardExam ? (
                  <div className="card animate-fade">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 700 }}>Sheet Preview</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Showing students in {classes.find(c => c.id === awardClass)?.name} &nbsp;•&nbsp; Exam: {examTypes.find(e => e.id === awardExam)?.name} &nbsp;•&nbsp; Total Marks: {awardTotalMarks}
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
                              <th rowSpan={2} style={{ width: '80px' }}>S.No</th>
                              <th rowSpan={2} style={{ width: '120px' }}>Roll No</th>
                              <th rowSpan={2}>Student Name</th>
                              <th rowSpan={2}>Father Name</th>
                              {classSubjects.map(sub => (
                                <th key={sub.id} colSpan={2} style={{ textAlign: 'center' }}>{sub.name}</th>
                              ))}
                            </tr>
                            <tr>
                              {classSubjects.map(sub => (
                                <Fragment key={sub.id}>
                                  <th style={{ textAlign: 'center', fontSize: '0.8rem', background: 'var(--bg-base)' }}>Total</th>
                                  <th style={{ textAlign: 'center', fontSize: '0.8rem', background: 'var(--bg-base)' }}>Obt</th>
                                </Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection)).length === 0 ? (
                              <tr>
                                <td colSpan={4 + (classSubjects.length * 2)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                  No registered student rows found for this filter selection.
                                </td>
                              </tr>
                            ) : (
                              students
                                .filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection))
                                .map((s, idx) => {
                                  const subjectCells = classSubjects.map(sub => {
                                    const res = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id)
                                    const obt = res ? res.marks_obtained : '—'
                                    const total = res ? res.total_marks : '100'
                                    return (
                                      <Fragment key={sub.id}>
                                        <td style={{ textAlign: 'center' }}>{total}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{obt}</td>
                                      </Fragment>
                                    )
                                  })
                                  
                                  return (
                                    <tr key={s.id}>
                                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                      <td style={{ fontWeight: 'bold' }}>{s.roll_no || '—'}</td>
                                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                                      <td style={{ fontWeight: 600 }}>{s.father_name || '—'}</td>
                                      {subjectCells}
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
