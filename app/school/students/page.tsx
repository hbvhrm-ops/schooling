'use client'
import { useState, useEffect, useCallback } from 'react'

interface Student {
  id: string; name: string; father_name: string; class_name: string; section_name: string;
  roll_no: string; gender: string; contact: string; status: string; reg_date: string; dob?: string;
  address?: string;
  additional_info?: Record<string, any>;
}
interface ClassItem { id: string; name: string }
interface SectionItem { id: string; name: string; class_id: string }
interface CustomField {
  id: string
  field_label: string
  field_type: 'text' | 'number' | 'dropdown'
  field_options: string | null
  is_required: boolean
}

type Tab = 'list' | 'register' | 'bulk' | 'promote'

export default function StudentsPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [classFilter, setClassFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewStudent, setViewStudent] = useState<Student | null>(null)
  const [form, setForm] = useState({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '' })
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customForm, setCustomForm] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  // Edit student states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '' })
  const [editCustomForm, setEditCustomForm] = useState<Record<string, string>>({})
  const [editingSubmitting, setEditingSubmitting] = useState(false)

  // Inline custom field creation states
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'dropdown'>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [addingField, setAddingField] = useState(false)

  // Student promotion states
  const [promoteFromClass, setPromoteFromClass] = useState('')
  const [promoteToClass, setPromoteToClass] = useState('')
  const [promoting, setPromoting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [sr, cr, fr] = await Promise.all([
      fetch('/api/school/students').then(r => r.json()).catch(() => ({})),
      fetch('/api/school/classes').then(r => r.json()).catch(() => ({})),
      fetch('/api/school/registration-fields').then(r => r.json()).catch(() => ({})),
    ])
    setStudents(sr.students || [])
    setClasses(cr.classes || [])
    setSections(cr.sections || [])
    setCustomFields(fr.fields || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filteredSections = sections.filter(s => !form.class_id || s.class_id === form.class_id)
  const filtered = students.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_no?.includes(search) || s.father_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    const matchClass = !classFilter || s.class_name === classFilter
    return matchSearch && matchStatus && matchClass
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg(null)
    
    // Validate custom fields
    const missing = customFields.filter(f => f.is_required && !customForm[f.field_label]?.trim())
    if (missing.length > 0) {
      setMsg({ type: 'danger', text: `Please fill in all required fields: ${missing.map(m => m.field_label).join(', ')}` })
      setSubmitting(false)
      return
    }

    const payload = { ...form, additional_info: customForm }
    const r = await fetch('/api/school/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json()
    if (!r.ok) { setMsg({ type: 'danger', text: d.error || 'Failed' }); setSubmitting(false); return }
    setMsg({ type: 'success', text: 'Student registered successfully!' })
    setForm({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '' })
    setCustomForm({})
    load(); setSubmitting(false)
  }

  async function handleDischarge(id: string) {
    if (!confirm('Discharge this student?')) return
    await fetch('/api/school/students', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'discharged' }) })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this student?')) return
    await fetch('/api/school/students', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function handleDeleteCustomField(id: string) {
    if (!confirm('Are you sure you want to remove this custom field requirement? Existing student data won\'t be deleted, but this field will no longer be asked during registration.')) return
    try {
      const res = await fetch('/api/school/registration-fields', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'Field requirement removed successfully.' })
        load()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to delete field' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    }
  }

  async function handlePromoteStudents() {
    if (!promoteFromClass || !promoteToClass) {
      setMsg({ type: 'danger', text: 'Please select both source and target classes' })
      return
    }
    if (promoteFromClass === promoteToClass) {
      setMsg({ type: 'danger', text: 'Source and target classes must be different' })
      return
    }
    if (!confirm('Are you sure you want to promote all active students from the selected class to the target class?')) return

    setPromoting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/school/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromClassId: promoteFromClass, toClassId: promoteToClass }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'Students promoted successfully!' })
        setPromoteFromClass('')
        setPromoteToClass('')
        load() // Refresh students list
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to promote students' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setPromoting(false)
    }
  }

  function printID(student: Student) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Student ID - ${student.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .id-card { background: white; border-radius: 12px; padding: 20px; max-width: 350px; margin: auto;
          border: 2px solid #6366f1; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg,#6366f1,#22d3ee); color:white; padding:15px; border-radius:8px; text-align:center; margin-bottom:15px; }
        .header h2 { margin:0; font-size:16px; } .header p { margin:3px 0; font-size:11px; opacity:0.9; }
        .photo-placeholder { width:80px; height:80px; border-radius:50%; background:#e5e7eb; border:3px solid #6366f1;
          display:flex; align-items:center; justify-content:center; font-size:30px; margin:0 auto 10px; }
        .info { font-size:13px; } .info tr td { padding:4px 8px; }
        .info tr td:first-child { color:#666; font-weight:600; }
        .footer { text-align:center; margin-top:12px; font-size:10px; color:#999; }
      </style></head><body>
      <div class="id-card">
        <div class="header"><h2>🏫 Student ID Card</h2><p>Academic Year ${new Date().getFullYear()}</p></div>
        <div class="photo-placeholder">👤</div>
        <table class="info" width="100%">
          <tr><td>Name:</td><td><strong>${student.name}</strong></td></tr>
          <tr><td>Father:</td><td>${student.father_name || '—'}</td></tr>
          <tr><td>Class:</td><td>${student.class_name || '—'} ${student.section_name ? `(${student.section_name})` : ''}</td></tr>
          <tr><td>Roll No:</td><td>${student.roll_no || '—'}</td></tr>
          <tr><td>Gender:</td><td>${student.gender || '—'}</td></tr>
          <tr><td>Contact:</td><td>${student.contact || '—'}</td></tr>
        </table>
        <div class="footer">Issued: ${new Date().toLocaleDateString()} | EduManage School System</div>
      </div>
      <script>window.print();window.close();</script></body></html>`)
    win.document.close()
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>🎓 Students</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage student records and admissions</p>
        </div>
        <button onClick={() => { setTab('register'); setShowModal(true) }} className="btn btn-primary">➕ Register Student</button>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {(['list', 'register', 'bulk', 'promote'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'list' ? '📋 Student List' : t === 'register' ? '➕ Register' : t === 'bulk' ? '📥 Bulk Enrollment' : '⬆️ Promote'}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === 'list' && (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                <span className="search-icon">🔍</span>
                <input className="form-input" placeholder="Search by name, roll no, father name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="discharged">Discharged</option>
              </select>
              <select className="form-select" style={{ width: '160px' }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Students ({filtered.length})</h3>
            </div>
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🎓</div><p>No students found.</p></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table>
                  <thead><tr><th>#</th><th>Name</th><th>Father Name</th><th>Class</th><th>Roll No</th><th>Gender</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.father_name || '—'}</td>
                        <td><span className="badge badge-primary">{s.class_name || '—'} {s.section_name && `(${s.section_name})`}</span></td>
                        <td>{s.roll_no || '—'}</td>
                        <td>{s.gender || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.contact || '—'}</td>
                        <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <button onClick={() => setViewStudent(s)} className="btn btn-secondary btn-sm" title="View Profile">👁️</button>
                            <button type="button" onClick={() => {
                              setEditingStudent(s)
                              setEditForm({
                                name: s.name || '',
                                father_name: s.father_name || '',
                                class_id: classes.find(c => c.name === s.class_name)?.id || '',
                                section_id: sections.find(sec => sec.name === s.section_name)?.id || '',
                                roll_no: s.roll_no || '',
                                gender: s.gender || 'Male',
                                dob: s.dob || '',
                                contact: s.contact || '',
                                address: s.address || '',
                              })
                              setEditCustomForm(s.additional_info || {})
                            }} className="btn btn-secondary btn-sm" title="Edit Student">✏️</button>
                            <button onClick={() => printID(s)} className="btn btn-secondary btn-sm" title="Print ID Card">🪪</button>
                            {s.status === 'active' && <button onClick={() => handleDischarge(s.id)} className="btn btn-warning btn-sm">📤 Discharge</button>}
                            <button onClick={() => handleDelete(s.id)} className="btn btn-danger btn-sm">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Register Tab */}
      {tab === 'register' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>📝 Register New Student</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Student Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Father's Name</label><input className="form-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} /></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Class *</label>
                <select className="form-select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Section</label>
                <select className="form-select" value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}>
                  <option value="">Select Section</option>
                  {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Roll Number</label><input className="form-input" value={form.roll_no} onChange={e => setForm(f => ({ ...f, roll_no: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Gender *</label>
                <select className="form-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            
            {/* Custom Dynamic Fields */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Additional Information</h4>
                <button type="button" onClick={() => setShowAddFieldModal(true)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                  ➕ Add Custom Field
                </button>
              </div>
              {customFields.length > 0 ? (
                <div className="grid-2" style={{ gap: '1rem' }}>
                  {customFields.map(field => {
                    const key = field.field_label
                    const isRequired = field.is_required
                    return (
                      <div className="form-group" key={field.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label className="form-label" style={{ margin: 0 }}>
                            {key} {isRequired && ' *'}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(field.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '0 0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              opacity: 0.7,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
                            title="Delete this custom field"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                        {field.field_type === 'dropdown' ? (
                          <select
                            className="form-select"
                            value={customForm[key] || ''}
                            onChange={e => setCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                            required={isRequired}
                          >
                            <option value="">Select option</option>
                            {(field.field_options || '').split(',').map(opt => {
                              const trimmedOpt = opt.trim()
                              return <option key={trimmedOpt} value={trimmedOpt}>{trimmedOpt}</option>
                            })}
                          </select>
                        ) : (
                          <input
                            className="form-input"
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            placeholder={`Enter ${key.toLowerCase()}`}
                            value={customForm[key] || ''}
                            onChange={e => setCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                            required={isRequired}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No custom fields configured for this school. Click 'Add Custom Field' to create one.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '⏳ Saving...' : '✅ Register Student'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                setForm({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '' })
                setCustomForm({})
              }}>🔄 Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Tab */}
      {tab === 'bulk' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📥 Bulk Enrollment via CSV</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Upload a CSV file to register multiple students at once.</p>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1.5rem', border: '2px dashed var(--border)', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Drag & drop your CSV file here or click to browse</p>
            <input type="file" accept=".csv" style={{ display: 'none' }} id="csv-upload" onChange={e => { const f = e.target.files?.[0]; if (f) alert(`File "${f.name}" selected. CSV import will be processed after Supabase is connected.`) }} />
            <label htmlFor="csv-upload" className="btn btn-primary">📂 Choose CSV File</label>
          </div>
          <div className="alert alert-info">
            <span>ℹ️</span> CSV columns: name, father_name, class, section, roll_no, gender, dob, contact, address
          </div>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => {
            const csv = 'name,father_name,class,section,roll_no,gender,dob,contact,address\nAli Khan,Hassan Khan,Grade 1,A,001,Male,2015-03-15,03001234567,Lahore'
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'student_template.csv'; a.click()
          }}>⬇️ Download Template</button>
        </div>
      )}

      {/* Promote Tab */}
      {tab === 'promote' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⬆️ Promote Students</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Bulk promote all students from one class to the next.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">From Class</label>
              <select className="form-select" value={promoteFromClass} onChange={e => setPromoteFromClass(e.target.value)}>
                <option value="">Select current class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">To Class</label>
              <select className="form-select" value={promoteToClass} onChange={e => setPromoteToClass(e.target.value)}>
                <option value="">Select target class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="alert alert-warning"><span>⚠️</span> This will move all active students from the selected class to the new class.</div>
            <button onClick={handlePromoteStudents} disabled={promoting} className="btn btn-primary">
              {promoting ? '⏳ Promoting...' : '⬆️ Promote Students'}
            </button>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {viewStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewStudent(null)}>
          <div className="modal animate-slide">
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>👤 Student Profile</h3>
              <button onClick={() => setViewStudent(null)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 0.75rem', border: '3px solid var(--primary)' }}>👤</div>
                <h3 style={{ fontWeight: 800 }}>{viewStudent.name}</h3>
                <span className={`badge ${viewStudent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{viewStudent.status}</span>
              </div>
              <div className="grid-2" style={{ gap: '0.75rem' }}>
                {[['Father Name', viewStudent.father_name], ['Class', `${viewStudent.class_name} ${viewStudent.section_name ? `(${viewStudent.section_name})` : ''}`], ['Roll No', viewStudent.roll_no], ['Gender', viewStudent.gender], ['Contact', viewStudent.contact], ['Reg Date', viewStudent.reg_date ? new Date(viewStudent.reg_date).toLocaleDateString() : '—']].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v || '—'}</div>
                  </div>
                ))}
                
                {/* Custom Dynamic Fields */}
                {viewStudent.additional_info && Object.entries(viewStudent.additional_info).length > 0 && (
                  <div style={{ gridColumn: 'span 2', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Additional Information</h4>
                    <div className="grid-2" style={{ gap: '0.75rem' }}>
                      {Object.entries(viewStudent.additional_info).map(([k, v]) => (
                        <div key={k} style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{String(v) || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => printID(viewStudent)} className="btn btn-primary">🖨️ Print ID Card</button>
              <button onClick={() => setViewStudent(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingStudent(null)}>
          <div className="modal animate-slide" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>✏️ Edit Student Details</h3>
              <button onClick={() => setEditingStudent(null)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={async (e) => {
                e.preventDefault()
                setEditingSubmitting(true)
                setMsg(null)

                // Validate custom fields
                const missing = customFields.filter(f => f.is_required && !editCustomForm[f.field_label]?.trim())
                if (missing.length > 0) {
                  setMsg({ type: 'danger', text: `Please fill in all required fields: ${missing.map(m => m.field_label).join(', ')}` })
                  setEditingSubmitting(false)
                  return
                }

                try {
                  const res = await fetch('/api/school/students', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: editingStudent.id,
                      name: editForm.name,
                      father_name: editForm.father_name || null,
                      class_id: editForm.class_id || null,
                      section_id: editForm.section_id || null,
                      roll_no: editForm.roll_no || null,
                      gender: editForm.gender,
                      dob: editForm.dob || null,
                      contact: editForm.contact || null,
                      address: editForm.address || null,
                      additional_info: editCustomForm,
                    })
                  })
                  
                  if (res.ok) {
                    setMsg({ type: 'success', text: 'Student record updated successfully!' })
                    setEditingStudent(null)
                    load()
                  } else {
                    const d = await res.json()
                    setMsg({ type: 'danger', text: d.error || 'Failed to update student' })
                  }
                } catch {
                  setMsg({ type: 'danger', text: 'Connection error' })
                } finally {
                  setEditingSubmitting(false)
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Student Name *</label><input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Father's Name</label><input className="form-input" value={editForm.father_name} onChange={e => setEditForm(f => ({ ...f, father_name: e.target.value }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Class *</label>
                    <select className="form-select" value={editForm.class_id} onChange={e => setEditForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} required>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Section</label>
                    <select className="form-select" value={editForm.section_id} onChange={e => setEditForm(f => ({ ...f, section_id: e.target.value }))}>
                      <option value="">Select Section</option>
                      {sections.filter(s => !editForm.class_id || s.class_id === editForm.class_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Roll Number</label><input className="form-input" value={editForm.roll_no} onChange={e => setEditForm(f => ({ ...f, roll_no: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Gender *</label>
                    <select className="form-select" value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={editForm.dob} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Contact</label><input className="form-input" value={editForm.contact} onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
                
                {/* Custom Dynamic Fields */}
                {customFields.length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Additional Information</h4>
                    <div className="grid-2" style={{ gap: '1rem' }}>
                      {customFields.map(field => {
                        const key = field.field_label
                        const isRequired = field.is_required
                        return (
                          <div className="form-group" key={field.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <label className="form-label" style={{ margin: 0 }}>
                                {key} {isRequired && ' *'}
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomField(field.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  padding: '0 0.25rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  opacity: 0.7,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
                                title="Delete this custom field"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                            {field.field_type === 'dropdown' ? (
                              <select
                                className="form-select"
                                value={editCustomForm[key] || ''}
                                onChange={e => setEditCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                                required={isRequired}
                              >
                                <option value="">Select option</option>
                                {(field.field_options || '').split(',').map(opt => {
                                  const trimmedOpt = opt.trim()
                                  return <option key={trimmedOpt} value={trimmedOpt}>{trimmedOpt}</option>
                                })}
                              </select>
                            ) : (
                              <input
                                className="form-input"
                                type={field.field_type === 'number' ? 'number' : 'text'}
                                placeholder={`Enter ${key.toLowerCase()}`}
                                value={editCustomForm[key] || ''}
                                onChange={e => setEditCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                                required={isRequired}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={editingSubmitting}>
                    {editingSubmitting ? '⏳ Saving...' : '✅ Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Inline Custom Field Modal */}
      {showAddFieldModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddFieldModal(false)}>
          <div className="modal animate-slide" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>➕ Add Custom Registration Field</h3>
              <button type="button" onClick={() => setShowAddFieldModal(false)} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!newFieldLabel.trim()) return
                setAddingField(true)
                try {
                  const res = await fetch('/api/school/registration-fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      field_label: newFieldLabel.trim(),
                      field_type: newFieldType,
                      field_options: newFieldType === 'dropdown' ? newFieldOptions.trim() : null,
                      is_required: true
                    })
                  })
                  if (res.ok) {
                    setNewFieldLabel('')
                    setNewFieldType('text')
                    setNewFieldOptions('')
                    setShowAddFieldModal(false)
                    load() // Reload custom fields dynamically
                  } else {
                    const data = await res.json()
                    alert(data.error || 'Failed to add custom field')
                  }
                } catch {
                  alert('Network error connecting to the server')
                } finally {
                  setAddingField(false)
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label">Field Label (e.g. Blood Group) *</label>
                  <input className="form-input" placeholder="Enter field label" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Input Type *</label>
                  <select className="form-select" value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)}>
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                    <option value="dropdown">Dropdown Select</option>
                  </select>
                </div>
                {newFieldType === 'dropdown' && (
                  <div className="form-group">
                    <label className="form-label">Dropdown Choices (comma-separated list) *</label>
                    <input className="form-input" placeholder="e.g. A+, B+, AB+, O+" value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} required />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowAddFieldModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={addingField}>
                    {addingField ? '⏳ Adding Field...' : '➕ Add Field'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
