import { Link } from 'react-router-dom'
import AuthWidget from './AuthWidget'
import "../styles/navbar.css";

export default function Navbar({ serverStatus, serverError, user, onLogout, onAuthSuccess }) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="brand">
          <Link to="/" className="brand-link">
            <div className="logo" aria-hidden />
            <span className="brand-text">Smart e‑District</span>
          </Link>
        </div>
        <div className="search">
          <input placeholder="Search services, schemes or keywords" aria-label="Search services" />
        </div>
      </div>

      <div className="nav-center">
        <nav className="nav-links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/schemes">Schemes</Link>
          <Link to="/sdm-finder">SDM Finder</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </div>

      <div className="nav-right">
        <div className="status-pill" aria-live="polite">
          {serverStatus ? (
            <span className={`status ${serverStatus.status === 'ok' ? 'ok' : 'warn'}`}>Backend: {serverStatus.status}</span>
          ) : serverError ? (
            <span className="status error">Backend error</span>
          ) : (
            <span className="status loading">Checking backend...</span>
          )}
        </div>

        <div className="lang-toggle" role="group" aria-label="Language">
          <button className="lang">EN</button>
          <button className="lang">HI</button>
        </div>

        <div className="auth-area">
          {user ? (
            <div className="user-info">
              <span className="user-name">Hi, {user.name}</span>
              <button className="btn-ghost" onClick={onLogout}>Logout</button>
            </div>
          ) : (
            <AuthWidget onAuthSuccess={onAuthSuccess} />
          )}
        </div>
      </div>
    </header>
  )
}
