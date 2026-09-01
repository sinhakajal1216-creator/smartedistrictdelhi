import { Link, useLocation } from 'react-router-dom'
import AuthWidget from './AuthWidget'
import '../styles/navbar.css'

export default function Navbar({
  user,
  onLogout,
  onAuthSuccess,
  language,
  onToggleLanguage
}) {
  const location = useLocation()
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/'].includes(location.pathname)
  const afterLoginLinks = [
    { to: '/schemes', label: 'Services' },
    { to: '/eligibility', label: 'Eligibility' },
    { to: '/dashboard', label: 'Track' },
    { to: '/sdm-locator', label: 'SDM Finder' },
    { to: '/why-sevasphere', label: 'Why SevaSphere' }
  ]

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand-link">
          <div className="logo">
  <img src="delhi.png" alt="SevaSphere Logo" />
  <span>SevaSphere</span>
</div>
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
      
      {/* <div className="nav-right">
        <div className="access-tools" aria-label="Accessibility controls">
          <button type="button" className="lang-toggle" onClick={onToggleLanguage}>
            {language === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
      <button type="button" className="btn-ghost" onClick={onLogout}>Logout</button> */}

        {/* <div className="auth-area">
          {user ? (
            <div className="user-info">
              <span className="user-name">Hi, {user.name}</span>
              <Link to="/dashboard" className="btn-primary nav-dashboard-btn">Dashboard</Link>
              <button type="button" className="btn-ghost" onClick={onLogout}>Logout</button>
            </div>
          ) : !isAuthRoute ? (
            <AuthWidget onAuthSuccess={onAuthSuccess} />
          ) : null}
        </div> */}
      {/* </div> */}

        <div className="nav-right">
          <div className="access-tools" aria-label="Accessibility controls">
            <button type="button" className="lang-toggle" onClick={onToggleLanguage}>
              {language === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {user ? (
            <div className="user-info">
              <span className="user-name">Hi, {user.name}</span>
              <Link to="/dashboard" className="btn-ghost nav-dashboard-btn">Dashboard</Link>
              <button type="button" className="btn-ghost" onClick={onLogout}>Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn-login-register">Login / Register</Link>
          )}
        </div>
    </header>
  )
}
