import { useState } from 'react'
import * as auth from '../services/auth'

export default function AuthWidget({ onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError(null)
    setFieldErrors({})
  }

  const validate = () => {
    const nextErrors = {}
    if (mode === 'register' && !name.trim()) {
      nextErrors.name = 'Full name is required'
    }
    if (!email.trim()) {
      nextErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address'
    }
    if (!password) {
      nextErrors.password = 'Password is required'
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await auth.login(email, password)
        if (onAuthSuccess) onAuthSuccess(data.user)
      } else {
        const data = await auth.register(name, email, password)
        if (onAuthSuccess) onAuthSuccess(data.user)
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-container">
      <div className="auth-card-header">
        <h2 className="auth-card-title">SevaSphere</h2>
        <p className="auth-card-subtitle">
          {mode === 'login' ? 'Citizen Sign In' : 'Create Citizen Account'}
        </p>
      </div>

      <div className="auth-segmented-switch" role="tablist" aria-label="Authentication type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
          onClick={() => switchMode('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <span className="auth-error-icon" aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="auth-form" noValidate>
        {mode === 'register' && (
          <div className="auth-form-group">
            <label htmlFor="auth-name" className="auth-label">
              Full Name
            </label>
            <input
              id="auth-name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="e.g. Kajal Sinha"
              className={`auth-input ${fieldErrors.name ? 'input-invalid' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }))
              }}
              disabled={loading}
            />
            {fieldErrors.name && (
              <span className="auth-error-message" role="alert">
                {fieldErrors.name}
              </span>
            )}
          </div>
        )}

        <div className="auth-form-group">
          <label htmlFor="auth-email" className="auth-label">
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="e.g. citizen@example.com"
            className={`auth-input ${fieldErrors.email ? 'input-invalid' : ''}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }))
            }}
            disabled={loading}
          />
          {fieldErrors.email && (
            <span className="auth-error-message" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className="auth-form-group">
          <label htmlFor="auth-password" className="auth-label">
            Password
          </label>
          <div className="password-field-wrap">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 8 characters"
              className={`auth-input password-input ${fieldErrors.password ? 'input-invalid' : ''}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }))
              }}
              disabled={loading}
            />
            <button
              type="button"
              className="password-reveal-btn"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {fieldErrors.password && (
            <span className="auth-error-message" role="alert">
              {fieldErrors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary auth-submit-btn"
          disabled={loading}
        >
          {loading ? (
            <span className="auth-spinner-label">
              <span className="auth-spinner" aria-hidden="true" />
              <span>Verifying...</span>
            </span>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Citizen Account'
          )}
        </button>

        <div className="auth-notice-box">
          <p>
            Official Delhi Government credentials and portal records are managed exclusively on the{' '}
            <a
              href="https://edistrict.delhigovt.nic.in/"
              target="_blank"
              rel="noreferrer"
            >
              official Delhi e-District portal
            </a>.
          </p>
        </div>
      </form>
    </div>
  )
}
