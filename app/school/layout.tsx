'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

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
      { href: '/school/certificates', label: 'Certificates & Forms', icon: '📜' },
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
      { href: '/school/whatsapp', label: 'WhatsApp', icon: '💬' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { href: '/school/staff', label: 'Staff', icon: '👥' },
      { href: '/school/data', label: 'Data Import/Export', icon: '🗄️' },
      { href: '/school/security', label: 'Security', icon: '🔐' },
      { href: '/school/settings', label: 'User Settings', icon: '⚙️' },
    ]
  },
]

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedSession, setSelectedSession] = useState('2026')
  const [schoolName, setSchoolName] = useState('School Portal')
  const [schoolLogo, setSchoolLogo] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetch('/api/school/profile')
      .then(r => r.json())
      .then(data => {
        if (data.school) {
          setSchoolName(data.school.name || 'School Portal')
          setSchoolLogo(data.school.logo_url || '')
        }
      })
      .catch(err => console.error('Error fetching school profile in layout:', err))
  }, [])

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
      return ''
    }
    const sess = getCookie('selected_session')
    if (sess) {
      setSelectedSession(sess)
    } else {
      const defaultSess = new Date().getFullYear().toString()
      document.cookie = `selected_session=${defaultSess}; path=/; max-age=31536000`
      setSelectedSession(defaultSess)
    }
  }, [])

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    document.cookie = `selected_session=${val}; path=/; max-age=31536000`
    setSelectedSession(val)
    window.location.reload()
  }

  // Close sidebar on navigate
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Topbar */}
      {isMobile && (
        <div className="mobile-topbar">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="btn" style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.5rem', padding: 0, cursor: 'pointer' }}>
            ☰
          </button>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{schoolName}</div>
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
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ width: isMobile ? '260px' : (collapsed ? '70px' : '260px'), zIndex: 99 }}>
          <div className="sidebar-logo" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: (collapsed && !isMobile) ? 'center' : 'space-between', borderBottom: '1px solid var(--border)' }}>
            {(!collapsed || isMobile) && (
              <Link href="/school/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: 'inherit', minWidth: 0, flex: 1 }}>
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School Logo" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', background: '#ffffff', border: '1px solid var(--border)', padding: '2px', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  }}>🏫</div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={schoolName}>
                    {schoolName}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>School Portal</div>
                </div>
              </Link>
            )}
            {collapsed && !isMobile && (
              <Link href="/school/settings" title="User Settings" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff', padding: '1px' }} />
                ) : (
                  <div style={{ fontSize: '1.3rem' }}>🏫</div>
                )}
              </Link>
            )}
            {!isMobile && (
              <button onClick={() => setCollapsed(!collapsed)} className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }}>
                {collapsed ? '→' : '←'}
              </button>
            )}
          </div>

          <nav className="sidebar-nav" style={{ flex: 1 }}>
            {navGroups.map(group => (
              <div key={group.label}>
                {(!collapsed || isMobile) && <div className="nav-section-label" style={{ color: '#666666' }}>{group.label}</div>}
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}
                    title={(collapsed && !isMobile) ? item.label : undefined}
                    style={{ justifyContent: (collapsed && !isMobile) ? 'center' : undefined, padding: (collapsed && !isMobile) ? '0.7rem' : undefined }}
                  >
                    <span className="nav-icon" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    {(!collapsed || isMobile) && item.label}
                  </Link>
                ))}
                {(!collapsed || isMobile) && group.label !== 'Administration' && <div style={{ height: '0.25rem' }} />}
              </div>
            ))}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            {(!collapsed || isMobile) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                  padding: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>School</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>School Panel</div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                  padding: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Academic Session</div>
                  <select 
                    value={selectedSession}
                    onChange={handleSessionChange}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="2024">Session 2024</option>
                    <option value="2025">Session 2025</option>
                    <option value="2026">Session 2026</option>
                    <option value="2027">Session 2027</option>
                    <option value="2028">Session 2028</option>
                  </select>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="btn"
              title="Logout"
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
              🚪{(!collapsed || isMobile) && ' Logout'}
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={{ marginLeft: isMobile ? '0' : (collapsed ? '70px' : '260px'), flex: 1, minHeight: '100vh', width: '100%', transition: 'margin-left 0.25s ease' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
