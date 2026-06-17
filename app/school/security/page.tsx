'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SecurityPage() {
  const router = useRouter()
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPass !== form.confirm) { setMsg({ type: 'danger', text: 'New passwords do not match!' }); return }
    if (form.newPass.length < 6) { setMsg({ type: 'danger', text: 'Password must be at least 6 characters' }); return }
    setSubmitting(true); setMsg(null)
    const r = await fetch('/api/school/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }) })
    const d = await r.json()
    if (r.ok) {
      setMsg({ type: 'success', text: 'Password changed successfully! Please login again.' })
      setForm({ current: '', newPass: '', confirm: '' })
      setTimeout(() => { fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/')) }, 2000)
    } else {
      setMsg({ type: 'danger', text: d.error || 'Failed to change password' })
    }
    setSubmitting(false)
  }

  function getStrength(pass: string) {
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    return score
  }
  const strength = getStrength(form.newPass)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#6366f1', '#10b981']

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>🔐 Security</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your school account security settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '900px' }}>
        {/* Change Password */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>🔑 Change Password</h3>

          {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.25rem' }}>{msg.text}</div>}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass.current ? 'text' : 'password'} value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} required style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, current: !s.current }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass.current ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass.new ? 'text' : 'password'} value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} required style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, new: !s.new }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass.new ? '🙈' : '👁️'}</button>
              </div>
              {form.newPass && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= strength ? strengthColor[strength] : 'var(--border)', transition: 'background 0.3s ease' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColor[strength], fontWeight: 600 }}>
                    {strength > 0 ? strengthLabel[strength] : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass.confirm ? 'text' : 'password'} value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required style={{ paddingRight: '3rem', borderColor: form.confirm && form.confirm !== form.newPass ? 'var(--danger)' : undefined }} />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showPass.confirm ? '🙈' : '👁️'}</button>
              </div>
              {form.confirm && form.confirm !== form.newPass && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>❌ Passwords do not match</span>
              )}
              {form.confirm && form.confirm === form.newPass && (
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✅ Passwords match</span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || !form.current || !form.newPass || form.newPass !== form.confirm}>
              {submitting ? '⏳ Changing...' : '🔐 Change Password'}
            </button>
          </form>
        </div>

        {/* Tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🛡️ Security Tips</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                ['✅', 'Use at least 8 characters'],
                ['✅', 'Mix uppercase and lowercase letters'],
                ['✅', 'Include numbers and special characters'],
                ['✅', 'Don\'t share your password with anyone'],
                ['✅', 'Change password every 3 months'],
                ['❌', 'Don\'t use your school name as password'],
                ['❌', 'Don\'t use common passwords like 12345'],
              ].map(([icon, tip], i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--danger)' }}>⚠️ Account Actions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              These actions will immediately end your current session.
            </p>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }} className="btn btn-danger">
              🚪 Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
