'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return }
      const redirectPath = data.role === 'admin' ? '/admin' : '/school'
      if (typeof window !== 'undefined') {
        try {
          if (window.top) {
            window.top.location.href = redirectPath
          } else {
            window.location.href = redirectPath
          }
        } catch {
          window.location.href = redirectPath
        }
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '1rem',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        animation: 'pulse-glow 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
        animation: 'pulse-glow 5s ease-in-out infinite 1s',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '15%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div className="animate-slide" style={{
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        padding: '2.5rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.08)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>🏫</div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            <span className="gradient-text">EduManage</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Multi-School Management System
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div className="alert alert-danger animate-fade">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5
              }}>👤</span>
              <input
                id="username"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5
              }}>🔒</span>
              <input
                id="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: '0.9rem', top: '50%',
                transform: 'translateY(-50%)', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '1rem', opacity: 0.5, padding: 0,
                color: 'var(--text-primary)',
              }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '0.5rem', justifyContent: 'center' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Signing in...
              </span>
            ) : 'Sign In →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem',
        }}>
          <div style={{
            background: 'rgba(34,211,238,0.07)', borderRadius: '10px',
            padding: '0.75rem', border: '1px solid rgba(34,211,238,0.12)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>School Login</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Use the credentials given by the Super Admin</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
