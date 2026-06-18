'use client'
import { useState, useEffect, useCallback } from 'react'

interface Template { id: string; type: string; message: string }
type Tab = 'intro' | 'download' | 'all' | 'attendance' | 'result' | 'fee' | 'password' | 'templates' | 'settings'

const SMS_TYPES = [
  { key: 'attendance', label: '📋 Attendance SMS', icon: '📋', defaultMsg: 'Dear Parent, your child {{name}} was {{status}} today {{date}}. - School Management' },
  { key: 'result',     label: '📝 Result SMS',    icon: '📝', defaultMsg: 'Dear Parent, {{name}} has scored {{marks}}/{{total}} in {{exam}}. Grade: {{grade}}. - School Management' },
  { key: 'fee',        label: '💳 Fee SMS',        icon: '💳', defaultMsg: 'Dear Parent, fee of ₨{{amount}} for {{name}} is due for {{month}}. Please pay by {{due_date}}. - School Management' },
  { key: 'password',   label: '🔑 Parent Password SMS', icon: '🔑', defaultMsg: 'Dear Parent, your portal login: Username: {{phone}}, Password: {{password}}. - School Management' },
]

export default function SMSPage() {
  const [tab, setTab] = useState<Tab>('intro')
  const [templates, setTemplates] = useState<Template[]>([])
  const [editType, setEditType] = useState('')
  const [editMsg, setEditMsg] = useState('')
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  
  // Settings state
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const load = useCallback(async () => {
    setLoadingSettings(true)
    const [r, settingsRes] = await Promise.all([
      fetch('/api/school/sms').then(res => res.json()).catch(() => ({})),
      fetch('/api/school/sms/settings').then(res => res.json()).catch(() => ({}))
    ])
    setTemplates(r.templates || [])
    if (settingsRes && settingsRes.name !== undefined) {
      setSchoolName(settingsRes.name || '')
      setSchoolPhone(settingsRes.contact || '')
    }
    setLoadingSettings(false)
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function saveTemplate(type: string, message: string) {
    const existing = templates.find(t => t.type === type)
    const method = existing ? 'PUT' : 'POST'
    const body = existing ? { id: existing.id, message } : { type, message }
    const r = await fetch('/api/school/sms', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { setMsg({ type: 'success', text: 'Template saved!' }); load() }
    else setMsg({ type: 'danger', text: 'Failed to save' })
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setMsg(null)
    try {
      const res = await fetch('/api/school/sms/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: schoolName, contact: schoolPhone })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'School settings saved successfully!' })
        load()
      } else {
        setMsg({ type: 'danger', text: data.error || 'Failed to save settings' })
      }
    } catch {
      setMsg({ type: 'danger', text: 'Error connecting to the server' })
    } finally {
      setSavingSettings(false)
    }
  }

  function openWhatsApp(message: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  function openSMS(message: string) {
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📱 SMS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Send SMS notifications to parents</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([['intro','ℹ️ Introduction'],['download','⬇️ SMS App'],['all','📣 SMS to All'],['attendance','📋 Attendance'],['result','📝 Result'],['fee','💳 Fee'],['password','🔑 Password'],['templates','📝 Templates'],['settings','⚙️ Settings']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'intro' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>ℹ️ SMS Introduction</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            The SMS module allows you to send important notifications to parents regarding their children&apos;s attendance, results, fee reminders and more.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {SMS_TYPES.map(t => (
              <div key={t.key} style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated notification</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'download' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>⬇️ Download SMS Application</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            To send SMS directly from the app, you need an SMS gateway application. This system uses the device&apos;s native SMS app — no extra app needed.
          </p>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <span>💡</span> Clicking &ldquo;Send&rdquo; on any SMS will open your phone&apos;s SMS or WhatsApp app pre-filled with the message — completely free!
          </div>
          <button className="btn btn-primary" onClick={() => setTab('all')}>✅ Got it — Start Sending</button>
        </div>
      )}

      {tab === 'all' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📣 Send SMS to All Parents</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Message</label>
            <textarea className="form-textarea" placeholder="Type your message to all parents..." value={editMsg} onChange={e => setEditMsg(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => openSMS(editMsg)} className="btn btn-primary" disabled={!editMsg}>📱 Open in SMS App</button>
            <button onClick={() => openWhatsApp(editMsg)} className="btn btn-success" disabled={!editMsg}>💬 Open in WhatsApp</button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
            ℹ️ This opens your native SMS/WhatsApp app where you can select recipients and send.
          </p>
        </div>
      )}

      {SMS_TYPES.map(smsType => tab === smsType.key && (
        <div key={smsType.key} className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{smsType.label}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Customize the message template. Use variables like {'{{name}}'}, {'{{date}}'} etc.
          </p>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Message Template</label>
            <textarea className="form-textarea" value={templates.find(t => t.type === smsType.key)?.message || smsType.defaultMsg}
              onChange={e => saveTemplate(smsType.key, e.target.value)}
              onBlur={e => saveTemplate(smsType.key, e.target.value)}
            />
          </div>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <span>📎</span> Available variables: {'{{name}}'}, {'{{date}}'}, {'{{status}}'}, {'{{amount}}'}, {'{{month}}'}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => openSMS(templates.find(t => t.type === smsType.key)?.message || smsType.defaultMsg)} className="btn btn-primary">📱 Send via SMS</button>
            <button onClick={() => openWhatsApp(templates.find(t => t.type === smsType.key)?.message || smsType.defaultMsg)} className="btn btn-success">💬 Send via WhatsApp</button>
          </div>
        </div>
      ))}

      {tab === 'templates' && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📝 All SMS Templates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {SMS_TYPES.map(smsType => {
              const saved = templates.find(t => t.type === smsType.key)
              return (
                <div key={smsType.key} style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{smsType.icon} {smsType.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {saved?.message || smsType.defaultMsg}
                  </div>
                  <button onClick={() => setTab(smsType.key as Tab)} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>✏️ Edit</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>⚙️ SMS Connection Settings</h3>
          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span>💡</span> This system uses free native SMS/WhatsApp — no API key or gateway needed!
          </div>
          {loadingSettings ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>⏳ Loading settings...</div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">School Phone Number</label>
                <input
                  className="form-input"
                  placeholder="+92 3xx xxxxxxx"
                  value={schoolPhone}
                  onChange={e => setSchoolPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">SMS Sender Name (for display only)</label>
                <input
                  className="form-input"
                  placeholder="School name for reference"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                {savingSettings ? '⏳ Saving...' : '💾 Save Settings'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
