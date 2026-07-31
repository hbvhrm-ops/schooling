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
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [schoolLogo, setSchoolLogo] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/school/dashboard').then(r => r.json()).catch(() => ({})),
    ]).then(([dash]) => {
      if (dash.schoolName) setSchoolName(dash.schoolName)
      if (dash.schoolLogo) setSchoolLogo(dash.schoolLogo)
      if (dash.stats) setStats(dash.stats)
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

      {/* School Brand Banner */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.25rem', 
        marginBottom: '2rem',
        padding: '1.25rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {schoolLogo ? (
          <img src={schoolLogo} alt={`${schoolName} Logo`} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px' }} />
        ) : (
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', color: '#ffffff' }}>
            🏫
          </div>
        )}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{schoolName || 'Loading School...'}</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>Welcome back to your administration dashboard.</p>
        </div>
      </div>



      {/* Stats */}
      <div className="grid-stats">
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
    </div>
  )
}
