'use client'
import { useState, useEffect, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

interface Student {
  id: string; name: string; father_name: string; class_name: string; section_name: string;
  roll_no: string; gender: string; contact: string; status: string; reg_date: string; dob?: string;
  address?: string;
  class_id?: string;
  section_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additional_info?: Record<string, any>;
  photo_url?: string;
  has_unpaid_dues?: boolean;
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

type Tab = 'list' | 'register' | 'bulk' | 'promote' | 'review'

const getTodayString = () => {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

const formatDateToUI = (dateInput?: string | Date) => {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return '—'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

const parseUIDateToISO = (dateStr?: string) => {
  if (!dateStr) return null
  const match = dateStr.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (match) {
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const year = parseInt(match[3], 10)
    const date = new Date(year, month, day)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date.toISOString()
    }
  }
  const parsed = Date.parse(dateStr)
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }
  return null
}

export default function StudentsPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [classFilter, setClassFilter] = useState('')
  const [feeStatusFilter, setFeeStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewStudent, setViewStudent] = useState<Student | null>(null)
  const [form, setForm] = useState({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '', photo_url: '', reg_date: getTodayString() })
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customForm, setCustomForm] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  // Edit student states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '', photo_url: '', reg_date: '' })
  const [editCustomForm, setEditCustomForm] = useState<Record<string, string>>({})
  const [editingSubmitting, setEditingSubmitting] = useState(false)

  // Inline custom field creation states
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'dropdown'>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [addingField, setAddingField] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Review tab states
  const [reviewStudentId, setReviewStudentId] = useState<string | null>(null)
  const [reviewResults, setReviewResults] = useState<any[]>([])
  const [reviewInvoices, setReviewInvoices] = useState<any[]>([])
  const [reviewAttendance, setReviewAttendance] = useState<any[]>([])
  const [loadingReviewData, setLoadingReviewData] = useState(false)
  const [activeReviewSubTab, setActiveReviewSubTab] = useState<'results' | 'fees' | 'attendance'>('results')
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const loadStudentReviewData = useCallback(async (studentId: string) => {
    setLoadingReviewData(true)
    try {
      const [resRes, feeRes, attRes] = await Promise.all([
        fetch(`/api/school/results?student_id=${studentId}`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`/api/school/fee?type=invoices&student_id=${studentId}`).then(r => r.json()).catch(() => ({ invoices: [] })),
        fetch(`/api/school/attendance?student_id=${studentId}`).then(r => r.json()).catch(() => ({ attendance: [] }))
      ])
      setReviewResults(resRes.results || [])
      setReviewInvoices(feeRes.invoices || [])
      setReviewAttendance(attRes.attendance || [])
    } catch (err) {
      console.error('Error fetching review data:', err)
    } finally {
      setLoadingReviewData(false)
    }
  }, [])

  // Student promotion states
  const [promoteFromClass, setPromoteFromClass] = useState('')
  const [promoteToClass, setPromoteToClass] = useState('')
  const [promoteToSession, setPromoteToSession] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [uploadingCsv, setUploadingCsv] = useState(false)

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
      return ''
    }
    const sess = getCookie('selected_session') || new Date().getFullYear().toString()
    setPromoteToSession((parseInt(sess) + 1).toString())
  }, [])



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
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const compressPhoto = async (file: File): Promise<File | Blob> => {
    const options = {
      maxSizeMB: 0.15,
      maxWidthOrHeight: 800,
      useWebWorker: true
    }
    return await imageCompression(file, options)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCompressing(true)
      try {
        const compressedFile = await compressPhoto(file)
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result
          if (typeof result === 'string') {
            setForm(f => ({ ...f, photo_url: result }))
          }
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Image compression failed, using original file:', error)
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result
          if (typeof result === 'string') {
            setForm(f => ({ ...f, photo_url: result }))
          }
        }
        reader.readAsDataURL(file)
      } finally {
        setCompressing(false)
      }
    }
  }

  const handleEditPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCompressing(true)
      try {
        const compressedFile = await compressPhoto(file)
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result
          if (typeof result === 'string') {
            setEditForm(f => ({ ...f, photo_url: result }))
          }
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Image compression failed, using original file:', error)
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result
          if (typeof result === 'string') {
            setEditForm(f => ({ ...f, photo_url: result }))
          }
        }
        reader.readAsDataURL(file)
      } finally {
        setCompressing(false)
      }
    }
  }

  const filteredSections = sections.filter(s => !form.class_id || s.class_id === form.class_id)
  const filtered = students.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_no?.includes(search) || s.father_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    const matchClass = !classFilter || s.class_name === classFilter
    const matchFeeStatus = !feeStatusFilter || (feeStatusFilter === 'unpaid' && s.has_unpaid_dues)
    return matchSearch && matchStatus && matchClass && matchFeeStatus
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

    const enrollmentISO = parseUIDateToISO(form.reg_date)
    if (form.reg_date && !enrollmentISO) {
      setMsg({ type: 'danger', text: 'Please enter enrollment date in DD-MM-YYYY or DD/MM/YYYY format.' })
      setSubmitting(false)
      return
    }

    const { reg_date, ...restForm } = form
    const payload = { ...restForm, additional_info: customForm, created_at: enrollmentISO || undefined }
    const r = await fetch('/api/school/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json()
    if (!r.ok) { setMsg({ type: 'danger', text: d.error || 'Failed' }); setSubmitting(false); return }
    setMsg({ type: 'success', text: 'Student registered successfully!' })
    setForm({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '', photo_url: '', reg_date: getTodayString() })
    setCustomForm({})
    load(); setSubmitting(false)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a valid CSV file.')
      return
    }

    setUploadingCsv(true)
    setMsg(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'students')

    try {
      const res = await fetch('/api/school/data', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Successfully enrolled ${data.count} students from CSV!` })
        load()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to import CSV' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error uploading file to server' })
    } finally {
      setUploadingCsv(false)
      e.target.value = ''
    }
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

  async function handleDeleteAll() {
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/school/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'All student records deleted successfully!' })
        setShowDeleteAllModal(false)
        setConfirmText('')
        load()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to delete all student records' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Connection error' })
    } finally {
      setSubmitting(false)
    }
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

  async function handlePromoteAction(isDischarge: boolean) {
    if (!promoteFromClass) {
      setMsg({ type: 'danger', text: 'Please select a source class' })
      return
    }
    const targetClass = isDischarge ? 'discharge' : promoteToClass
    if (!isDischarge && !targetClass) {
      setMsg({ type: 'danger', text: 'Please select a target class' })
      return
    }
    if (!isDischarge && promoteFromClass === targetClass) {
      setMsg({ type: 'danger', text: 'Source and target classes must be different' })
      return
    }
    
    const fromClassName = classes.find(c => c.id === promoteFromClass)?.name || ''
    const confirmMsg = isDischarge
      ? `Are you sure you want to graduate and discharge all active students from ${fromClassName}?`
      : `Are you sure you want to promote all active students from ${fromClassName} to the target class?`
    if (!confirm(confirmMsg)) return

    setPromoting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/school/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fromClassId: promoteFromClass, 
          toClassId: targetClass,
          toSession: promoteToSession 
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: isDischarge ? 'Students graduated successfully!' : 'Students promoted successfully!' })
        setPromoteFromClass('')
        setPromoteToClass('')
        load() // Refresh students list
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to process promotion' })
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
          border: 2px solid #0093cb; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg,#0093cb,#22d3ee); color:white; padding:15px; border-radius:8px; text-align:center; margin-bottom:15px; }
        .header h2 { margin:0; font-size:16px; } .header p { margin:3px 0; font-size:11px; opacity:0.9; }
        .photo-placeholder { width:80px; height:80px; border-radius:50%; background:#e5e7eb; border:3px solid #0093cb;
          display:flex; align-items:center; justify-content:center; font-size:30px; margin:0 auto 10px; overflow:hidden; }
        .info { font-size:13px; } .info tr td { padding:4px 8px; }
        .info tr td:first-child { color:#666; font-weight:600; }
        .footer { text-align:center; margin-top:12px; font-size:10px; color:#999; }
      </style></head><body>
      <div class="id-card">
        <div class="header"><h2>🏫 Student ID Card</h2><p>Academic Year ${new Date().getFullYear()}</p></div>
        <div class="photo-placeholder">${student.photo_url ? `<img src="${student.photo_url}" style="width:100%;height:100%;object-fit:cover;" />` : '👤'}</div>
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
        {(['list', 'register', 'bulk', 'promote', 'review'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'list' ? '📋 Student List' : t === 'register' ? '➕ Register' : t === 'bulk' ? '📥 Bulk Enrollment' : t === 'promote' ? '⬆️ Promote' : '🔍 Review Profile'}
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
              <select className="form-select" style={{ width: '160px' }} value={feeStatusFilter} onChange={e => setFeeStatusFilter(e.target.value)}>
                <option value="">All Fee Status</option>
                <option value="unpaid">Unpaid Dues</option>
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
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>👤</div>
                            )}
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.father_name || '—'}</td>
                        <td><span className="badge badge-primary">{s.class_name || '—'} {s.section_name && `(${s.section_name})`}</span></td>
                        <td>{s.roll_no || '—'}</td>
                        <td>{s.gender || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.contact || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span>
                            {s.has_unpaid_dues && <span className="badge badge-warning">⚠️ Unpaid</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            <button onClick={() => setViewStudent(s)} className="btn btn-secondary btn-sm" title="View Profile">👁️</button>
                            <button onClick={() => {
                              setReviewStudentId(s.id)
                              loadStudentReviewData(s.id)
                              setTab('review')
                            }} className="btn btn-secondary btn-sm" title="Review Records">📊 Review</button>
                            <button type="button" onClick={() => {
                              setEditingStudent(s)
                              setEditForm({
                                name: s.name || '',
                                father_name: s.father_name || '',
                                class_id: s.class_id || '',
                                section_id: s.section_id || '',
                                roll_no: s.roll_no || '',
                                gender: s.gender || 'Male',
                                dob: s.dob || '',
                                contact: s.contact || '',
                                address: s.address || '',
                                photo_url: s.photo_url || '',
                                reg_date: formatDateToUI(s.reg_date),
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
            
            {/* Photo Upload Section */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border)' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-input)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {compressing ? (
                  <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⏳</span>
                ) : form.photo_url ? (
                  <img src={form.photo_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>👤</span>
                )}
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Student Photo (Optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: compressing ? 'not-allowed' : 'pointer', margin: 0, padding: '0.3rem 0.6rem', fontSize: '0.85rem', opacity: compressing ? 0.6 : 1 }}>
                    {compressing ? '⏳ Compressing...' : '📷 Choose Photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} disabled={compressing} />
                  </label>
                  {form.photo_url && !compressing && (
                    <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={() => setForm(f => ({ ...f, photo_url: '' }))}>
                      Remove
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Supports JPG, PNG, WEBP (Max 2MB)
                </span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group"><label className="form-label">Student Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Father&apos;s Name</label><input className="form-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} /></div>
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Enrollment Date *</label>
                <input 
                  className="form-input" 
                  placeholder="DD-MM-YYYY" 
                  value={form.reg_date} 
                  onChange={e => setForm(f => ({ ...f, reg_date: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
            
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
                  No custom fields configured for this school. Click &apos;Add Custom Field&apos; to create one.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '⏳ Saving...' : '✅ Register Student'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                setForm({ name: '', father_name: '', class_id: '', section_id: '', roll_no: '', gender: 'Male', dob: '', contact: '', address: '', photo_url: '', reg_date: getTodayString() })
                setCustomForm({})
              }}>🔄 Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Tab */}
      {tab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📥 Bulk Enrollment via CSV</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Upload a CSV file to register multiple students at once.</p>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1.5rem', border: '2px dashed var(--border)', textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
              {uploadingCsv ? (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>⏳ Processing enrollment CSV...</p>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Drag & drop your CSV file here or click to browse</p>
                  <input type="file" accept=".csv" style={{ display: 'none' }} id="csv-upload" onChange={handleCsvUpload} />
                  <label htmlFor="csv-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>📂 Choose CSV File</label>
                </>
              )}
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

          <div className="card" style={{ border: '1px solid var(--danger-border, #fecaca)', background: 'var(--danger-bg-subtle, rgba(239, 68, 68, 0.02))' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--danger, #ef4444)' }}>⚠️ Reset Student Database</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              If you made mistakes importing or entering data, you can delete all student records from the database. This action is irreversible.
            </p>
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={() => setShowDeleteAllModal(true)}
            >
              🗑️ Delete All Students
            </button>
          </div>
        </div>
      )}

      {/* Promote Tab */}
      {tab === 'promote' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>⬆️ Promote & Graduate Students</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Bulk promote students to the next class, or graduate the senior class.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group">
              <label className="form-label">From Class *</label>
              <select className="form-select" value={promoteFromClass} onChange={e => setPromoteFromClass(e.target.value)}>
                <option value="">Select current class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Option A: Promote to Next Class</h4>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">To Class</label>
                <select className="form-select" value={promoteToClass} onChange={e => setPromoteToClass(e.target.value)}>
                  <option value="">Select target class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Target Session Year</label>
                <select className="form-select" value={promoteToSession} onChange={e => setPromoteToSession(e.target.value)}>
                  {['2024', '2025', '2026', '2027', '2028'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button 
                onClick={() => handlePromoteAction(false)} 
                disabled={promoting || !promoteFromClass || !promoteToClass} 
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {promoting ? '⏳ Promoting...' : '⬆️ Bulk Promote Students'}
              </button>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--success)' }}>Option B: Graduate / Discharge Senior Class</h4>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Graduation Session Year</label>
                <select className="form-select" value={promoteToSession} onChange={e => setPromoteToSession(e.target.value)}>
                  {['2024', '2025', '2026', '2027', '2028'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button 
                onClick={() => handlePromoteAction(true)} 
                disabled={promoting || !promoteFromClass} 
                className="btn btn-success"
                style={{ width: '100%' }}
              >
                {promoting ? '⏳ Discharging...' : '🎓 Graduate & Discharge Students'}
              </button>
            </div>

            <div className="alert alert-warning">
              <span>⚠️</span> Promoting or graduating will shift/update students' academic records for the chosen session year.
            </div>
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
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 0.75rem', border: '3px solid var(--primary)', overflow: 'hidden' }}>
                  {viewStudent.photo_url ? (
                    <img src={viewStudent.photo_url} alt={viewStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '👤'
                  )}
                </div>
                <h3 style={{ fontWeight: 800 }}>{viewStudent.name}</h3>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                  <span className={`badge ${viewStudent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{viewStudent.status}</span>
                  {viewStudent.has_unpaid_dues && <span className="badge badge-warning">⚠️ Unpaid Dues</span>}
                </div>
              </div>
              <div className="grid-2" style={{ gap: '0.75rem' }}>
                {[['Father Name', viewStudent.father_name], ['Class', `${viewStudent.class_name} ${viewStudent.section_name ? `(${viewStudent.section_name})` : ''}`], ['Roll No', viewStudent.roll_no], ['Gender', viewStudent.gender], ['Contact', viewStudent.contact], ['Reg Date', formatDateToUI(viewStudent.reg_date)]].map(([k, v]) => (
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

                const enrollmentISO = parseUIDateToISO(editForm.reg_date)
                if (editForm.reg_date && !enrollmentISO) {
                  setMsg({ type: 'danger', text: 'Please enter enrollment date in DD-MM-YYYY or DD/MM/YYYY format.' })
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
                      photo_url: editForm.photo_url || null,
                      additional_info: editCustomForm,
                      created_at: enrollmentISO || editingStudent.reg_date,
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
                
                {/* Photo Upload Section */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-input)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {compressing ? (
                      <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⏳</span>
                    ) : editForm.photo_url ? (
                      <img src={editForm.photo_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>👤</span>
                    )}
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Student Photo (Optional)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: compressing ? 'not-allowed' : 'pointer', margin: 0, padding: '0.3rem 0.6rem', fontSize: '0.85rem', opacity: compressing ? 0.6 : 1 }}>
                        {compressing ? '⏳ Compressing...' : '📷 Change Photo'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditPhotoChange} disabled={compressing} />
                      </label>
                      {editForm.photo_url && !compressing && (
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={() => setEditForm(f => ({ ...f, photo_url: '' }))}>
                          Remove
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Supports JPG, PNG, WEBP (Max 2MB)
                    </span>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Student Name *</label><input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Father&apos;s Name</label><input className="form-input" value={editForm.father_name} onChange={e => setEditForm(f => ({ ...f, father_name: e.target.value }))} /></div>
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
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Enrollment Date *</label>
                    <input 
                      className="form-input" 
                      placeholder="DD-MM-YYYY" 
                      value={editForm.reg_date} 
                      onChange={e => setEditForm(f => ({ ...f, reg_date: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
                </div>
                
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

      {/* Review Profile Tab */}
      {tab === 'review' && (
        <>
          {!reviewStudentId ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No Student Selected</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                Please select a student from the Student List tab and click "📊 Review" to view their profile, progress report cards, attendance records, and fee invoice ledger.
              </p>
              <button className="btn btn-primary" onClick={() => setTab('list')}>Go to Student List</button>
            </div>
          ) : (() => {
            const student = students.find(s => s.id === reviewStudentId)
            if (!student) {
              return (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-danger)' }}>
                  Error: Selected student record not found in cache.
                </div>
              )
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Left Side: Profile Information */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-input)', border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '1rem' }}>
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>👤</span>
                      )}
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{student.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Roll No: {student.roll_no || '—'}</p>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{student.status}</span>
                      <span className="badge badge-primary">{student.class_name || '—'} {student.section_name && `(${student.section_name})`}</span>
                      {student.has_unpaid_dues && <span className="badge badge-warning">⚠️ Unpaid Dues</span>}
                    </div>

                    <button 
                      onClick={() => setViewStudent(student)} 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      🖨️ ID Card View
                    </button>
                  </div>

                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>Personal Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Father's Name</span>
                        <strong style={{ color: 'var(--text-base)' }}>{student.father_name || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Contact Phone</span>
                        <strong style={{ color: 'var(--text-base)' }}>{student.contact || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Gender</span>
                        <strong style={{ color: 'var(--text-base)' }}>{student.gender || '—'}</strong>
                      </div>
                      {student.dob && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Date of Birth</span>
                          <strong style={{ color: 'var(--text-base)' }}>{new Date(student.dob).toLocaleDateString()}</strong>
                        </div>
                      )}
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Resident Address</span>
                        <strong style={{ color: 'var(--text-base)' }}>{student.address || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Admission Date</span>
                        <strong style={{ color: 'var(--text-base)' }}>{formatDateToUI(student.reg_date)}</strong>
                      </div>
                    </div>
                  </div>

                  {student.additional_info && Object.entries(student.additional_info).length > 0 && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>Custom Information</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                        {Object.entries(student.additional_info).map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: 'var(--text-secondary)', display: 'block' }}>{k}</span>
                            <strong style={{ color: 'var(--text-base)' }}>{String(v || '—')}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Tabbed Dynamic Ledger panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setActiveReviewSubTab('results')}
                      className={`btn btn-sm ${activeReviewSubTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      📊 Progress Report
                    </button>
                    <button 
                      onClick={() => setActiveReviewSubTab('fees')}
                      className={`btn btn-sm ${activeReviewSubTab === 'fees' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      💳 Fee Submissions
                    </button>
                    <button 
                      onClick={() => setActiveReviewSubTab('attendance')}
                      className={`btn btn-sm ${activeReviewSubTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      📅 Attendance History
                    </button>
                  </div>

                  {loadingReviewData ? (
                    <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      ⏳ Loading student database logs...
                    </div>
                  ) : (
                    <>
                      {/* Results / Progress Report Panel */}
                      {activeReviewSubTab === 'results' && (
                        <div className="card">
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>📊 Academic Examinations Progress Report</h3>
                          
                          {reviewResults.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                              No examination result grades found for this student.
                            </p>
                          ) : (() => {
                            // Group results by exam type
                            const grouped: Record<string, { examName: string; list: any[] }> = {}
                            reviewResults.forEach(r => {
                              const examId = r.exam_type_id
                              const examName = r.exam_types?.name || 'Standard Test'
                              if (!grouped[examId]) {
                                grouped[examId] = { examName, list: [] }
                              }
                              grouped[examId].list.push(r)
                            })

                            // Simple grading criteria helper
                            const getGrade = (percentage: number) => {
                              if (percentage >= 90) return { label: 'A+', color: 'var(--success)' }
                              if (percentage >= 80) return { label: 'A', color: 'var(--success)' }
                              if (percentage >= 70) return { label: 'B', color: 'var(--primary)' }
                              if (percentage >= 60) return { label: 'C', color: 'var(--primary)' }
                              if (percentage >= 50) return { label: 'D', color: 'var(--warning)' }
                              return { label: 'F', color: 'var(--danger)' }
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {Object.entries(grouped).map(([examId, data]) => {
                                  let totalObtained = 0
                                  let totalMax = 0

                                  return (
                                    <div key={examId} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                      <div style={{ background: 'var(--bg-surface)', padding: '0.88rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{data.examName}</h4>
                                      </div>
                                      <div className="table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>Subject</th>
                                              <th style={{ textAlign: 'center' }}>Max Marks</th>
                                              <th style={{ textAlign: 'center' }}>Obtained</th>
                                              <th style={{ textAlign: 'center' }}>Percentage</th>
                                              <th style={{ textAlign: 'center' }}>Grade</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {data.list.map(r => {
                                              const obt = Number(r.marks_obtained) || 0
                                              const max = Number(r.total_marks) || 100
                                              const percentage = max > 0 ? (obt / max) * 100 : 0
                                              const grade = getGrade(percentage)
                                              totalObtained += obt
                                              totalMax += max

                                              return (
                                                <tr key={r.id}>
                                                  <td style={{ fontWeight: 600 }}>{r.subjects?.name || 'Subject'}</td>
                                                  <td style={{ textAlign: 'center' }}>{max}</td>
                                                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.marks_obtained}</td>
                                                  <td style={{ textAlign: 'center' }}>{percentage.toFixed(1)}%</td>
                                                  <td style={{ textAlign: 'center' }}>
                                                    <span style={{ color: grade.color, fontWeight: 'bold' }}>{grade.label}</span>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                      
                                      {/* Cumulative Card summary */}
                                      {(() => {
                                        const overallPercent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
                                        const overallGrade = getGrade(overallPercent)
                                        return (
                                          <div style={{ background: 'var(--bg-base)', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div>
                                              Total Score: <strong style={{ fontSize: '1rem' }}>{totalObtained} / {totalMax}</strong>
                                            </div>
                                            <div>
                                              Overall Percentage: <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{overallPercent.toFixed(1)}%</strong>
                                            </div>
                                            <div>
                                              Exam Grade: <strong style={{ fontSize: '1.05rem', color: overallGrade.color }}>{overallGrade.label}</strong>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Fee Ledger Panel */}
                      {activeReviewSubTab === 'fees' && (
                        <div className="card">
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>💳 Student Fee Invoice & Payment Ledger</h3>
                          
                          {reviewInvoices.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                              No fee invoices registered for this student.
                            </p>
                          ) : (() => {
                            const totalAmount = reviewInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0)
                            const totalPaid = reviewInvoices.reduce((acc, inv) => acc + (inv.amount_paid || (inv.status === 'paid' ? inv.amount : 0)), 0)
                            const totalUnpaid = Math.max(0, totalAmount - totalPaid)

                            // Months array mapping
                            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

                            return (
                              <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                  <div style={{ padding: '0.88rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Total Invoiced</span>
                                    <strong style={{ fontSize: '1.2rem', color: 'var(--text-base)' }}>Rs. {totalAmount}</strong>
                                  </div>
                                  <div style={{ padding: '0.88rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Total Paid</span>
                                    <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>Rs. {totalPaid}</strong>
                                  </div>
                                  <div style={{ padding: '0.88rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Outstanding</span>
                                    <strong style={{ fontSize: '1.2rem', color: 'var(--danger)' }}>Rs. {totalUnpaid}</strong>
                                  </div>
                                </div>

                                <div className="table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Billing Month</th>
                                        <th style={{ textAlign: 'center' }}>Invoice Amount</th>
                                        <th style={{ textAlign: 'center' }}>Paid Amount</th>
                                        <th style={{ textAlign: 'center' }}>Payment Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reviewInvoices.map(inv => {
                                        const billingMonth = months[inv.month - 1] || `Month ${inv.month}`
                                        const billingPeriod = `${billingMonth} ${inv.year}`
                                        const paidVal = inv.amount_paid || (inv.status === 'paid' ? inv.amount : 0)
                                        const statusColor = inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-danger'

                                        return (
                                          <tr key={inv.id}>
                                            <td style={{ fontWeight: 600 }}>{billingPeriod}</td>
                                            <td style={{ textAlign: 'center' }}>Rs. {inv.amount}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>Rs. {paidVal}</td>
                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                              {inv.paid_date ? new Date(inv.paid_date).toLocaleDateString() : '—'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`badge ${statusColor}`}>{inv.status}</span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Attendance Timeline Panel */}
                      {activeReviewSubTab === 'attendance' && (
                        <div className="card">
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>📅 Attendance Performance Summary</h3>
                          
                          {reviewAttendance.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                              No attendance registration logs found for this student.
                            </p>
                          ) : (() => {
                            const total = reviewAttendance.length
                            const present = reviewAttendance.filter(a => a.status === 'present').length
                            const absent = reviewAttendance.filter(a => a.status === 'absent').length
                            const leave = reviewAttendance.filter(a => a.status === 'leave').length
                            const late = reviewAttendance.filter(a => a.status === 'late').length
                            const rate = total > 0 ? ((present + leave + late) / total) * 100 : 0

                            return (
                              <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                  <div style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Presence Rate</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{rate.toFixed(1)}%</strong>
                                  </div>
                                  <div style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Present</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{present}</strong>
                                  </div>
                                  <div style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Absent</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--danger)' }}>{absent}</strong>
                                  </div>
                                  <div style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>On Leave</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--warning)' }}>{leave}</strong>
                                  </div>
                                  <div style={{ padding: '0.75rem 0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Late Arrival</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'purple' }}>{late}</strong>
                                  </div>
                                </div>

                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Attendance Marked Log</h4>
                                <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reviewAttendance.map((att, attIdx) => {
                                        const badgeStyle = att.status === 'present' ? 'badge-success' : att.status === 'absent' ? 'badge-danger' : att.status === 'leave' ? 'badge-warning' : 'badge-primary'
                                        return (
                                          <tr key={att.id || attIdx}>
                                            <td style={{ fontWeight: 600 }}>{new Date(att.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`badge ${badgeStyle}`}>{att.status}</span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            )
          })()}
        </>
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
                      is_required: false
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
                  <select className="form-select" value={newFieldType} onChange={e => setNewFieldType(e.target.value as 'text' | 'number' | 'dropdown')}>
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

      {showDeleteAllModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteAllModal(false)}>
          <div className="modal animate-slide" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--danger)' }}>⚠️ Confirm Delete All Students</h3>
              <button onClick={() => { setShowDeleteAllModal(false); setConfirmText('') }} className="btn btn-secondary btn-icon">✕</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', lineHeight: '1.5' }}>
                You are about to delete <strong>ALL</strong> student records from the database. This will also delete all associated records (such as attendance and invoices due to cascade constraints).
              </p>
              <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: '1.25rem' }}>
                This action is permanent and cannot be undone.
              </p>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Type <strong>DELETE ALL</strong> to confirm:</label>
                <input 
                  className="form-input" 
                  placeholder="DELETE ALL" 
                  value={confirmText} 
                  onChange={e => setConfirmText(e.target.value)} 
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowDeleteAllModal(false); setConfirmText('') }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                disabled={confirmText !== 'DELETE ALL' || submitting} 
                onClick={handleDeleteAll}
              >
                {submitting ? '⏳ Deleting...' : 'Delete All Records'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
