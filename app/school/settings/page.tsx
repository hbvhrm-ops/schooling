'use client'
import { useState, useEffect } from 'react'

interface CustomField {
  id: string
  field_label: string
  field_type: 'text' | 'number' | 'dropdown'
  field_options: string | null
  is_required: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'fields'>('profile')
  const [fields, setFields] = useState<CustomField[]>([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [submittingField, setSubmittingField] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  // Custom Field Form states
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'text' | 'number' | 'dropdown'>('text')
  const [options, setOptions] = useState('')

  // School Profile states
  const [schoolName, setSchoolName] = useState('')
  const [schoolLogo, setSchoolLogo] = useState('')
  const [schoolContact, setSchoolContact] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolPsra, setSchoolPsra] = useState('')
  const [schoolBise, setSchoolBise] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [submittingProfile, setSubmittingProfile] = useState(false)

  async function loadProfile() {
    setLoadingProfile(true)
    try {
      const res = await fetch('/api/school/profile')
      const data = await res.json()
      if (res.ok && data.school) {
        setSchoolName(data.school.name || '')
        setSchoolLogo(data.school.logo_url || '')
        setSchoolContact(data.school.contact || '')
        setSchoolAddress(data.school.address || '')
        setSchoolPsra(data.school.psra_reg_no || '')
        setSchoolBise(data.school.bise_no || '')
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to load school profile' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setLoadingProfile(false)
    }
  }

  async function loadFields() {
    setLoadingFields(true)
    try {
      const res = await fetch('/api/school/registration-fields')
      const data = await res.json()
      if (res.ok) {
        setFields(data.fields || [])
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to load custom fields' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setLoadingFields(false)
    }
  }

  useEffect(() => {
    loadProfile()
    loadFields()
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string
      setSchoolLogo(result)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!schoolName.trim()) {
      setMsg({ type: 'danger', text: 'School name is required' })
      return
    }

    setSubmittingProfile(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolName.trim(),
          logo_url: schoolLogo.trim(),
          contact: schoolContact.trim(),
          address: schoolAddress.trim(),
          psra_reg_no: schoolPsra.trim(),
          bise_no: schoolBise.trim(),
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'success', text: 'School settings updated successfully!' })
        // Trigger a reload to refresh layout branding immediately
        setTimeout(() => {
          window.location.reload()
        }, 1200)
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to save settings' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setSubmittingProfile(false)
    }
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      setMsg({ type: 'danger', text: 'Field label cannot be empty' })
      return
    }

    setSubmittingField(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/registration-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_label: label.trim(),
          field_type: type,
          field_options: type === 'dropdown' ? options.trim() : null,
          is_required: false,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'success', text: 'Custom registration field added successfully!' })
        setLabel('')
        setType('text')
        setOptions('')
        loadFields()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to add field' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setSubmittingField(false)
    }
  }

  async function handleDeleteField(id: string) {
    if (!confirm("Are you sure you want to remove this custom field requirement? Existing student data won't be deleted, but this field will no longer be asked during registration.")) return

    try {
      const res = await fetch('/api/school/registration-fields', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'success', text: 'Field requirement removed successfully.' })
        loadFields()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to delete field' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    }
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>⚙️ School & User Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure basic school information and customize student registration forms.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => { setActiveTab('profile'); setMsg(null); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🏫 User Account Settings
        </button>
        <button
          onClick={() => { setActiveTab('fields'); setMsg(null); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fields' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'fields' ? 'var(--primary)' : 'var(--text-secondary)',
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📋 Student Registration Fields
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '900px' }}>{msg.text}</div>}

      {activeTab === 'profile' ? (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>🏫 Edit School Information</h3>
          {loadingProfile ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading settings profile...</div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">School Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Beaconhouse School System"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 0345-1234567"
                    value={schoolContact}
                    onChange={e => setSchoolContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Phase 2, Hayatabad, Peshawar"
                  value={schoolAddress}
                  onChange={e => setSchoolAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">PSRA Registration No.</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 23412-A"
                    value={schoolPsra}
                    onChange={e => setSchoolPsra(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">BISE No. / Affiliation No.</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 8839"
                    value={schoolBise}
                    onChange={e => setSchoolBise(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ background: 'var(--bg-base)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>School Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {schoolLogo ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={schoolLogo}
                        alt="School Logo Preview"
                        style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'contain', background: '#ffffff', border: '1px solid var(--border)', padding: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setSchoolLogo('')}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Remove Logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                      🏫
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                    <div style={{ position: 'relative' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                        📁 Upload Logo Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.75rem' }}>PNG, JPG up to 2MB</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Or paste Logo URL:</label>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="https://example.com/logo.png"
                        value={schoolLogo}
                        onChange={e => setSchoolLogo(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={submittingProfile}>
                {submittingProfile ? '⏳ Saving Settings...' : '💾 Save Settings Profile'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.5rem', maxWidth: '1000px', alignItems: 'start' }}>
          {/* Add Field Card */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>➕ Add Custom Registration Field</h3>
            <form onSubmit={handleAddField} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="form-group">
                <label className="form-label">Field Label (e.g. Blood Group, Emergency Contact) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter field label"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Input Type *</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="dropdown">Dropdown Select</option>
                </select>
              </div>

              {type === 'dropdown' && (
                <div className="form-group animate-fade">
                  <label className="form-label">Dropdown Choices (comma-separated list) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. A+, B+, AB+, O+, A-, B-"
                    value={options}
                    onChange={e => setOptions(e.target.value)}
                    required={type === 'dropdown'}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  * Added custom fields are automatically optional at registration time.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={submittingField}>
                {submittingField ? '⏳ Adding Field...' : '➕ Add Field Requirement'}
              </button>
            </form>
          </div>

          {/* Existing Custom Fields */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📋 Configured Registration Requirements</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              These dynamic fields will be presented to users at the bottom of the registration form.
            </p>

            {loadingFields ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                ⏳ Loading configured fields...
              </div>
            ) : fields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-base)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No custom fields configured</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Use the form on the left to add fields like "Blood Group" or "Parent CNIC".</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {fields.map(f => (
                  <div
                    key={f.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{f.field_label}</strong>
                        {f.is_required ? <span className="badge badge-danger">Required</span> : <span className="badge badge-secondary" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>Optional</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Type: <span style={{ textTransform: 'capitalize', color: 'var(--primary-light)' }}>{f.field_type}</span>
                        {f.field_options && ` (${f.field_options})`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteField(f.id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.4rem 0.6rem' }}
                      title="Remove Field"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
