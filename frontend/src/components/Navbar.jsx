import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthWidget from './AuthWidget'
import "../styles/navbar.css";

export default function Navbar({ serverStatus, serverError, user, onLogout, onAuthSuccess, onOpenAssistant }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = q.trim()
      navigate('/schemes' + (term ? `?q=${encodeURIComponent(term)}` : ''))
    }
  }

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
          <input placeholder="Search services, schemes or keywords" aria-label="Search services" value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown} />
        </div>
      </div>

      <div className="nav-center">
        <nav className="nav-links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/schemes">Schemes</Link>
          <Link to="/sdm-locator">SDM Locator</Link>
          <Link to="/eligibility">Eligibility</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </div>

      <div className="nav-right">
        <button
          className="btn-ghost"
          onClick={onOpenAssistant}
          style={{
            color: '#1e3a8a',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.4rem 0.75rem',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            fontSize: '0.85rem'
          }}
        >
          💬 Ask Assistant
        </button>

        <div className="status-pill" aria-live="polite">
          {serverStatus ? (
            <span className={`status ${serverStatus.status === 'ok' ? 'ok' : 'warn'}`}>Backend: {serverStatus.status}</span>
          ) : serverError ? (
            <span className="status error">Backend error</span>
          ) : (
            <span className="status loading">Checking backend...</span>
          )}
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
