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

type DocType = 'slc' | 'birth' | 'character' | 'sports' | 'top_positions' | 'admission' | 'award_list' | 'progress_report' | 'result_form' | 'diary' | 'lesson_plan'
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

  // Cache of all customizable certificate templates to make switching instantaneous
  const [templatesCache, setTemplatesCache] = useState<Record<string, CertificateTemplate>>({})

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
  const [certClassFilter, setCertClassFilter] = useState('')
  const [certSectionFilter, setCertSectionFilter] = useState('')
  
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

  // Diary specific states
  const [diaryClassFilter, setDiaryClassFilter] = useState('')
  const [diaryGrade, setDiaryGrade] = useState('')
  const [diarySubjects, setDiarySubjects] = useState<string[]>([
    'English', 'Urdu', 'Science', 'Maths', 'G.Knowledge', 'S.Studies', 'Islamiyat', 'Presentation', 'Total Students', 'Name of Absent Students'
  ])

  // Lesson Plan specific states
  const [lessonPlanClassFilter, setLessonPlanClassFilter] = useState('')
  const [lessonPlanSubjectFilter, setLessonPlanSubjectFilter] = useState('')
  const [lessonPlanGrade, setLessonPlanGrade] = useState('')
  const [lessonPlanSubject, setLessonPlanSubject] = useState('')
  const [lessonPlanTeacher, setLessonPlanTeacher] = useState('')
  const [lessonPlanDate, setLessonPlanDate] = useState('')

  // Load basic lists
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        studentsRes,
        classesRes,
        subjectsRes,
        examsRes,
        slcRes,
        birthRes,
        charRes,
        sportsRes,
        topRes
      ] = await Promise.all([
        fetch('/api/school/students').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/subjects').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/results').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=slc').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=birth').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=character').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=sports').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/certificate-templates?type=top_positions').then(r => r.json()).catch(() => ({})),
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

      // Populate templates cache
      const cache: Record<string, CertificateTemplate> = {
        slc: slcRes.template || { logo_url: '', title: '', body_text: '', signature_title: '' },
        birth: birthRes.template || { logo_url: '', title: '', body_text: '', signature_title: '' },
        character: charRes.template || { logo_url: '', title: '', body_text: '', signature_title: '' },
        sports: sportsRes.template || { logo_url: '', title: '', body_text: '', signature_title: '' },
        top_positions: topRes.template || { logo_url: '', title: '', body_text: '', signature_title: '' },
      }
      setTemplatesCache(cache)

      const meta = slcRes
      if (meta.schoolLogo) {
        setDefaultSchoolLogo(meta.schoolLogo)
      }
      if (meta.template?.logo_url) {
        setSchoolLogoUrl(meta.template.logo_url)
      } else if (meta.schoolLogo) {
        setSchoolLogoUrl(meta.schoolLogo)
      }
      if (meta.schoolName) {
        setSchoolName(meta.schoolName)
      }
      if (meta.schoolContact) {
        setSchoolContact(meta.schoolContact)
      }
      if (meta.schoolAddress) {
        setSchoolAddress(meta.schoolAddress)
      }
      if (meta.schoolPsra) {
        setSchoolPsra(meta.schoolPsra)
      }
      if (meta.schoolBise) {
        setSchoolBise(meta.schoolBise)
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error loading workspace metadata' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load certificate template from client-side cache when activeDoc changes
  const loadTemplate = useCallback((type: string) => {
    if (type === 'admission' || type === 'award_list' || type === 'progress_report' || type === 'result_form' || type === 'diary' || type === 'lesson_plan') return
    const t = templatesCache[type]
    if (t) {
      setTemplate(t)
      setLogoUrlForm(t.logo_url || '')
      setTitleForm(t.title || '')
      setBodyTextForm(t.body_text || '')
      setSignatureTitleForm(t.signature_title || 'Principal')
      if (t.logo_url) {
        setSchoolLogoUrl(t.logo_url)
      } else if (defaultSchoolLogo) {
        setSchoolLogoUrl(defaultSchoolLogo)
      } else {
        setSchoolLogoUrl('')
      }
    }
  }, [templatesCache, defaultSchoolLogo])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadTemplate(activeDoc)
    setTab('generate')
    setMsg(null)
    setCertClassFilter('')
    setCertSectionFilter('')
  }, [activeDoc, loadTemplate])

  const filteredCertStudents = students.filter(s => {
    const matchClass = !certClassFilter || s.class_id === certClassFilter
    const matchSection = !certSectionFilter || s.section_id === certSectionFilter
    return matchClass && matchSection
  })

  useEffect(() => {
    if (filteredCertStudents.length > 0 && !filteredCertStudents.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(filteredCertStudents[0].id)
    } else if (filteredCertStudents.length === 0) {
      setSelectedStudentId('')
    }
  }, [certClassFilter, certSectionFilter, filteredCertStudents, selectedStudentId])

  useEffect(() => {
    if (diaryClassFilter) {
      const cls = classes.find(c => c.id === diaryClassFilter)
      setDiaryGrade(cls ? cls.name : '')
      const classSubs = subjects.filter(s => s.class_id === diaryClassFilter)
      setDiarySubjects([
        ...classSubs.map(s => s.name),
        'Total Students',
        'Name Of Absent Students'
      ])
    } else {
      setDiaryGrade('')
      setDiarySubjects([
        'English', 'Urdu', 'Science', 'Maths', 'G.Knowledge', 'S.Studies', 'Islamiyat', 'Presentation', 'Total Students', 'Name Of Absent Students'
      ])
    }
  }, [diaryClassFilter, classes, subjects])

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
    const wrap = (val: string) => `<span class="cert-underline">${val}</span>`
    return body
      .replace(/{name}/g, wrap(student.name || ''))
      .replace(/{father_name}/g, wrap(student.father_name || '—'))
      .replace(/{class_name}/g, wrap(student.class_name || '—'))
      .replace(/{roll_no}/g, wrap(student.roll_no || '—'))
      .replace(/{gender}/g, wrap(student.gender || '—'))
      .replace(/{address}/g, wrap(student.address || '—'))
      .replace(/{dob}/g, wrap(student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      .replace(/{dob_words}/g, wrap(student.dob ? convertDateToWords(student.dob) : '—'))
      .replace(/{reg_date}/g, wrap(student.reg_date ? new Date(student.reg_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      
      // SLC specific
      .replace(/{leaving_date}/g, wrap(leavingDate ? new Date(leavingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      .replace(/{leaving_reason}/g, wrap(leavingReason || '—'))
      .replace(/{conduct}/g, wrap(conduct || '—'))
      
      // Birth specific
      .replace(/{birth_place}/g, wrap(birthPlace || '—'))
      .replace(/{register_no}/g, wrap(birthRegisterNo || '—'))
      
      // Sports specific
      .replace(/{sport_name}/g, wrap(sportName || '—'))
      .replace(/{achievement}/g, wrap(sportAchievement || '—'))
      .replace(/{event_name}/g, wrap(sportEventName || '—'))
      .replace(/{date}/g, wrap(sportDate ? new Date(sportDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      
      // Top Positions specific
      .replace(/{position}/g, wrap(topPosition || '—'))
      .replace(/{exam_name}/g, wrap(topExamName || '—'))
      .replace(/{marks_obtained}/g, wrap(topMarksObtained || '—'))
      .replace(/{total_marks}/g, wrap(topTotalMarks || '—'))
      .replace(/{percentage}/g, wrap((topMarksObtained && topTotalMarks ? String(Math.round((Number(topMarksObtained) / Number(topTotalMarks)) * 100)) : '0') + '%'))
      .replace(/{year}/g, wrap(new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(-2)))
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
          setTemplatesCache(prev => ({
            ...prev,
            [activeDoc]: data.template
          }))
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
              border: 1px solid #1c1c1c;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              position: relative;
              background: #fdfbf7;
            }
            .border-frame {
              position: absolute;
              top: 5px;
              left: 5px;
              right: 5px;
              bottom: 5px;
              border: 10px solid #c5a85c;
              pointer-events: none;
            }
            .border-frame-inner-line {
              position: absolute;
              top: 15px;
              left: 15px;
              right: 15px;
              bottom: 15px;
              border: 1.5px solid #1c1c1c;
              pointer-events: none;
            }
            .border-inner-double {
              position: absolute;
              top: 25px;
              left: 25px;
              right: 25px;
              bottom: 25px;
              border: 2px double #b19343;
              pointer-events: none;
            }
            .border-inner-line {
              position: absolute;
              top: 31px;
              left: 31px;
              right: 31px;
              bottom: 31px;
              border: 1px solid #1c1c1c;
              pointer-events: none;
            }
            .content-wrapper {
              position: relative;
              z-index: 10;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
              padding: 28mm 18mm 12mm 18mm;
              box-sizing: border-box;
              min-height: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              flex-shrink: 0;
            }
            .school-title {
              font-family: 'Cinzel', serif;
              font-size: 26px;
              font-weight: 800;
              color: #4e3620;
              letter-spacing: 2px;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .school-address {
              font-family: sans-serif;
              font-size: 11px;
              font-weight: bold;
              color: #4e3620;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            .certificate-title-wrap {
              text-align: center;
              margin: 20px 0 10px 0;
            }
            .cert-title {
              font-family: 'Cinzel', serif;
              font-size: 34pt;
              font-weight: 800;
              color: #c5a85c;
              letter-spacing: 4px;
              text-transform: uppercase;
              line-height: 1.1;
            }
            .cert-subtitle-wrap {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              margin-top: 5px;
            }
            .gold-line {
              border-bottom: 1.5px solid #c5a85c;
              width: 80px;
              display: inline-block;
            }
            .cert-subtitle-text {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 14pt;
              font-style: italic;
              color: #4e3620;
              font-weight: 600;
            }
            .cert-body {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 19px;
              line-height: 1.8;
              text-align: justify;
              text-indent: 30px;
              margin: 10px 45px;
              white-space: pre-line;
              flex: 1 1 auto;
              min-height: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .cert-underline {
              font-weight: 800;
              color: #1a1a1a;
              border-bottom: none;
              padding: 0 4px;
              display: inline;
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
              border-top: 1.5px solid #000;
              margin-top: 50px;
              padding-top: 8px;
              font-family: 'Cinzel', serif;
              font-size: 13px;
              font-weight: 800;
              color: #4e3620;
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
              <div class="border-frame"></div>
              <div class="border-frame-inner-line"></div>
              <div class="border-inner-double"></div>
              <div class="border-inner-line"></div>

              <!-- Corner triangles -->
              <div style="position: absolute; top: 15px; left: 15px; width: 45px; height: 45px; background: #4e3620; clip-path: polygon(0 0, 100% 0, 0 100%); pointer-events: none; z-index: 20;"></div>
              <div style="position: absolute; top: 15px; right: 15px; width: 45px; height: 45px; background: #4e3620; clip-path: polygon(0 0, 100% 0, 100% 100%); pointer-events: none; z-index: 20;"></div>
              <div style="position: absolute; bottom: 15px; right: 15px; width: 45px; height: 45px; background: #4e3620; clip-path: polygon(100% 0, 100% 100%, 0 100%); pointer-events: none; z-index: 20;"></div>
              <div style="position: absolute; bottom: 15px; left: 15px; width: 45px; height: 45px; background: #4e3620; clip-path: polygon(0 0, 100% 100%, 0 100%); pointer-events: none; z-index: 20;"></div>

              <!-- Corner flourishes -->
              <!-- Top Left Flourish -->
              <svg style="position: absolute; top: 15px; left: 15px; width: 95px; height: 95px; fill: none; stroke: #b19343; stroke-width: 1.5; pointer-events: none; z-index: 21;" viewBox="0 0 100 100">
                <path d="M 12 85 C 12 40, 40 12, 85 12" stroke-width="0.75" />
                <path d="M 0 100 C 0 30, 30 0, 100 0" stroke-width="0.5" />
                <path d="M 22 22 C 32 32, 32 42, 22 52 C 12 42, 12 32, 22 22 Z" fill="#b19343" opacity="0.1" />
                <path d="M 22 40 C 25 30, 35 25, 40 30 C 45 35, 40 45, 30 40 C 25 35, 30 20, 45 20 C 55 20, 60 30, 55 40 C 50 50, 35 50, 35 35" />
                <path d="M 40 22 C 30 27, 25 37, 30 42 C 35 47, 45 42, 40 32 C 35 27, 20 32, 20 47 C 20 57, 30 62, 40 57 C 50 52, 50 37, 35 37" />
              </svg>
              <!-- Top Right Flourish -->
              <svg style="position: absolute; top: 15px; right: 15px; width: 95px; height: 95px; fill: none; stroke: #b19343; stroke-width: 1.5; pointer-events: none; z-index: 21; transform: rotate(90deg);" viewBox="0 0 100 100">
                <path d="M 12 85 C 12 40, 40 12, 85 12" stroke-width="0.75" />
                <path d="M 0 100 C 0 30, 30 0, 100 0" stroke-width="0.5" />
                <path d="M 22 22 C 32 32, 32 42, 22 52 C 12 42, 12 32, 22 22 Z" fill="#b19343" opacity="0.1" />
                <path d="M 22 40 C 25 30, 35 25, 40 30 C 45 35, 40 45, 30 40 C 25 35, 30 20, 45 20 C 55 20, 60 30, 55 40 C 50 50, 35 50, 35 35" />
                <path d="M 40 22 C 30 27, 25 37, 30 42 C 35 47, 45 42, 40 32 C 35 27, 20 32, 20 47 C 20 57, 30 62, 40 57 C 50 52, 50 37, 35 37" />
              </svg>
              <!-- Bottom Right Flourish -->
              <svg style="position: absolute; bottom: 15px; right: 15px; width: 95px; height: 95px; fill: none; stroke: #b19343; stroke-width: 1.5; pointer-events: none; z-index: 21; transform: rotate(180deg);" viewBox="0 0 100 100">
                <path d="M 12 85 C 12 40, 40 12, 85 12" stroke-width="0.75" />
                <path d="M 0 100 C 0 30, 30 0, 100 0" stroke-width="0.5" />
                <path d="M 22 22 C 32 32, 32 42, 22 52 C 12 42, 12 32, 22 22 Z" fill="#b19343" opacity="0.1" />
                <path d="M 22 40 C 25 30, 35 25, 40 30 C 45 35, 40 45, 30 40 C 25 35, 30 20, 45 20 C 55 20, 60 30, 55 40 C 50 50, 35 50, 35 35" />
                <path d="M 40 22 C 30 27, 25 37, 30 42 C 35 47, 45 42, 40 32 C 35 27, 20 32, 20 47 C 20 57, 30 62, 40 57 C 50 52, 50 37, 35 37" />
              </svg>
              <!-- Bottom Left Flourish -->
              <svg style="position: absolute; bottom: 15px; left: 15px; width: 95px; height: 95px; fill: none; stroke: #b19343; stroke-width: 1.5; pointer-events: none; z-index: 21; transform: rotate(270deg);" viewBox="0 0 100 100">
                <path d="M 12 85 C 12 40, 40 12, 85 12" stroke-width="0.75" />
                <path d="M 0 100 C 0 30, 30 0, 100 0" stroke-width="0.5" />
                <path d="M 22 22 C 32 32, 32 42, 22 52 C 12 42, 12 32, 22 22 Z" fill="#b19343" opacity="0.1" />
                <path d="M 22 40 C 25 30, 35 25, 40 30 C 45 35, 40 45, 30 40 C 25 35, 30 20, 45 20 C 55 20, 60 30, 55 40 C 50 50, 35 50, 35 35" />
                <path d="M 40 22 C 30 27, 25 37, 30 42 C 35 47, 45 42, 40 32 C 35 27, 20 32, 20 47 C 20 57, 30 62, 40 57 C 50 52, 50 37, 35 37" />
              </svg>

              <!-- Watermark backgrounds -->
              <svg style="position: absolute; bottom: 35px; left: 35px; width: 250px; height: 250px; opacity: 0.04; fill: none; stroke: #8a7344; stroke-width: 1; pointer-events: none; z-index: 0;" viewBox="0 0 100 100">
                <path d="M 0 100 C 30 100, 60 80, 70 50 C 80 20, 60 0, 40 10 C 20 20, 30 50, 50 40 C 60 30, 50 15, 35 25 C 20 35, 30 65, 55 55 C 75 45, 80 20, 70 10 C 65 5, 50 10, 60 25 C 65 30, 75 25, 70 15" />
                <path d="M 0 100 C 50 90, 80 60, 90 20" />
                <path d="M 20 100 C 40 85, 60 70, 70 45" />
              </svg>
              <svg style="position: absolute; top: 35px; right: 35px; width: 250px; height: 250px; opacity: 0.04; fill: none; stroke: #8a7344; stroke-width: 1; pointer-events: none; z-index: 0; transform: rotate(180deg);" viewBox="0 0 100 100">
                <path d="M 0 100 C 30 100, 60 80, 70 50 C 80 20, 60 0, 40 10 C 20 20, 30 50, 50 40 C 60 30, 50 15, 35 25 C 20 35, 30 65, 55 55 C 75 45, 80 20, 70 10 C 65 5, 50 10, 60 25 C 65 30, 75 25, 70 15" />
                <path d="M 0 100 C 50 90, 80 60, 90 20" />
                <path d="M 20 100 C 40 85, 60 70, 70 45" />
              </svg>

              <!-- Gold Ribbon Seal -->
              <div class="gold-seal" style="position: absolute; top: 35px; left: 55px; z-index: 12; width: 90px; height: 130px; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                <div style="position: absolute; top: 40px; display: flex; justify-content: space-between; width: 55px; height: 80px; z-index: 1;">
                  <div style="width: 20px; height: 100%; background: #c5a85c; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); transform: rotate(-8deg); box-shadow: 0 4px 6px rgba(0,0,0,0.15);"></div>
                  <div style="width: 20px; height: 100%; background: #b19343; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); transform: rotate(8deg); box-shadow: 0 4px 6px rgba(0,0,0,0.15);"></div>
                </div>
                <div style="position: relative; width: 70px; height: 70px; border-radius: 50%; background: radial-gradient(circle, #f3e5ab 0%, #d4af37 60%, #aa7c11 100%); border: 3px double #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 12px rgba(0,0,0,0.25); z-index: 2;">
                  ${(template.logo_url || defaultSchoolLogo) ? `
                    <img src="${template.logo_url || defaultSchoolLogo}" style="width: 42px; height: 42px; object-fit: contain; border-radius: 50%; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));" />
                  ` : `
                    <span style="font-size: 26px; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));">🎓</span>
                  `}
                </div>
              </div>

              <!-- Content wrapper -->
              <div class="content-wrapper">
                <div class="header">
                  <div class="school-title">${schoolName}</div>
                  ${schoolAddress ? `<div class="school-address">${schoolAddress}</div>` : ''}
                  
                  <div class="certificate-title-wrap">
                    <div class="cert-title">${template.title}</div>
                    <div class="cert-subtitle-wrap">
                      <span class="gold-line"></span>
                      <span class="cert-subtitle-text">Of Achievement</span>
                      <span class="gold-line"></span>
                    </div>
                  </div>
                </div>
                
                <div class="cert-body">
                  ${compiledBody}
                </div>
                
                <div class="footer">
                  <div class="sig-block" style="text-align: left; padding-left: 20px;">
                    <strong>Date:</strong> <span class="cert-underline" style="min-width: 140px; font-weight: bold; border-bottom: 1.5px solid #000;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  
                  <div class="sig-block" style="position: relative;">
                    <!-- Blue seal stamp -->
                    <div style="position: absolute; bottom: 35px; right: 50px; width: 75px; height: 75px; border: 1.5px solid rgba(28, 70, 160, 0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-8deg); z-index: 10; pointer-events: none;">
                      <div style="width: 67px; height: 67px; border: 0.75px dashed rgba(28, 70, 160, 0.7); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 5px; font-weight: bold; color: rgba(28, 70, 160, 0.7); text-transform: uppercase;">ISLAMIA MODEL</span>
                        <span style="font-size: 8px; font-weight: 900; color: rgba(28, 70, 160, 0.7); border-top: 1px solid rgba(28, 70, 160, 0.7); border-bottom: 1px solid rgba(28, 70, 160, 0.7); padding: 1px 2px; margin: 1px 0;">APPROVED</span>
                        <span style="font-size: 5px; font-weight: bold; color: rgba(28, 70, 160, 0.7); text-transform: uppercase;">OFFICE SEAL</span>
                      </div>
                    </div>
                    <!-- Signature Line -->
                    <div class="sig-line" style="border-top: 1.5px solid #000; padding-top: 6px; font-weight: bold;">
                      ${template.signature_title}
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

  function getDiaryPreviewHtml() {
    return `
      <div style="font-family: sans-serif; color: #000; padding: 10px; box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px;">
        <div>
          <div style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">
            ${schoolName}
            <div style="font-size: 9px; font-weight: normal; margin-top: 2px; text-transform: none; color: #666;">
              Daily Class Diary Sheet
            </div>
          </div>
          <div style="font-size: 11px; font-weight: bold; margin-bottom: 12px; text-align: center;">
            Grade: <span style="display: inline-block; border-bottom: 1px solid #000; width: 120px; text-align: center;">${diaryGrade || '___________________'}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #000; padding: 5px; font-weight: bold; width: 130px; text-align: center;">Subjects</th>
                <th style="border: 1px solid #000; padding: 5px; font-weight: bold; text-align: center;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${diarySubjects.map((sub, idx) => {
                const isAbsent = sub === 'Name Of Absent Students' || sub === 'Name of Absent Students';
                const isTotal = sub === 'Total Students';
                const height = isAbsent ? '38px' : isTotal ? '20px' : '15px';
                return `
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold; width: 130px; background-color: #fafafa;">${sub}</td>
                    <td style="border: 1px solid #000; padding: 4px 6px; height: ${height};"></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-top: 10px;">
          <div>Class Incharge: <span style="border-bottom: 1px solid #000; width: 120px; display: inline-block; margin-left: 3px;"></span></div>
          <div>V.P Sign: <span style="border-bottom: 1px solid #000; width: 120px; display: inline-block; margin-left: 3px;"></span></div>
        </div>
      </div>
    `;
  }

  function handlePrintDiary() {
    const win = window.open('', '_blank')
    if (!win) return

    const diarySingleHtml = `
      <div class="diary-header">
        ${schoolName}
        <div class="diary-title">Daily Class Diary Sheet</div>
      </div>
      <div class="grade-line">
        Grade: <span class="grade-underline">${diaryGrade || '___________________'}</span>
      </div>
      <table class="diary-table">
        <thead>
          <tr>
            <th style="width: 180px;">Subjects</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${diarySubjects.map((sub) => {
            const isAbsent = sub === 'Name Of Absent Students' || sub === 'Name of Absent Students';
            const isTotal = sub === 'Total Students';
            const rowClass = isAbsent ? 'absent-row' : isTotal ? 'total-row' : '';
            return `
              <tr class="${rowClass}">
                <td class="subject-cell">${sub}</td>
                <td class="desc-cell"></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="diary-footer">
        <div>Class Incharge: <span class="footer-line"></span></div>
        <div>V.P Sign: <span class="footer-line"></span></div>
      </div>
    `;

    win.document.write(`
      <html>
        <head>
          <title>Daily Class Diary - ${diaryGrade || 'Blank'}</title>
          <style>
            @page {
              size: portrait;
              margin: 8mm 12mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              color: #000;
              font-family: 'Segoe UI', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-page {
              width: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              height: 275mm;
              justify-content: space-between;
            }
            .diary-item {
              height: 85mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 2mm 0;
            }
            .diary-divider {
              text-align: center;
              font-size: 7pt;
              color: #555;
              margin: 1mm 0;
              border-top: 1px dashed #000;
              padding-top: 1mm;
              font-family: monospace;
              letter-spacing: 2px;
            }
            .diary-header {
              text-align: center;
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .diary-title {
              font-size: 8pt;
              font-weight: normal;
              text-transform: none;
              color: #444;
              margin-top: 1px;
            }
            .grade-line {
              font-size: 9pt;
              font-weight: bold;
              text-align: center;
              margin: 1mm 0 2mm 0;
            }
            .grade-underline {
              display: inline-block;
              border-bottom: 1px solid #000;
              width: 150px;
              text-align: center;
            }
            .diary-table {
              width: 100%;
              border-collapse: collapse;
            }
            .diary-table th, .diary-table td {
              border: 1px solid #000;
              padding: 4px 6px;
              font-size: 8pt;
              line-height: 1.1;
            }
            .diary-table th {
              font-weight: bold;
              background-color: #f3f4f6;
              text-align: center;
            }
            .diary-table td.subject-cell {
              font-weight: bold;
              width: 180px;
              background-color: #fafafa;
            }
            .diary-table td.desc-cell {
              height: 14px;
            }
            .diary-table tr.total-row td.desc-cell {
              height: 18px;
            }
            .diary-table tr.absent-row td.desc-cell {
              height: 38px;
            }
            .diary-footer {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              font-weight: bold;
              margin-top: 2mm;
            }
            .footer-line {
              border-bottom: 1px solid #000;
              width: 150px;
              display: inline-block;
              margin-left: 3px;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="diary-item">
              ${diarySingleHtml}
            </div>
            <div class="diary-divider">✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
            <div class="diary-item">
              ${diarySingleHtml}
            </div>
            <div class="diary-divider">✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
            <div class="diary-item">
              ${diarySingleHtml}
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
    `);
    win.document.close()
  }

  function getLessonPlanPreviewHtml() {
    return `
      <div style="font-family: sans-serif; padding: 15px; color: #000; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a;">
          ${schoolName}
        </div>
        <div style="text-align: center; font-size: 11pt; font-weight: 800; margin-bottom: 12px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
          One-Page Lesson Plan Structure
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e3a8a; font-size: 8.5pt;">
          <tbody>
            <tr style="height: 25px;">
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; width: 18%; color: #1e3a8a;">Subject:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; width: 32%; font-weight: 600;">
                ${lessonPlanSubject ? lessonPlanSubject : '<span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>'}
              </td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; width: 18%; color: #1e3a8a;">Class/Grade:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; width: 32%; font-weight: 600;">
                ${lessonPlanGrade ? lessonPlanGrade : '<span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>'}
              </td>
            </tr>
            <tr style="height: 25px;">
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; color: #1e3a8a;">Topic:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px;">
                <span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>
              </td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; color: #1e3a8a;">Date:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: 600;">
                ${lessonPlanDate ? new Date(lessonPlanDate).toLocaleDateString('en-GB') : '<span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>'}
              </td>
            </tr>
            <tr style="height: 25px;">
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; color: #1e3a8a;">Duration:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px;">
                <span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>
              </td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: bold; color: #1e3a8a;">Teacher:</td>
              <td style="border: 1px solid #1e3a8a; padding: 6px 8px; font-weight: 600;">
                ${lessonPlanTeacher ? lessonPlanTeacher : '<span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 90%; height: 12px;"></span>'}
              </td>
            </tr>
            ${[
              'Learning Objectives',
              'Teaching Materials',
              'Introduction',
              'Lesson Development',
              'Activities',
              'Assessment',
              'Conclusion',
              'Homework',
              'Teacher Reflection'
            ].map(label => `
              <tr style="height: 24px;">
                <td style="border: 1px solid #1e3a8a; padding: 5px 8px; font-weight: bold; color: #1e3a8a;">${label}:</td>
                <td style="border: 1px solid #1e3a8a; padding: 5px 8px;">
                  <span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 95%; height: 12px;"></span>
                </td>
                <td style="border: 1px solid #1e3a8a; padding: 5px 8px;">
                  <span style="border-bottom: 1px solid #cbd5e1; display: inline-block; width: 95%; height: 12px;"></span>
                </td>
                <td style="border: 1px solid #1e3a8a; padding: 5px 8px;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function handlePrintLessonPlan() {
    const win = window.open('', '_blank')
    if (!win) return

    const tableRowsHTML = [
      'Learning Objectives',
      'Teaching Materials',
      'Introduction',
      'Lesson Development',
      'Activities',
      'Assessment',
      'Conclusion',
      'Homework',
      'Teacher Reflection'
    ].map(label => `
      <tr style="height: 17mm;">
        <td class="label-cell"><strong>${label}:</strong></td>
        <td class="line-cell"><span class="write-line"></span></td>
        <td class="line-cell"><span class="write-line"></span></td>
        <td class="blank-cell"></td>
      </tr>
    `).join('')

    win.document.write(`
      <html>
        <head>
          <title>One-Page Lesson Plan Structure</title>
          <style>
            @page {
              size: portrait;
              margin: 12mm 15mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              color: #000;
              font-family: 'Arial', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .lesson-plan-container {
              width: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            .header {
              text-align: center;
              margin-bottom: 6mm;
            }
            .school-name {
              font-size: 20pt;
              font-weight: bold;
              text-transform: uppercase;
              color: #1e3a8a;
              margin-bottom: 2px;
            }
            .school-details {
              font-size: 9pt;
              color: #475569;
              font-weight: 600;
            }
            .form-title {
              font-size: 15pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #334155;
              margin: 4mm 0 6mm 0;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 2mm;
            }
            .lesson-plan-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #1e3a8a;
            }
            .lesson-plan-table td {
              border: 1px solid #1e3a8a;
              padding: 4mm 5mm;
              font-size: 10pt;
              vertical-align: middle;
              box-sizing: border-box;
            }
            .label-cell {
              width: 18%;
              font-weight: bold;
              color: #1e3a8a;
            }
            .line-cell {
              width: 32%;
            }
            .blank-cell {
              width: 18%;
            }
            .write-line {
              display: inline-block;
              border-bottom: 1.2px solid #cbd5e1;
              width: 95%;
              height: 16px;
            }
          </style>
        </head>
        <body>
          <div class="lesson-plan-container">
            <div class="header">
              <div class="school-name">${schoolName}</div>
              ${schoolAddress ? `<div class="school-details">${schoolAddress}</div>` : ''}
              <div class="form-title">One-Page Lesson Plan Structure</div>
            </div>
            
            <table class="lesson-plan-table">
              <tbody>
                <tr style="height: 15mm;">
                  <td class="label-cell"><strong>Subject:</strong></td>
                  <td style="width: 32%; font-weight: bold;">
                    ${lessonPlanSubject ? lessonPlanSubject : '<span class="write-line"></span>'}
                  </td>
                  <td class="label-cell"><strong>Class/Grade:</strong></td>
                  <td style="width: 32%; font-weight: bold;">
                    ${lessonPlanGrade ? lessonPlanGrade : '<span class="write-line"></span>'}
                  </td>
                </tr>
                <tr style="height: 15mm;">
                  <td class="label-cell"><strong>Topic:</strong></td>
                  <td><span class="write-line"></span></td>
                  <td class="label-cell"><strong>Date:</strong></td>
                  <td style="font-weight: bold;">
                    ${lessonPlanDate ? new Date(lessonPlanDate).toLocaleDateString('en-GB') : '<span class="write-line"></span>'}
                  </td>
                </tr>
                <tr style="height: 15mm;">
                  <td class="label-cell"><strong>Duration:</strong></td>
                  <td><span class="write-line"></span></td>
                  <td class="label-cell"><strong>Teacher:</strong></td>
                  <td style="font-weight: bold;">
                    ${lessonPlanTeacher ? lessonPlanTeacher : '<span class="write-line"></span>'}
                  </td>
                </tr>
                ${tableRowsHTML}
              </tbody>
            </table>
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

  // Print Result Form (with Class Position column)
  function handlePrintResultForm() {
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

    // Filter students
    const filteredStudents = students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection))
    
    // Compute total obtained and total max marks for ranking
    const studentsWithTotals = filteredStudents.map(s => {
      let totalObtained = 0
      let totalMax = 0
      let hasAnyMarks = false

      classSubjects.forEach(sub => {
        const resultObj = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id)
        if (resultObj) {
          totalObtained += Number(resultObj.marks_obtained) || 0
          totalMax += Number(resultObj.total_marks) || 100
          hasAnyMarks = true
        }
      })

      return {
        student: s,
        totalObtained,
        totalMax,
        hasAnyMarks
      }
    })

    // Sort students by totalObtained DESC
    studentsWithTotals.sort((a, b) => b.totalObtained - a.totalObtained)

    // Assign positions (ranking)
    let currentRank = 0
    let lastMarks = -1
    let rankCounter = 0

    const rankedStudents = studentsWithTotals.map((item, idx) => {
      if (!item.hasAnyMarks) {
        return { ...item, positionText: '—', position: 9999 }
      }
      
      rankCounter++
      if (item.totalObtained !== lastMarks) {
        currentRank = rankCounter
        lastMarks = item.totalObtained
      }

      let suffix = 'th'
      if (currentRank === 1) suffix = 'st'
      else if (currentRank === 2) suffix = 'nd'
      else if (currentRank === 3) suffix = 'rd'

      const positionText = `${currentRank}${suffix}`
      return {
        ...item,
        position: currentRank,
        positionText
      }
    })

    // Sort by roll no to match the Award List layout
    rankedStudents.sort((a, b) => {
      const aRoll = Number(a.student.roll_no) || 9999
      const bRoll = Number(b.student.roll_no) || 9999
      if (aRoll !== bRoll) return aRoll - bRoll
      return a.student.name.localeCompare(b.student.name)
    })

    const totalMarks = awardTotalMarks || '100'

    const rowsHTML = rankedStudents.map((item, idx) => {
      const s = item.student
      const totalObtained = item.totalObtained
      const totalMax = item.totalMax
      const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) + '%' : '—'
      const totalDisplay = totalMax > 0 ? `${totalObtained} / ${totalMax}` : '—'
      
      const subjectCellsHTML = classSubjects.map(sub => {
        const resultObj = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id)
        if (resultObj) {
          return `<td>${resultObj.marks_obtained}</td>`
        }
        return `<td>—</td>`
      }).join('')

      const isTop3 = item.position === 1 || item.position === 2 || item.position === 3
      const positionDisplay = isTop3 ? `<strong>${item.positionText}</strong>` : item.positionText
      
      return `
        <tr>
          <td>${idx + 1}</td>
          <td class="roll-no">${s.roll_no || '—'}</td>
          <td class="student-name">${s.name}</td>
          ${subjectCellsHTML}
          <td class="marks-obtained" style="font-weight: bold;">${totalDisplay}</td>
          <td class="percentage" style="font-weight: bold;">${percentage}</td>
          <td class="position-col">${positionDisplay}</td>
        </tr>
      `
    }).join('')

    win.document.write(`
      <html>
        <head>
          <title>Result Form - Class ${className} - ${examName}</title>
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
            .award-table td.position-col {
              font-weight: 500;
              font-size: 13px;
              color: #1e3a8a;
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
            <div class="sheet-title">STUDENT CLASS RESULT SHEET (WITH POSITIONS)</div>
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
                <th>Class Position</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || `<tr><td colspan="${4 + classSubjects.length + 2}" style="padding: 20px; color: #555;">No registered students found in the selected class and section.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-block">
              <div class="sig-line">Teacher Sign</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">Principal Sign</div>
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
      <style dangerouslySetInnerHTML={{ __html: `
        .cert-underline {
          font-weight: 800;
          color: #1a1a1a;
          border-bottom: none;
          padding: 0 4px;
          display: inline;
        }
      `}} />
      
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
            <button className={`nav-item ${activeDoc === 'result_form' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('result_form')}>
              <span style={{ marginRight: '0.5rem' }}>🎓</span> Result Form
            </button>
            <button className={`nav-item ${activeDoc === 'progress_report' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('progress_report')}>
              <span style={{ marginRight: '0.5rem' }}>📈</span> Progress Report Card
            </button>
            <button className={`nav-item ${activeDoc === 'diary' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('diary')}>
              <span style={{ marginRight: '0.5rem' }}>📔</span> Class Diary Sheet
            </button>
            <button className={`nav-item ${activeDoc === 'lesson_plan' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setActiveDoc('lesson_plan')}>
              <span style={{ marginRight: '0.5rem' }}>📋</span> Lesson Plan Structure
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
            {activeDoc === 'result_form' && '🎓 Student Class Result Sheet'}
            {activeDoc === 'progress_report' && '📈 Monthly Progress Report Card'}
            {activeDoc === 'diary' && '📔 Daily Class Diary Sheet'}
            {activeDoc === 'lesson_plan' && '📋 One-Page Lesson Plan Structure'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {activeDoc === 'slc' && 'Customize default templates and print official release papers.'}
            {activeDoc === 'birth' && 'Record and generate formal proof of birth documents.'}
            {activeDoc === 'character' && 'Generate certified student character evaluations and conduct ratings.'}
            {activeDoc === 'sports' && 'Award students for tournament excellence and sports participation.'}
            {activeDoc === 'top_positions' && 'Honor academic excellence in class final, mid or monthly tests.'}
            {activeDoc === 'admission' && 'Print blank or prefilled student registration templates.'}
            {activeDoc === 'award_list' && 'Create examiner grade tables with student indices for marking sheets.'}
            {activeDoc === 'result_form' && 'Generate class-wide student result summaries containing all subject marks and calculated class positions.'}
            {activeDoc === 'progress_report' && 'Print blank student monthly progress reports to fill manually.'}
            {activeDoc === 'diary' && 'Print blank daily class diary sheets containing class subjects.'}
            {activeDoc === 'lesson_plan' && 'Print blank or prefilled teacher lesson planning forms.'}
          </p>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '1000px' }}>
            {msg.text}
          </div>
        )}

        {/* Tab Selection (only for customizable certificates) */}
        {activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && activeDoc !== 'result_form' && activeDoc !== 'diary' && activeDoc !== 'lesson_plan' && (
          <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
            <button className={`tab-btn ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
              ⚡ Generate Document
            </button>
            <button className={`tab-btn ${tab === 'template' ? 'active' : ''}`} onClick={() => setTab('template')}>
              ⚙️ Customize Paragraph
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
            {tab === 'generate' && activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && activeDoc !== 'result_form' && activeDoc !== 'diary' && activeDoc !== 'lesson_plan' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                
                {/* Inputs card */}
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Variables & Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Filter Class</label>
                        <select className="form-select" value={certClassFilter} onChange={e => { setCertClassFilter(e.target.value); setCertSectionFilter('') }}>
                          <option value="">All Classes</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Filter Section</label>
                        <select className="form-select" value={certSectionFilter} onChange={e => setCertSectionFilter(e.target.value)}>
                          <option value="">All Sections</option>
                          {sections.filter(s => !certClassFilter || s.class_id === certClassFilter).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Select Student *</label>
                      {filteredCertStudents.length === 0 ? (
                        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ No students match the active filters.</p>
                      ) : (
                        <select className="form-select" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                          <option value="">Select Student</option>
                          {filteredCertStudents.map(s => (
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
                      position: 'relative',
                      border: '1px solid #1c1c1c',
                      padding: '1.25rem',
                      background: '#fdfbf7',
                      color: '#2c2c2c',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      aspectRatio: '1.414 / 1',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                      {/* Nested border layout */}
                      <div style={{ position: 'absolute', top: '3px', left: '3px', right: '3px', bottom: '3px', border: '5px solid #c5a85c', pointerEvents: 'none', zIndex: 10 }}></div>
                      <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '0.75px solid #1c1c1c', pointerEvents: 'none', zIndex: 10 }}></div>
                      <div style={{ position: 'absolute', top: '13px', left: '13px', right: '13px', bottom: '13px', border: '1px double #b19343', pointerEvents: 'none', zIndex: 10 }}></div>
                      <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', bottom: '16px', border: '0.5px solid #1c1c1c', pointerEvents: 'none', zIndex: 10 }}></div>

                      {/* Corner triangles */}
                      <div style={{ position: 'absolute', top: '8px', left: '8px', width: '22px', height: '22px', background: '#4e3620', clipPath: 'polygon(0 0, 100% 0, 0 100%)', pointerEvents: 'none', zIndex: 20 }}></div>
                      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px', background: '#4e3620', clipPath: 'polygon(0 0, 100% 0, 100% 100%)', pointerEvents: 'none', zIndex: 20 }}></div>
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '22px', height: '22px', background: '#4e3620', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', pointerEvents: 'none', zIndex: 20 }}></div>
                      <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '22px', height: '22px', background: '#4e3620', clipPath: 'polygon(0 0, 100% 100%, 0 100%)', pointerEvents: 'none', zIndex: 20 }}></div>

                      {/* Gold Ribbon Seal */}
                      <div style={{ position: 'absolute', top: '18px', left: '26px', zIndex: 12, width: '30px', height: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '15px', display: 'flex', justifyContent: 'space-between', width: '20px', height: '26px', zIndex: 1 }}>
                          <div style={{ width: '7px', height: '100%', background: '#c5a85c', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', transform: 'rotate(-8deg)' }}></div>
                          <div style={{ width: '7px', height: '100%', background: '#b19343', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', transform: 'rotate(8deg)' }}></div>
                        </div>
                        <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '50%', background: 'radial-gradient(circle, #f3e5ab 0%, #d4af37 60%, #aa7c11 100%)', border: '1px double #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', zIndex: 2 }}>
                          <span style={{ fontSize: '10px' }}>🎓</span>
                        </div>
                      </div>

                      {/* Content wrapper */}
                      <div style={{ position: 'relative', zIndex: 11, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 0, padding: '36px 14px 10px 14px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4px', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: "'Cinzel', serif", color: '#4e3620', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {schoolName}
                          </div>
                          
                          <div style={{ textAlign: 'center', margin: '14px 0 2px 0' }}>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', fontWeight: 800, color: '#c5a85c', letterSpacing: '1px', textTransform: 'uppercase', lineHeight: '1.1' }}>
                              {template.title || 'CERTIFICATE'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '2px' }}>
                              <span style={{ borderBottom: '0.75px solid #c5a85c', width: '30px', display: 'inline-block' }}></span>
                              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.55rem', fontStyle: 'italic', color: '#4e3620', fontWeight: 600 }}>
                                Of Achievement
                              </span>
                              <span style={{ borderBottom: '0.75px solid #c5a85c', width: '30px', display: 'inline-block' }}></span>
                            </div>
                          </div>
                        </div>

                        <div style={{ 
                          margin: '2px 0', 
                          textAlign: 'justify', 
                          textIndent: '15px',
                          fontSize: '0.54rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-line', 
                          flex: '1 1 auto', 
                          minHeight: 0, 
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }} dangerouslySetInnerHTML={{ __html: compiledPreviewBody }}>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.55rem', color: '#555' }}>
                            <strong>Date:</strong> <span style={{ borderBottom: '0.75px solid #000', display: 'inline-block', minWidth: '40px', fontWeight: 'bold' }}>{new Date().toLocaleDateString()}</span>
                          </div>
                          
                          <div style={{ position: 'relative' }}>
                            {/* Signature stamp seal */}
                            <div style={{ position: 'absolute', bottom: '6px', right: '15px', width: '22px', height: '22px', border: '0.5px solid rgba(28, 70, 160, 0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)', zIndex: 10 }}>
                              <span style={{ fontSize: '2px', color: 'rgba(28, 70, 160, 0.6)', fontWeight: 'bold' }}>APPROVED</span>
                            </div>
                            <div style={{ textAlign: 'center', borderTop: '0.75px solid #000', width: '70px', paddingTop: '2px', fontSize: '0.5rem', fontWeight: 'bold', color: '#4a3e28', fontFamily: "'Cinzel', serif" }}>
                              {template.signature_title}
                            </div>
                          </div>
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
            {tab === 'template' && activeDoc !== 'admission' && activeDoc !== 'award_list' && activeDoc !== 'progress_report' && activeDoc !== 'result_form' && activeDoc !== 'diary' && activeDoc !== 'lesson_plan' && (
              <div className="card" style={{ maxWidth: '800px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚙️ Configure Certificate Paragraph</h3>
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
                    <label className="form-label">Certificate Customizable Paragraph Text *</label>
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

            {/* ── CLASS DIARY VIEW ── */}
            {activeDoc === 'diary' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Class Diary Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div className="form-group">
                      <label className="form-label">Prefill from Class</label>
                      <select className="form-select" value={diaryClassFilter} onChange={e => setDiaryClassFilter(e.target.value)}>
                        <option value="">Custom (Standard Subjects)</option>
                        {classes.map(c => <option key={c.id} value={c.id}>Grade {c.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Grade/Class Text</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 10th Class" 
                        value={diaryGrade} 
                        onChange={e => setDiaryGrade(e.target.value)} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Edit Table Subjects (One per line)</label>
                      <textarea
                        className="form-textarea"
                        rows={10}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        value={diarySubjects.join('\n')}
                        onChange={e => setDiarySubjects(e.target.value.split('\n'))}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Customize subjects. Note: This sheet prints 3 diaries stacked vertically on a single A4 page.
                      </span>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }} onClick={handlePrintDiary}>
                      🖨️ Print Diary Sheet
                    </button>
                  </div>
                </div>

                {/* Diary Sheet Preview */}
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
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}>
                    {/* Render all 3 stacked in preview to show exact layout */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div style={{ height: '31%', overflow: 'hidden', border: '1px dashed #ddd', padding: '5px' }}>
                        <div dangerouslySetInnerHTML={{ __html: getDiaryPreviewHtml() }} style={{ height: '100%' }} />
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', borderTop: '1px dashed #000', margin: '2px 0' }}>✂️ [Cut Line]</div>
                      <div style={{ height: '31%', overflow: 'hidden', border: '1px dashed #ddd', padding: '5px' }}>
                        <div dangerouslySetInnerHTML={{ __html: getDiaryPreviewHtml() }} style={{ height: '100%' }} />
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', borderTop: '1px dashed #000', margin: '2px 0' }}>✂️ [Cut Line]</div>
                      <div style={{ height: '31%', overflow: 'hidden', border: '1px dashed #ddd', padding: '5px' }}>
                        <div dangerouslySetInnerHTML={{ __html: getDiaryPreviewHtml() }} style={{ height: '100%' }} />
                      </div>
                    </div>
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

            {/* ── RESULT FORM (WITH POSITIONS) VIEW ── */}
            {activeDoc === 'result_form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
                
                {/* Filters card */}
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Result Form Selection</h3>
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
                        <h3 style={{ fontWeight: 700 }}>Result Form Preview</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Showing students in {classes.find(c => c.id === awardClass)?.name} &nbsp;•&nbsp; Exam: {examTypes.find(e => e.id === awardExam)?.name} &nbsp;•&nbsp; Total Marks: {awardTotalMarks}
                        </p>
                      </div>
                      <button className="btn btn-primary" onClick={handlePrintResultForm}>
                        🖨️ Print Result Form
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
                              {classSubjects.map(sub => (
                                <th key={sub.id} colSpan={2} style={{ textAlign: 'center' }}>{sub.name}</th>
                              ))}
                              <th rowSpan={2} style={{ width: '120px' }}>Total Marks</th>
                              <th rowSpan={2} style={{ width: '100px' }}>%age</th>
                              <th rowSpan={2} style={{ width: '120px' }}>Class Position</th>
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
                            {(() => {
                              const filtered = students.filter(s => s.class_id === awardClass && (!awardSection || s.section_id === awardSection));
                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6 + (classSubjects.length * 2)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                      No registered student rows found for this filter selection.
                                    </td>
                                  </tr>
                                );
                              }

                              // Compute totals and sort for positions
                              const studentsWithTotals = filtered.map(s => {
                                let totalObtained = 0;
                                let totalMax = 0;
                                let hasAnyMarks = false;

                                classSubjects.forEach(sub => {
                                  const res = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id);
                                  if (res) {
                                    totalObtained += Number(res.marks_obtained) || 0;
                                    totalMax += Number(res.total_marks) || 100;
                                    hasAnyMarks = true;
                                  }
                                });

                                return {
                                  student: s,
                                  totalObtained,
                                  totalMax,
                                  hasAnyMarks
                                };
                              });

                              studentsWithTotals.sort((a, b) => b.totalObtained - a.totalObtained);

                              let currentRank = 0;
                              let lastMarks = -1;
                              let rankCounter = 0;

                              const ranked = studentsWithTotals.map((item) => {
                                if (!item.hasAnyMarks) {
                                  return { ...item, positionText: '—', position: 9999 };
                                }
                                
                                rankCounter++;
                                if (item.totalObtained !== lastMarks) {
                                  currentRank = rankCounter;
                                  lastMarks = item.totalObtained;
                                }

                                let suffix = 'th';
                                if (currentRank === 1) suffix = 'st';
                                else if (currentRank === 2) suffix = 'nd';
                                else if (currentRank === 3) suffix = 'rd';

                                return {
                                  ...item,
                                  position: currentRank,
                                  positionText: `${currentRank}${suffix}`
                                };
                              });

                              // Sort back to roll no order to match Award List format
                              ranked.sort((a, b) => {
                                const aRoll = Number(a.student.roll_no) || 9999;
                                const bRoll = Number(b.student.roll_no) || 9999;
                                if (aRoll !== bRoll) return aRoll - bRoll;
                                return a.student.name.localeCompare(b.student.name);
                              });

                              return ranked.map((item, idx) => {
                                const s = item.student;
                                const totalObtained = item.totalObtained;
                                const totalMax = item.totalMax;
                                const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) + '%' : '—';
                                const totalDisplay = totalMax > 0 ? `${totalObtained} / ${totalMax}` : '—';
                                
                                const subjectCells = classSubjects.map(sub => {
                                  const res = awardResults.find(r => r.student_id === s.id && r.subject_id === sub.id);
                                  const obt = res ? res.marks_obtained : '—';
                                  const total = res ? res.total_marks : '100';
                                  return (
                                    <Fragment key={sub.id}>
                                      <td style={{ textAlign: 'center' }}>{total}</td>
                                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{obt}</td>
                                    </Fragment>
                                  );
                                });

                                const isTop3 = item.position === 1 || item.position === 2 || item.position === 3;

                                return (
                                  <tr key={s.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                    <td style={{ fontWeight: 'bold' }}>{s.roll_no || '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    {subjectCells}
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{totalDisplay}</td>
                                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{percentage}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: isTop3 ? '900' : 'normal', fontSize: isTop3 ? '1.05rem' : 'inherit' }}>
                                      {isTop3 ? <strong>{item.positionText}</strong> : item.positionText}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Select Class and Exam Type filters above to generate the class result positions sheet.
                  </div>
                )}
              </div>
            )}

            {/* ── LESSON PLAN VIEW ── */}
            {activeDoc === 'lesson_plan' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', maxWidth: '1250px', alignItems: 'start' }}>
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Lesson Plan Prefill Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Prefill Class</label>
                        <select className="form-select" value={lessonPlanClassFilter} onChange={e => {
                          setLessonPlanClassFilter(e.target.value)
                          const className = classes.find(c => c.id === e.target.value)?.name || ''
                          setLessonPlanGrade(className ? `${className} Grade` : '')
                          setLessonPlanSubjectFilter('')
                        }}>
                          <option value="">Blank (No prefill)</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prefill Subject</label>
                        <select className="form-select" value={lessonPlanSubjectFilter} onChange={e => {
                          setLessonPlanSubjectFilter(e.target.value)
                          const subName = subjects.find(s => s.id === e.target.value)?.name || ''
                          setLessonPlanSubject(subName)
                        }} disabled={!lessonPlanClassFilter}>
                          <option value="">Blank (No prefill)</option>
                          {subjects.filter(s => s.class_id === lessonPlanClassFilter).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Class/Grade Label</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 10th Class" 
                        value={lessonPlanGrade} 
                        onChange={e => setLessonPlanGrade(e.target.value)} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject Label</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Chemistry" 
                        value={lessonPlanSubject} 
                        onChange={e => setLessonPlanSubject(e.target.value)} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teacher Label</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Mr. John Doe" 
                        value={lessonPlanTeacher} 
                        onChange={e => setLessonPlanTeacher(e.target.value)} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date Label</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={lessonPlanDate} 
                        onChange={e => setLessonPlanDate(e.target.value)} 
                      />
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }} onClick={handlePrintLessonPlan}>
                      🖨️ Print Lesson Plan Form
                    </button>
                  </div>
                </div>

                {/* Lesson Plan Preview */}
                <div className="card" style={{ background: '#fcfcfc', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', color: '#111', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, color: '#333', marginBottom: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', width: '100%' }}>
                    Form Sheet Preview
                  </h3>

                  <div style={{ 
                    border: '1px solid #777', 
                    background: '#fff', 
                    boxSizing: 'border-box', 
                    width: '210mm', 
                    height: '297mm',
                    minWidth: '210mm',
                    minHeight: '297mm',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: getLessonPlanPreviewHtml() }} style={{ height: '100%' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
