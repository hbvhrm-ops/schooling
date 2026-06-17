'use client'
import { useState } from 'react'

type Tab = 'history' | 'connect' | 'branded' | 'templates'

const WA_TEMPLATES = [
  { name: 'Attendance Alert', message: 'Dear Parent, your child {{name}} was *absent* today {{date}}. Please ensure regular attendance. 🏫 School Management' },
  { name: 'Fee Reminder',     message: 'Dear Parent, this is a reminder that the fee of *₨{{amount}}* for {{name}} is due for {{month}}. Please pay by {{due_date}}. 💳 School Management' },
  { name: 'Result Notice',    message: 'Dear Parent, {{name}} scored *{{marks}}/{{total}}* in {{exam}}. Grade: *{{grade}}*. 📝 School Management' },
  { name: 'General Notice',   message: 'Dear Parent, school will remain closed on {{date}} due to {{reason}}. 📢 School Management' },
]

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('connect')
  const [customMsg, setCustomMsg] = useState('')
  const [selTemplate, setSelTemplate] = useState(0)

  function sendViaWhatsApp(message: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>💬 WhatsApp</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Send messages to parents via WhatsApp</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {([['connect','🔗 Connection'],['templates','📝 Templates'],['branded','🏷️ Branded SMS'],['history','📋 History']] as [Tab, string][]).map(([t, l]) => (
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>📝 Message Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {WA_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => setSelTemplate(i)}
                  style={{ background: selTemplate === i ? 'rgba(37,211,102,0.1)' : 'var(--bg-surface)', border: `1px solid ${selTemplate === i ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  <div style={{ fontWeight: 700, color: selTemplate === i ? '#25D366' : 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>✏️ Edit & Send</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Template Message</label>
              <textarea className="form-textarea" value={WA_TEMPLATES[selTemplate].message} readOnly style={{ minHeight: '140px', opacity: 0.8 }} />
            </div>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <span>📎</span> Variables: {'{{name}}'}, {'{{date}}'}, {'{{amount}}'}, {'{{month}}'}, {'{{marks}}'}, {'{{grade}}'}
            </div>
            <button onClick={() => sendViaWhatsApp(WA_TEMPLATES[selTemplate].message)} className="btn" style={{ background: '#25D366', color: '#fff', border: 'none', width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              💬 Send via WhatsApp
            </button>
          </div>
        </div>
      )}

      {tab === 'branded' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🏷️ Branded SMS</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Customize messages with your school name and branding.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">School Name (used in messages)</label><input className="form-input" placeholder="e.g. Sunrise Public School" /></div>
            <div className="form-group"><label className="form-label">School WhatsApp Number</label><input className="form-input" placeholder="+92 3xx xxxxxxx" /></div>
            <div className="form-group"><label className="form-label">Message Signature</label><input className="form-input" placeholder="e.g. - Sunrise School Management" /></div>
            <button className="btn btn-primary">💾 Save Branding</button>
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
