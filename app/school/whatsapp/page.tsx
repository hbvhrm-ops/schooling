'use client'
import { useState, useEffect, useCallback } from 'react'

type Tab = 'history' | 'connect' | 'templates'

interface CustomTemplate {
  id: string
  type: string
  message: string
}

const WA_TEMPLATES = [
  { name: 'Attendance Alert', message: 'Dear Parent, your child {{name}} was *absent* today {{date}}. Please ensure regular attendance. 🏫 School Management' },
  { name: 'Fee Reminder',     message: 'Dear Parent, this is a reminder that the fee of *₨{{amount}}* for {{name}} is due for {{month}}. Please pay by {{due_date}}. 💳 School Management' },
  { name: 'Result Notice',    message: 'Dear Parent, {{name}} scored *{{marks}}/{{total}}* in {{exam}}. Grade: *{{grade}}*. 📝 School Management' },
  { name: 'General Notice',   message: 'Dear Parent, school will remain closed on {{date}} due to {{reason}}. 📢 School Management' },
]

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('connect')
  const [customMsg, setCustomMsg] = useState('')
  
  // Custom templates states
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [activeTplId, setActiveTplId] = useState<string>('default-0')
  const [editableMsg, setEditableMsg] = useState<string>(WA_TEMPLATES[0].message)
  
  const [newTplName, setNewTplName] = useState('')
  const [newTplMessage, setNewTplMessage] = useState('')
  const [loadingTpl, setLoadingTpl] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoadingTpl(true)
    try {
      const r = await fetch('/api/school/sms').then(res => res.json())
      setCustomTemplates(r.templates || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTpl(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  function sendViaWhatsApp(message: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTplName.trim() || !newTplMessage.trim()) return
    const r = await fetch('/api/school/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newTplName, message: newTplMessage })
    })
    if (r.ok) {
      setNewTplName('')
      setNewTplMessage('')
      loadTemplates()
    }
  }

  async function handleDeleteTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this custom template?')) return
    const r = await fetch(`/api/school/sms?id=${id}`, { method: 'DELETE' })
    if (r.ok) {
      if (activeTplId === id) {
        setActiveTplId('default-0')
        setEditableMsg(WA_TEMPLATES[0].message)
      }
      loadTemplates()
    }
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💬 WhatsApp</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Send messages to parents via WhatsApp</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {([['connect','🔗 Connection'],['templates','📝 Templates'],['history','📋 History']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === 'connect' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🔗 WhatsApp Connection</h3>
            <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>💬</div>
                <div>
                  <div style={{ fontWeight: 700 }}>WhatsApp Web</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Free · No API needed</div>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Clicking &ldquo;Send via WhatsApp&rdquo; opens WhatsApp Web or the app with the message pre-filled. Completely free — no gateway or API key required!
              </p>
            </div>
            <div className="alert alert-success">
              <span>✅</span> WhatsApp is ready to use — just click Send on any message!
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📤 Quick Message</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Message</label>
              <textarea className="form-textarea" placeholder="Type your WhatsApp message..." value={customMsg} onChange={e => setCustomMsg(e.target.value)} />
            </div>
            <button onClick={() => sendViaWhatsApp(customMsg)} className="btn btn-success" disabled={!customMsg} style={{ background: '#25D366', border: 'none', width: '100%', justifyContent: 'center' }}>
              💬 Open in WhatsApp
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
              Opens WhatsApp app/web where you select the recipient
            </p>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📝 Message Templates</h3>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Default Templates</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {WA_TEMPLATES.map((t, i) => {
                const isActive = activeTplId === `default-${i}`
                return (
                  <button key={i} onClick={() => { setActiveTplId(`default-${i}`); setEditableMsg(t.message) }}
                    style={{ background: isActive ? 'rgba(37,211,102,0.1)' : 'var(--bg-surface)', border: `1px solid ${isActive ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <div style={{ fontWeight: 700, color: isActive ? '#25D366' : 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>My School Templates</div>
              {loadingTpl && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loading...</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {customTemplates.map((t) => {
                const isActive = activeTplId === t.id
                return (
                  <div key={t.id} onClick={() => { setActiveTplId(t.id); setEditableMsg(t.message) }}
                    style={{ background: isActive ? 'rgba(37,211,102,0.1)' : 'var(--bg-surface)', border: `1px solid ${isActive ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: isActive ? '#25D366' : 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.type}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                    </div>
                    <button onClick={(e) => handleDeleteTemplate(t.id, e)} className="btn btn-secondary btn-icon" style={{ padding: '4px', width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--danger)' }} title="Delete Template">
                      🗑️
                    </button>
                  </div>
                )
              })}
              {!loadingTpl && customTemplates.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                  No custom templates added yet.
                </div>
              )}
            </div>

            {/* Create Custom Template Form */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>➕ Save New Custom Template</h4>
              <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Template Name *</label>
                  <input className="form-input" placeholder="e.g. Exam Alert, Meeting Notice" value={newTplName} onChange={e => setNewTplName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Message Text *</label>
                  <textarea className="form-textarea" placeholder="Dear Parent, ..." value={newTplMessage} onChange={e => setNewTplMessage(e.target.value)} style={{ minHeight: '80px' }} required />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>💾 Save Template</button>
              </form>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>✏️ Edit & Send</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Template Message (Customize values below)</label>
              <textarea className="form-textarea" value={editableMsg} onChange={e => setEditableMsg(e.target.value)} style={{ minHeight: '140px' }} />
            </div>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <span>📎</span> Variables: {'{{name}}'}, {'{{date}}'}, {'{{amount}}'}, {'{{month}}'}, {'{{marks}}'}, {'{{grade}}'}
            </div>
            <button onClick={() => sendViaWhatsApp(editableMsg)} className="btn" style={{ background: '#25D366', color: '#fff', border: 'none', width: '100%', justifyContent: 'center', padding: '0.75rem', cursor: 'pointer' }}>
              💬 Send via WhatsApp
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📋 WhatsApp Message History</h3>
          <div className="empty-state"><div className="empty-icon">💬</div><p>No WhatsApp messages sent yet. Messages are sent via the WhatsApp app directly.</p></div>
        </div>
      )}
    </div>
  )
}
