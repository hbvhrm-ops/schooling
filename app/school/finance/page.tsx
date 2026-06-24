'use client'
import { useState, useEffect } from 'react'

interface FinanceData {
  feeCollected: number; totalExpenses: number; profit: number;
  monthlyData: { month: string; income: number; expenses: number }[]
  recentExpenses: { date: string; amount: number; description: string }[]
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData>({ feeCollected: 0, totalExpenses: 0, profit: 0, monthlyData: [], recentExpenses: [] })
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetch(`/api/school/finance?year=${year}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [year])

  const profitPct = data.feeCollected > 0 ? Math.round((data.profit / data.feeCollected) * 100) : 0
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📈 Finance Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Income, expenses and profit/loss summary</p>
        </div>
        <select className="form-select" style={{ width: '120px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Fee Collected', value: data.feeCollected, icon: '💰', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
          { label: 'Total Expenses', value: data.totalExpenses, icon: '💸', color: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
          { label: data.profit >= 0 ? 'Net Profit' : 'Net Loss', value: Math.abs(data.profit), icon: data.profit >= 0 ? '📈' : '📉', color: data.profit >= 0 ? '#22d3ee' : '#ef4444', glow: 'rgba(34,211,238,0.15)' },
        ].map(card => (
          <div key={card.label} className="stat-card" style={{ '--card-glow': card.glow } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: `${card.color}1a`, color: card.color }}>{card.icon}</div>
            <div className="stat-value" style={{ color: card.color, fontSize: '1.5rem' }}>
              {loading ? '—' : `₨ ${Number(card.value).toLocaleString()}`}
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Monthly Chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>📊 Monthly Income vs Expenses ({year})</h3>
          {data.monthlyData.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>No data available for {year}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.monthlyData.map((m, i) => {
                const maxVal = Math.max(...data.monthlyData.map(d => Math.max(d.income, d.expenses)), 1)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '35px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{months[i]}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ height: '10px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(m.income / maxVal) * 100}%`, background: '#10b981', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ height: '10px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(m.expenses / maxVal) * 100}%`, background: '#ef4444', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    <div style={{ width: '90px', fontSize: '0.72rem', textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: '#10b981' }}>₨{(m.income/1000).toFixed(0)}k</div>
                      <div style={{ color: '#ef4444' }}>₨{(m.expenses/1000).toFixed(0)}k</div>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '12px', height: '6px', background: '#10b981', borderRadius: '2px' }} /> Income
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '12px', height: '6px', background: '#ef4444', borderRadius: '2px' }} /> Expenses
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profit/Loss & Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>💹 Profit Margin</h3>
            <div className="progress-bar" style={{ marginBottom: '0.5rem', height: '12px' }}>
              <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, profitPct))}%`, background: data.profit >= 0 ? 'linear-gradient(90deg,#10b981,#22d3ee)' : 'linear-gradient(90deg,#ef4444,#f97316)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Profit margin</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: data.profit >= 0 ? '#10b981' : '#ef4444' }}>{profitPct}%</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>💸 Recent Expenses</h3>
            {!data.recentExpenses || data.recentExpenses.length === 0 ? (
              <div className="empty-state"><p>No expense records found</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.recentExpenses.map((exp, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{exp.description || 'No description'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.date}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>₨ {Number(exp.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
