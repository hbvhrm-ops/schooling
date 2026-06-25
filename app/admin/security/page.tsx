'use client'
import { useState } from 'react'

export default function SecurityPage() {
  const [currPass, setCurrPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [passSubmitting, setPassSubmitting] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confPass) {
      setPassMsg({ type: 'danger', text: 'New passwords do not match' })
      return
    }
    setPassSubmitting(true)
    setPassMsg(null)
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currPass, newPassword: newPass })
      })
      const data = await res.json()
      if (res.ok) {
        setPassMsg({ type: 'success', text: 'Password changed successfully!' })
        setCurrPass('')
        setNewPass('')
        setConfPass('')
      } else {
        setPassMsg({ type: 'danger', text: data.error || 'Failed to change password' })
      }
    } catch {
      setPassMsg({ type: 'danger', text: 'Connection error' })
    } finally {
      setPassSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease', maxWidth: '600px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          🔐 Security <span className="gradient-text">Settings</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your administrator portal account password and access controls
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Change Admin Password</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          We recommend choosing a strong, unique password to secure the super administrator control panel.
        </p>

        {passMsg && (
          <div className={`alert alert-${passMsg.type}`} style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', marginBottom: '1.25rem', borderRadius: '8px' }}>
            {passMsg.type === 'success' ? '✅' : '❌'} {passMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currPass}
              onChange={e => setCurrPass(e.target.value)}
              required
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confPass}
              onChange={e => setConfPass(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
            disabled={passSubmitting}
          >
            {passSubmitting ? '⏳ Updating...' : '💾 Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
