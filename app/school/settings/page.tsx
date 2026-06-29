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
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  // Form states
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'text' | 'number' | 'dropdown'>('text')
  const [options, setOptions] = useState('')

  async function loadFields() {
    setLoading(true)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      setMsg({ type: 'danger', text: 'Field label cannot be empty' })
      return
    }

    setSubmitting(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/registration-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_label: label.trim(),
          field_type: type,
          field_options: type === 'dropdown' ? options.trim() : null,
          is_required: false, // Automatically optional for all students
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
      setSubmitting(false)
    }
  }

  async function handleDeleteField(id: string) {
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>⚙️ Customize Registration Fields</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure custom required fields for student registration</p>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem', maxWidth: '900px' }}>{msg.text}</div>}

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
                * Added custom fields are automatically required for all registered students.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={submitting}>
              {submitting ? '⏳ Adding Field...' : '➕ Add Field Requirement'}
            </button>
          </form>
        </div>

        {/* Existing Custom Fields */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📋 Configured Registration Requirements</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            These dynamic fields will be presented to users at the bottom of the registration form.
          </p>

          {loading ? (
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
    </div>
  )
}
