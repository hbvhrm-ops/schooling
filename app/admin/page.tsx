'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface School { id: string; name: string; active: boolean; contact: string; created_at: string }
interface Stats { total: number; active: number }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0 })
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  // Password change states
  const [currPass, setCurrPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [passSubmitting, setPassSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/schools')
      .then(r => r.json())
      .then(data => {
        const list: School[] = data.schools || []
        setSchools(list)
        setStats({ total: list.length, active: list.filter((s: School) => s.active).length })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

  const statCards = [
    { label: 'Total Schools', value: stats.total, icon: '🏫', color: '#0093cb', glow: 'rgba(0,147,203,0.15)' },
    { label: 'Active Schools', value: stats.active, icon: '✅', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
    { label: 'Inactive Schools', value: stats.total - stats.active, icon: '⏸️', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  ]

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage all schools from one place
          </p>
        </div>
        <Link href="/admin/schools" className="btn btn-primary">
          ➕ Register New School
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid-stats" style={{ marginBottom: '2rem' }}>
        {statCards.map(card => (
          <div key={card.label} className="stat-card animate-slide" style={{ '--card-glow': card.glow } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: `${card.color}1a`, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-value" style={{ color: card.color }}>
              {loading ? '—' : card.value}
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom Section Layout */}
      <div className="grid-admin">
        {/* Left Column: Registered Schools */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700 }}>Registered Schools</h3>
            <Link href="/admin/schools" className="btn btn-secondary btn-sm">View All →</Link>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><p>Loading schools...</p></div>
          ) : schools.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏫</div>
              <p>No schools registered yet.</p>
              <Link href="/admin/schools" className="btn btn-primary" style={{ marginTop: '1rem' }}>Register First School</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>School Name</th>
                    <th>Contact</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.slice(0, 8).map((school, i) => (
                    <tr key={school.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{school.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{school.contact || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(school.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${school.active ? 'badge-success' : 'badge-danger'}`}>
                          {school.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Link href="/admin/schools" className="btn btn-secondary btn-sm">Manage</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Change Password Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🔐 Security Settings</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Update the Super Admin portal login password.
          </p>

          {passMsg && (
            <div className={`alert alert-${passMsg.type}`} style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', marginBottom: '1.25rem', borderRadius: '8px' }}>
              {passMsg.type === 'success' ? '✅' : '❌'} {passMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currPass}
                onChange={e => setCurrPass(e.target.value)}
                required
                placeholder="Enter current password"
                style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
                placeholder="Enter new password"
                style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confPass}
                onChange={e => setConfPass(e.target.value)}
                required
                placeholder="Confirm new password"
                style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
              disabled={passSubmitting}
            >
              {passSubmitting ? '⏳ Updating...' : '💾 Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
