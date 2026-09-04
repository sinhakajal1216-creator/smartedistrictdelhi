import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../styles/navbar.css'

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

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Left: Brand */}
        <div className="nav-left">
          <Link to="/" className="brand-link" onClick={() => setMobileOpen(false)}>
            <img
              src="/sadi.png"
              alt="SevaSphere Logo"
              className="logo"
            />
            <span className="brand-text">SevaSphere</span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="nav-center" aria-label="Primary navigation">
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === link.to ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Right: Desktop User Info / Auth Actions */}
        <div className="nav-right">
          {user ? (
            <div className="user-info">
              <span className="user-greeting">Hi, {user.name}</span>
              <Link to="/dashboard" className="nav-action-btn nav-action-btn-solid">
                Dashboard
              </Link>
              <button
                type="button"
                className="nav-action-btn nav-action-btn-soft"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-action-btn nav-action-btn-solid">
              Login / Register
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={`mobile-hamburger ${mobileOpen ? 'open' : ''}`}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="mobile-menu" aria-label="Mobile navigation">
          <nav className="mobile-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-nav-link ${location.pathname === link.to ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-auth-actions">
            {user ? (
              <>
                <div className="mobile-user-greeting">Hi, {user.name}</div>
                <Link
                  to="/dashboard"
                  className="nav-action-btn nav-action-btn-solid mobile-action-btn"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="nav-action-btn nav-action-btn-soft mobile-action-btn"
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
                className="nav-action-btn nav-action-btn-solid mobile-action-btn"
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
