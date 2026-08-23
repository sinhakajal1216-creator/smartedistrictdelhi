import { Link, useLocation } from 'react-router-dom'
import AuthWidget from './AuthWidget'
import '../styles/navbar.css'

export default function Navbar({
  serverStatus,
  serverError,
  user,
  onLogout,
  onAuthSuccess,
  language,
  onToggleLanguage,
  accessibility,
  onIncreaseFont,
  onDecreaseFont,
  onResetAccessibility,
  onToggleHighContrast,
  onToggleSimpleLanguage
}) {
  const location = useLocation()
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/'].includes(location.pathname)
  const afterLoginLinks = [
    { to: '/schemes', label: 'Services' },
    { to: '/eligibility', label: 'Eligibility' },
    { to: '/dashboard', label: 'Track' },
    { to: '/sdm-locator', label: 'SDM Finder' },
    { to: '/why-smartedistrict', label: 'Why SmartEDistrict' }
  ]

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand-link">
          <div className="logo" aria-hidden="true" />
          <span className="brand-text">SmartEDistrict Delhi</span>
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
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>

      <div className="nav-right">
        <div className="status-pill" aria-live="polite">
          {serverStatus ? (
            <span className={`status ${serverStatus.status === 'ok' ? 'ok' : 'warn'}`}>Backend {serverStatus.status}</span>
          ) : serverError ? (
            <span className="status error">Backend error</span>
          ) : (
            <span className="status loading">Checking backend...</span>
          )}
        </div>

        <div className="access-tools" aria-label="Accessibility controls">
          <button type="button" className="lang-toggle" onClick={onToggleLanguage}>
            {language === 'en' ? 'हिंदी' : 'English'}
          </button>
          <button type="button" className="access-btn" onClick={onDecreaseFont} aria-label="Decrease font size">A−</button>
          <button type="button" className="access-btn" onClick={onIncreaseFont} aria-label="Increase font size">A+</button>
          <button type="button" className="access-btn" onClick={onResetAccessibility}>Reset</button>
          <button type="button" className="access-btn" onClick={onToggleHighContrast}>
            {accessibility?.highContrast ? 'Normal' : 'High contrast'}
          </button>
          <button type="button" className="access-btn" onClick={onToggleSimpleLanguage}>
            {accessibility?.simpleLanguage ? 'Standard' : 'Easy mode'}
          </button>
        </div>

        <div className="auth-area">
          {user ? (
            <div className="user-info">
              <span className="user-name">Hi, {user.name}</span>
              <Link to="/dashboard" className="btn-primary nav-dashboard-btn">Dashboard</Link>
              <button type="button" className="btn-ghost" onClick={onLogout}>Logout</button>
            </div>
          ) : !isAuthRoute ? (
            <AuthWidget onAuthSuccess={onAuthSuccess} />
          ) : null}
        </div>
      </div>
    </header>
  )
}
