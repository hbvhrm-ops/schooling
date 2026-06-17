'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/schools', label: 'Schools', icon: '🏫' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>🏫</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>EduManage</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Admin Portal</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
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
            background: 'rgba(99,102,241,0.08)', borderRadius: '12px', padding: '0.85rem',
            marginBottom: '0.75rem', border: '1px solid rgba(99,102,241,0.12)',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Logged in as</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Super Admin</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>Full Access</div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
