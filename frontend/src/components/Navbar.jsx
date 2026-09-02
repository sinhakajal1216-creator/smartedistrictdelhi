import { Link } from 'react-router-dom'
import '../styles/navbar.css'

export default function Navbar({
  user,
  onLogout,
  language,
  onToggleLanguage
}) {
  const afterLoginLinks = [
    { to: '/schemes', label: 'Services' },
    { to: '/eligibility', label: 'Eligibility' },
    { to: '/dashboard', label: 'Track' },
    { to: '/sdm-locator', label: 'SDM Finder' },
    { to: '/why-smartedistrict', label: 'Why SevaSphere' }
  ]

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand-link">
          <div className="logo" aria-hidden="true" />
          <span className="brand-text">SevaSphere</span>
        </Link>
      </div>

      <div className="nav-center">
        <nav className="nav-links" aria-label="Primary navigation">
          {user ? (
            afterLoginLinks.map((link) => (
              <Link key={link.to} to={link.to}>{link.label}</Link>
            ))
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/login">Login / Register</Link>
              {/* <Link to="/register">Register</Link> */}
            </>
          )}
        </nav>
      </div>

      <div className="nav-right">
        <div className="access-tools" aria-label="Accessibility controls">
          <button type="button" className="nav-action-btn nav-action-btn-soft" onClick={onToggleLanguage}>
            {language === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>

        {user ? (
          <div className="user-info">
            <span className="user-name">Hi, {user.name}</span>
            <Link to="/dashboard" className="nav-action-btn nav-action-btn-solid">Dashboard</Link>
            <button type="button" className="nav-action-btn nav-action-btn-solid" onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <Link to="/login" className="nav-action-btn nav-action-btn-solid">Login / Register</Link>
        )}
      </div>
    </header>
  )
}
