'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/schools', label: 'Schools', icon: '🏫' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on navigate
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Topbar */}
      {isMobile && (
        <div className="mobile-topbar">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="btn" style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.5rem', padding: 0, cursor: 'pointer' }}>
            ☰
          </button>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>EduManage Admin</div>
          <div style={{ width: '24px' }} />
        </div>
      )}

      <div className="main-layout" style={{ flex: 1, position: 'relative' }}>
        {/* Sidebar Backdrop on Mobile */}
        {isMobile && mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 98,
            }}
          />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{ zIndex: 99 }}>
          <div className="sidebar-logo" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              }}>🏫</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1, color: '#ffffff' }}>EduManage</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Admin Portal</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label" style={{ color: '#666666' }}>Main Menu</div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem',
              marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Logged in as</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Super Admin</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Full Access</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                color: '#f87171',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem',
                fontSize: '0.875rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={{ marginLeft: isMobile ? '0' : '260px', flex: 1, minHeight: '100vh', width: '100%', transition: 'margin-left 0.3s ease' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
