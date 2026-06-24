'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashStats {
  totalStudents: number; newAdmissions: number; dischargedStudents: number;
  feeCollected: number; totalExpenses: number; profit: number
}

export default function SchoolDashboard() {
  const [stats, setStats] = useState<DashStats>({
    totalStudents: 0, newAdmissions: 0, dischargedStudents: 0,
    feeCollected: 0, totalExpenses: 0, profit: 0
  })
  const [recentFee, setRecentFee] = useState<{ student: string; amount: number; date: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch('/api/school/dashboard').then(r => r.json()).catch(() => ({})),
    ]).then(([dash]) => {
      if (dash.schoolName) setSchoolName(dash.schoolName)
      if (dash.stats) setStats(dash.stats)
      if (dash.recentFee) setRecentFee(dash.recentFee)
    }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Active Students', value: stats.totalStudents, icon: '🎓', color: '#0093cb', glow: 'rgba(0,147,203,0.15)', href: '/school/students', suffix: '' },
    { label: 'New Admissions', value: stats.newAdmissions, icon: '📥', color: '#10b981', glow: 'rgba(16,185,129,0.15)', href: '/school/students', suffix: '' },
    { label: 'Discharged Students', value: stats.dischargedStudents, icon: '📤', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)', href: '/school/students', suffix: '' },
    { label: 'Fee Collected (Month)', value: stats.feeCollected, icon: '💰', color: '#22d3ee', glow: 'rgba(34,211,238,0.15)', href: '/school/fee', suffix: '₨', isAmount: true },
    { label: 'Total Expenses (Month)', value: stats.totalExpenses, icon: '💸', color: '#ef4444', glow: 'rgba(239,68,68,0.15)', href: '/school/expenses', suffix: '₨', isAmount: true },
    { label: 'Net Profit/Loss', value: stats.profit, icon: stats.profit >= 0 ? '📈' : '📉', color: stats.profit >= 0 ? '#10b981' : '#ef4444', glow: stats.profit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', href: '/school/finance', suffix: '₨', isAmount: true },
  ]

  const quickLinks = [
    { label: 'Mark Attendance', icon: '📋', href: '/school/attendance', color: '#0093cb' },
    { label: 'Add Student', icon: '➕', href: '/school/students', color: '#10b981' },
    { label: 'Collect Fee', icon: '💳', href: '/school/fee', color: '#22d3ee' },
    { label: 'Add Expense', icon: '💸', href: '/school/expenses', color: '#f59e0b' },
    { label: 'Add Result', icon: '📝', href: '/school/result', color: '#8b5cf6' },
    { label: 'WhatsApp', icon: '💬', href: '/school/whatsapp', color: '#25D366' },
  ]

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 300, color: '#333333', margin: 0 }}>Dashboard</h1>
          <span style={{ fontSize: '0.875rem', color: '#777777', fontWeight: 400 }}>statistics and more. You can see summary of your institute.</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/school/attendance" className="btn btn-primary" style={{ borderRadius: '4px' }}>📋 Mark Attendance</Link>
          <Link href="/school/fee" className="btn btn-success" style={{ borderRadius: '4px' }}>💳 Collect Fee</Link>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '0.6rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#555555' }}>
        <span>#</span>
        <span style={{ fontWeight: 600 }}>Dashboard</span>
      </div>



      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: '2rem' }}>
        {statCards.map((card, idx) => {
          const backgroundColors = [
            '#0093cb', // Blue
            '#10b981', // Green
            '#ef4444', // Red
            '#06b6d4', // Cyan
            '#f59e0b', // Amber
            '#8b5cf6', // Purple
          ];
          const bg = backgroundColors[idx % backgroundColors.length];

          return (
            <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
              <div className="stat-card-solid" style={{ background: bg }}>
                <div className="stat-icon-solid">
                  {card.icon}
                </div>
                <div className="stat-value-solid">
                  {loading ? '—' : card.isAmount ? `${card.suffix} ${Number(card.value).toLocaleString()}` : card.value}
                </div>
                <div className="stat-footer-solid">
                  <span>{card.label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>⚡ Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {quickLinks.map(link => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: `${link.color}12`, border: `1px solid ${link.color}25`,
                  borderRadius: '12px', padding: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  transition: 'all 0.2s ease', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${link.color}20`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${link.color}12`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{link.icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: link.color }}>{link.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Fee Collection */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700 }}>💰 Recent Fee Collection</h3>
            <Link href="/school/fee" className="btn btn-secondary btn-sm">View All →</Link>
          </div>
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : recentFee.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <p>No recent fee records</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {recentFee.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.student}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>₨ {Number(f.amount).toLocaleString()}</div>
                    <span className={`badge badge-${f.status === 'paid' ? 'success' : 'warning'}`}>{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
