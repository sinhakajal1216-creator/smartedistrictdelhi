import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../styles/stitch.css'

export default function Navbar({
  user,
  onLogout
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { to: '/schemes', label: 'Services' },
    { to: '/eligibility', label: 'Eligibility' },
    { to: '/sdm-locator', label: 'SDM Finder' },
    { to: '/why-smartedistrict', label: 'Why SevaSphere' }
  ]

  const isLinkActive = (to) => {
    if (to === '/schemes') {
      return location.pathname === '/' || location.pathname === '/schemes' || location.pathname.startsWith('/schemes/')
    }
    return location.pathname === to
  }

  const toggleLanguage = () => {
    const current = localStorage.getItem('smartedistrict_language') || 'en'
    const next = current === 'en' ? 'hi' : 'en'
    localStorage.setItem('smartedistrict_language', next)
    window.dispatchEvent(new Event('storage'))
  }

  const toggleHighContrast = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartedistrict_accessibility') || '{}')
      saved.highContrast = !saved.highContrast
      localStorage.setItem('smartedistrict_accessibility', JSON.stringify(saved))
      document.body.classList.toggle('high-contrast', saved.highContrast)
    } catch {
      document.body.classList.toggle('high-contrast')
    }
  }

  return (
    <header className="stitch-header">
      {/* Official GNCTD Top Strip */}
      <div className="stitch-topstrip">
        <div className="stitch-topstrip-inner">
          <span className="stitch-topstrip-title">
            <span>GOVERNMENT OF NCT OF DELHI</span>
            <span className="stitch-topstrip-pipe">|</span>
            <span className="stitch-topstrip-subtitle">NATIONAL CAPITAL TERRITORY OF DELHI</span>
          </span>
          <div className="stitch-topstrip-tools">
            <button
              className="stitch-topstrip-btn"
              type="button"
              onClick={toggleLanguage}
            >
              English / हिन्दी
            </button>
            <span className="stitch-topstrip-pipe stitch-topstrip-desktop-only">|</span>
            <button
              className="stitch-topstrip-btn stitch-topstrip-desktop-only"
              type="button"
              onClick={toggleHighContrast}
            >
              Screen Reader
            </button>
            <a
              className="stitch-topstrip-tool-item stitch-topstrip-desktop-only"
              href="#services"
            >
              Skip to Main Content
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="stitch-navbar-main">
        <Link
          className="stitch-brand"
          to="/"
          onClick={() => setMobileOpen(false)}
          aria-label="SevaSphere Homepage"
        >
          <div className="stitch-emblem-ring">
            <img
              alt="SevaSphere Emblem"
              className="stitch-emblem-img"
              src="/sevasphere_emblem.png"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = '/sadi.png'
              }}
            />
          </div>
          <div className="stitch-brand-titles">
            <span className="stitch-brand-name">SevaSphere</span>
            <span className="stitch-brand-tag">SmartEDistrict Delhi</span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="stitch-nav-links" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`stitch-nav-link ${isLinkActive(link.to) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Desktop Auth Actions */}
        <div className="stitch-auth-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="stitch-user-greet">Hi, {user.name}</span>
              <Link
                to="/dashboard"
                className="stitch-login-btn"
                style={{ padding: '0.45rem 1rem', fontSize: '0.825rem' }}
              >
                Dashboard
              </Link>
              <button
                type="button"
                className="stitch-logout-btn"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="stitch-login-btn">
              Login / Register
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={`stitch-mobile-toggle ${mobileOpen ? 'open' : ''}`}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="stitch-hamburger-bar" />
            <span className="stitch-hamburger-bar" />
            <span className="stitch-hamburger-bar" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="stitch-mobile-drawer" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`stitch-mobile-link ${isLinkActive(link.to) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {user ? (
              <>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>Hi, {user.name}</div>
                <Link
                  to="/dashboard"
                  className="stitch-login-btn"
                  style={{ textAlign: 'center' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="stitch-logout-btn"
                  onClick={() => {
                    setMobileOpen(false)
                    onLogout()
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="stitch-login-btn"
                style={{ textAlign: 'center' }}
                onClick={() => setMobileOpen(false)}
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

