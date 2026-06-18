'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/school', label: 'Dashboard', icon: '📊', exact: true },
    ]
  },
  {
    label: 'Academic',
    items: [
      { href: '/school/students', label: 'Students', icon: '🎓' },
      { href: '/school/attendance', label: 'Attendance', icon: '📋' },
      { href: '/school/result', label: 'Results', icon: '📝' },
      { href: '/school/classes', label: 'Classes & Sections', icon: '🏛️' },
      { href: '/school/subjects', label: 'Subjects', icon: '📚' },
      { href: '/school/grading', label: 'Grading Policy', icon: '⭐' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { href: '/school/fee', label: 'Fee Management', icon: '💳' },
      { href: '/school/expenses', label: 'Expenses', icon: '💸' },
      { href: '/school/finance', label: 'Finance Overview', icon: '📈' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { href: '/school/sms', label: 'SMS', icon: '📱' },
      { href: '/school/whatsapp', label: 'WhatsApp', icon: '💬' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { href: '/school/staff', label: 'Staff', icon: '👥' },
      { href: '/school/data', label: 'Data Import/Export', icon: '🗄️' },
      { href: '/school/security', label: 'Security', icon: '🔐' },
      { href: '/school/settings', label: 'Settings', icon: '⚙️' },
    ]
  },
]

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: collapsed ? '70px' : '260px', transition: 'width 0.25s ease', overflow: collapsed ? 'visible' : 'auto' }}>
        <div className="sidebar-logo" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}>🏫</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>EduManage</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>School Portal</div>
              </div>
            </div>
          )}
          {collapsed && <div style={{ fontSize: '1.3rem' }}>🏫</div>}
          <button onClick={() => setCollapsed(!collapsed)} className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed && <div className="nav-section-label">{group.label}</div>}
              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0.7rem' : undefined }}
                >
                  <span className="nav-icon" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  {!collapsed && item.label}
                </Link>
              ))}
              {!collapsed && group.label !== 'Administration' && <div style={{ height: '0.25rem' }} />}
            </div>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{
              background: 'rgba(99,102,241,0.08)', borderRadius: '10px',
              padding: '0.75rem', marginBottom: '0.75rem',
              border: '1px solid rgba(99,102,241,0.12)',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>School</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>School Panel</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            title="Logout"
            style={{ width: '100%', justifyContent: collapsed ? 'center' : undefined }}
          >
            🚪{!collapsed && ' Logout'}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ marginLeft: collapsed ? '70px' : '260px', flex: 1, minHeight: '100vh', transition: 'margin-left 0.25s ease' }}>
        {children}
      </main>
    </div>
  )
}
