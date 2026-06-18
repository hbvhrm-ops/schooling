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
    title: 'SCHOOL LEAVING CERTIFICATE',
    body_text: '',
    signature_title: 'Principal',
  })
  const [loading, setLoading] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

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
    return body
      .replace(/{name}/g, student.name || '')
      .replace(/{father_name}/g, student.father_name || '—')
      .replace(/{class_name}/g, student.class_name || '—')
      .replace(/{roll_no}/g, student.roll_no || '—')
      .replace(/{dob}/g, student.dob ? new Date(student.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      .replace(/{leaving_date}/g, leavingDate ? new Date(leavingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—')
      .replace(/{leaving_reason}/g, leavingReason || '—')
      .replace(/{conduct}/g, conduct || '—')
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSavingTemplate(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/slc-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrlForm.trim(),
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

  function handlePrint() {
    if (!selectedStudent) return
    const compiledBody = compileTemplate(template.body_text, selectedStudent)
    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
      <html>
        <head>
          <title>SLC - ${selectedStudent.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
            body {
              font-family: 'Playfair Display', serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #2c2c2c;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .certificate-container {
              max-width: 800px;
              margin: 30px auto;
              padding: 10px;
              box-sizing: border-box;
            }
            .border-outer {
              border: 10px double #4a3e28;
              padding: 5px;
              background: #fdfbf7;
            }
            .border-inner {
              border: 2px solid #6e5a3c;
              padding: 40px 50px;
              position: relative;
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
            }
            .header {
              text-align: center;
              margin-bottom: 35px;
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
              font-size: 18px;
              line-height: 2.1;
              text-align: justify;
              margin: 35px 0;
              white-space: pre-line;
              text-indent: 30px;
            }
            .cert-body strong {
              font-weight: 600;
              color: #000;
              border-bottom: 1px dashed #666;
              padding: 0 4px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 60px;
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
                max-width: 100%;
                width: 100%;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
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
                    ${template.logo_url ? `<img class="logo" src="${template.logo_url}" alt="School Logo" />` : '<div class="logo-placeholder">🏫</div>'}
                    <div class="school-title">EduManage School System</div>
                    <div class="cert-title">${template.title}</div>
                    <div class="cert-subtitle">Official Academic Release Certificate</div>
                  </div>
                  <div class="cert-body">
                    ${compiledBody.replace(/([^{}\n]+)/g, (match) => {
                      // We wrap dynamic variables values inside <strong> for custom styling on printouts
                      return match
                    })}
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
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  // Pre-compiled preview helper
  const previewText = selectedStudent ? compileTemplate(template.body_text, selectedStudent) : ''

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
          ⚙️ Customize Template
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
                      {template.logo_url ? (
                        <img
                          src={template.logo_url}
                          alt="School Logo"
                          style={{ maxHeight: '60px', marginBottom: '8px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>🏫</div>
                      )}
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold', color: '#4a3e28' }}>
                        EduManage School System
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '1px', color: '#6e5a3c', margin: '8px 0 2px', textTransform: 'uppercase' }}>
                        {template.title}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#777', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Official Academic Release Certificate
                      </div>
                    </div>

                    <div style={{ margin: '1.5rem 0', textAlign: 'justify', whiteSpace: 'pre-line' }}>
                      {previewText}
                    </div>

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
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⚙️ Configure Certificate Template</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Define default layouts, headings, and certificate text. Use variables inside curly brackets to inject student data dynamically.
              </p>

              <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label">School Logo URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/logo.png"
                    value={logoUrlForm}
                    onChange={e => setLogoUrlForm(e.target.value)}
                  />
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
                  <label className="form-label">Customizable Certificate Body Text *</label>
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
