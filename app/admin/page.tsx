'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface School { id: string; name: string; active: boolean; contact: string; created_at: string }
interface Stats { total: number; active: number }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0 })
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

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

  const statCards = [
    { label: 'Total Schools', value: stats.total, icon: '🏫', color: '#6366f1', glow: 'rgba(99,102,241,0.15)' },
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

      {/* Recent Schools */}
      <div className="card">
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
    </div>
  )
}
