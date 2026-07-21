'use client'
import { useState, useEffect, useCallback } from 'react'

interface Student {
  id: string
  name: string
  father_name: string
  class_name: string
  section_name: string
  roll_no: string
  gender: string
  dob?: string
  contact: string
  status: string
  reg_date: string
}

interface SlcTemplate {
  logo_url: string
  title: string
  body_text: string
  signature_title: string
}

type Tab = 'generate' | 'template'

export default function SlcPage() {
  const [tab, setTab] = useState<Tab>('generate')
  const [students, setStudents] = useState<Student[]>([])
  const [template, setTemplate] = useState<SlcTemplate>({
    logo_url: '',
    title: 'School Leaving Certificate',
    body_text: '',
    signature_title: 'Principal',
  })
  const [loading, setLoading] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [schoolLogo, setSchoolLogo] = useState('')
  const [schoolContact, setSchoolContact] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolPsra, setSchoolPsra] = useState('')
  const [schoolBise, setSchoolBise] = useState('')

  // Certificate variables state
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [leavingDate, setLeavingDate] = useState(new Date().toISOString().split('T')[0])
  const [leavingReason, setLeavingReason] = useState('Completion of studies')
  const [conduct, setConduct] = useState('Excellent')

  // Edit template form states
  const [logoUrlForm, setLogoUrlForm] = useState('')
  const [titleForm, setTitleForm] = useState('')
  const [bodyTextForm, setBodyTextForm] = useState('')
  const [signatureTitleForm, setSignatureTitleForm] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const [sr, tr] = await Promise.all([
        fetch('/api/school/students').then(r => r.json()).catch(() => ({})),
        fetch('/api/school/slc-template').then(r => r.json()).catch(() => ({})),
      ])

      const fetchedStudents = sr.students || []
      setStudents(fetchedStudents)

      if (fetchedStudents.length > 0) {
        setSelectedStudentId(fetchedStudents[0].id)
      }

      if (tr.schoolName) {
        setSchoolName(tr.schoolName)
      }
      if (tr.schoolLogo) {
        setSchoolLogo(tr.schoolLogo)
      }
      if (tr.schoolContact) {
        setSchoolContact(tr.schoolContact)
      }
      if (tr.schoolAddress) {
        setSchoolAddress(tr.schoolAddress)
      }
      if (tr.schoolPsra) {
        setSchoolPsra(tr.schoolPsra)
      }
      if (tr.schoolBise) {
        setSchoolBise(tr.schoolBise)
      }
      if (tr.template) {
        setTemplate(tr.template)
        setLogoUrlForm(tr.template.logo_url || '')
        setTitleForm(tr.template.title || '')
        setBodyTextForm(tr.template.body_text || '')
        setSignatureTitleForm(tr.template.signature_title || '')
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error loading page data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  function compileTemplate(body: string, student: Student) {
    if (!body) return ''
    const wrap = (val: string) => `<strong style="font-weight: 700; color: #000; border-bottom: 1px dashed #666; padding: 0 3px; display: inline;">${val}</strong>`
    const normalizedBody = body.replace(/\s+/g, ' ').trim()
    return normalizedBody
      .replace(/{name}/g, wrap(student.name || ''))
      .replace(/{father_name}/g, wrap(student.father_name || '—'))
      .replace(/{class_name}/g, wrap(student.class_name || '—'))
      .replace(/{roll_no}/g, wrap(student.roll_no || '—'))
      .replace(/{dob}/g, wrap(student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      .replace(/{leaving_date}/g, wrap(leavingDate ? new Date(leavingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'))
      .replace(/{leaving_reason}/g, wrap(leavingReason || '—'))
      .replace(/{conduct}/g, wrap(conduct || '—'))
  }

  // Dynamic font sizing & line-height helper based on text character count
  function getDynamicCertBodyStyles(text: string, isPreview: boolean = false) {
    const cleanText = (text || '').replace(/<[^>]*>/g, '').trim()
    const len = cleanText.length

    if (isPreview) {
      if (len <= 150) {
        return { fontSize: '1.1rem', lineHeight: '2.2' }
      } else if (len <= 250) {
        return { fontSize: '0.95rem', lineHeight: '1.9' }
      } else if (len <= 380) {
        return { fontSize: '0.82rem', lineHeight: '1.7' }
      } else {
        return { fontSize: '0.72rem', lineHeight: '1.5' }
      }
    } else {
      if (len <= 150) {
        return { fontSize: '22px', lineHeight: '2.3' }
      } else if (len <= 250) {
        return { fontSize: '18px', lineHeight: '2.1' }
      } else if (len <= 380) {
        return { fontSize: '16px', lineHeight: '1.8' }
      } else {
        return { fontSize: '13.5px', lineHeight: '1.6' }
      }
    }
  }

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
      const res = await fetch('/api/school/slc-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrl,
          title: titleForm.trim(),
          body_text: bodyTextForm,
          signature_title: signatureTitleForm.trim(),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'success', text: 'Certificate template updated successfully!' })
        if (data.schoolName) {
          setSchoolName(data.schoolName)
        }
        if (data.schoolLogo) {
          setSchoolLogo(data.schoolLogo)
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

  function handlePrint() {
    if (!selectedStudent) return
    const compiledBody = compileTemplate(template.body_text, selectedStudent)
    const printBodyStyles = getDynamicCertBodyStyles(compiledBody, false)
    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <html>
        <head>
          <title>SLC - ${selectedStudent.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
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
              width: 100vw;
              height: 100vh;
              padding: 5vh 6vw;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fdfbf7;
            }
            .border-outer {
              border: 10px double #4a3e28;
              padding: 5px;
              height: 100%;
              box-sizing: border-box;
            }
            .border-inner {
              border: 2px solid #6e5a3c;
              padding: 4vh 5vw;
              position: relative;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .badge-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 260px;
              opacity: 0.04;
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
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
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
              font-size: 20px;
              font-weight: 700;
              color: #4a3e28;
              letter-spacing: 1px;
              margin-bottom: 5px;
            }
            .cert-title {
              font-family: 'Cinzel', serif;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 3px;
              margin: 15px 0 5px;
              color: #6e5a3c;
              text-transform: uppercase;
              border-bottom: 2px double #6e5a3c;
              display: inline-block;
              padding-bottom: 4px;
            }
            .cert-subtitle {
              font-size: 12px;
              color: #777;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 25px;
            }
            .cert-body {
              font-size: ${printBodyStyles.fontSize};
              line-height: ${printBodyStyles.lineHeight};
              text-align: justify;
              margin: 20px 0;
              text-indent: 40px;
              flex: 1;
            }
            .cert-body strong {
              font-weight: 700;
              color: #000;
              border-bottom: 1px dashed #666;
              padding: 0 3px;
              display: inline;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
            }
            .sig-block {
              text-align: center;
              width: 220px;
            }
            .sig-line {
              border-top: 1px solid #777;
              margin-top: 50px;
              padding-top: 6px;
              font-family: 'Cinzel', serif;
              font-size: 13px;
              font-weight: 700;
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
                width: 100vw;
                height: 100vh;
                max-width: 100%;
                max-height: 100%;
              }
              .border-outer {
                border-width: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <div class="border-outer">
              <div class="border-inner">
                <div class="badge-watermark">🏫</div>
                <div class="content-wrapper">
                  <div class="header">
                    ${(template.logo_url || schoolLogo) ? `<img class="logo" src="${template.logo_url || schoolLogo}" alt="School Logo" />` : '<div class="logo-placeholder">🏫</div>'}
                    <div class="school-title">${schoolName || 'EduManage School System'}</div>
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
                    <div class="cert-subtitle">Official Academic Release Certificate</div>
                  </div>
                  <div class="cert-body">
                    <p style="margin: 0; text-indent: 40px; line-height: 2.1; text-align: justify;">${compiledBody}</p>
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

  // Pre-compiled preview helper
  const previewText = selectedStudent ? compileTemplate(template.body_text, selectedStudent) : ''
  const previewBodyStyles = getDynamicCertBodyStyles(previewText, true)

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📜 School Leaving Certificate (SLC)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Customize, save, and print official school leaving certificates</p>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '1000px' }}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          📜 Generate Certificate
        </button>
        <button className={`tab-btn ${tab === 'template' ? 'active' : ''}`} onClick={() => setTab('template')}>
          ⚙️ Customize Paragraph
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ⏳ Loading SLC module records...
        </div>
      ) : (
        <>
          {/* Generate Tab */}
          {tab === 'generate' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.5rem', maxWidth: '1200px', alignItems: 'start' }}>
              
              {/* Form Input Card */}
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Student Intake Data</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  
                  <div className="form-group">
                    <label className="form-label">Select Student *</label>
                    {students.length === 0 ? (
                      <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ No students registered. Please add students first.</p>
                    ) : (
                      <select
                        className="form-select"
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Roll: {s.roll_no || '—'}) - {s.class_name || '—'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Leaving Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={leavingDate}
                      onChange={e => setLeavingDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason for Leaving *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Completed Grade 10 / Relocating"
                      value={leavingReason}
                      onChange={e => setLeavingReason(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Character & Conduct *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Excellent / Exemplary / Good"
                      value={conduct}
                      onChange={e => setConduct(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    onClick={handlePrint}
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', justifyContent: 'center' }}
                    disabled={!selectedStudentId}
                  >
                    🖨️ Print Certificate
                  </button>
                </div>
              </div>

              {/* Certificate Preview Card */}
              <div className="card" style={{ background: '#faf6f0', border: '1px solid #d4c5b3' }}>
                <h3 style={{ fontWeight: 700, color: '#4a3e28', marginBottom: '1.25rem', borderBottom: '1px solid #d4c5b3', paddingBottom: '0.5rem' }}>
                  Live Document Preview
                </h3>

                {selectedStudent ? (
                  <div
                    style={{
                      border: '4px double #6e5a3c',
                      padding: '2rem 1.5rem',
                      background: '#fff',
                      color: '#2c2c2c',
                      fontFamily: 'Georgia, serif',
                      lineHeight: '1.8',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      {(template.logo_url || schoolLogo) ? (
                        <img
                          src={template.logo_url || schoolLogo}
                          alt="School Logo"
                          style={{ maxHeight: '60px', marginBottom: '8px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>🏫</div>
                      )}
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold', color: '#4a3e28' }}>
                        {schoolName || 'EduManage School System'}
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '1px', color: '#6e5a3c', margin: '8px 0 2px', textTransform: 'uppercase' }}>
                        {template.title}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#777', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Official Academic Release Certificate
                      </div>
                    </div>

                    <div style={{ margin: '1.5rem 0', textAlign: 'justify', textIndent: '30px', fontSize: previewBodyStyles.fontSize, lineHeight: previewBodyStyles.lineHeight, wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: previewText }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '3rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#555' }}>
                        <strong>Date:</strong> {new Date().toLocaleDateString()}
                      </div>
                      <div style={{ textAlign: 'center', borderTop: '1px solid #777', width: '150px', paddingTop: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: '#4a3e28' }}>
                        {template.signature_title}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Select a student on the left to see preview.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Template Configuration Tab */}
          {tab === 'template' && (
            <div className="card" style={{ maxWidth: '800px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚙️ Configure Certificate Paragraph</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Define default layouts, headings, and certificate text. Use variables inside curly brackets to inject student data dynamically.
              </p>

              <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label">School Logo (Upload Image/PDF or paste URL)</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      placeholder="Paste image/PDF URL or upload below..."
                      value={logoUrlForm}
                      onChange={e => setLogoUrlForm(e.target.value)}
                    />
                    <label className="btn btn-secondary btn-sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      📁 Choose File
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, application/pdf"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
                            if (!validTypes.includes(file.type)) {
                              alert('Invalid file type. Please upload a PNG, JPG, JPEG, or PDF file.')
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
                  </div>
                  {logoUrlForm && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', background: 'var(--bg-base)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {logoUrlForm.startsWith('data:image/') || logoUrlForm.startsWith('http') ? (
                        <img src={logoUrlForm} alt="Preview Logo" style={{ maxHeight: '40px', maxWidth: '40px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />
                      ) : (
                        <div style={{ fontSize: '1.5rem' }}>📄</div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {logoUrlForm.startsWith('data:') ? 'Uploaded local file' : logoUrlForm}
                      </div>
                      <button type="button" onClick={() => setLogoUrlForm('')} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Certificate Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={titleForm}
                    onChange={e => setTitleForm(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customizable Certificate Paragraph Text *</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5', padding: '0.75rem' }}
                    value={bodyTextForm}
                    onChange={e => setBodyTextForm(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {['{name}', '{father_name}', '{class_name}', '{roll_no}', '{dob}', '{leaving_date}', '{leaving_reason}', '{conduct}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setBodyTextForm(prev => prev + tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    💡 Tip: Click any of the variable buttons above to append them into the editor text caret position.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Signature Title (e.g. Principal) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={signatureTitleForm}
                    onChange={e => setSignatureTitleForm(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? '⏳ Saving Template...' : '💾 Save Template Config'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
