import { useEffect, useState } from 'react'
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
  const [helpMessage, setHelpMessage] = useState('')

  const OFFICIAL_PORTAL_URL = 'https://edistrict.delhigovt.nic.in/'

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const validate = () => {
    const nextErrors = {}
    if (mode === 'register' && !name.trim()) nextErrors.name = 'Name is required'
    if (!email.trim()) nextErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address'
    if (!password) nextErrors.password = 'Password is required'
    else if (password.length < 4) nextErrors.password = 'Password must be at least 4 characters'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setHelpMessage('')
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await auth.login(email, password)
        onAuthSuccess && onAuthSuccess(data.user)
      } else {
        const data = await auth.register(name, email, password)
        onAuthSuccess && onAuthSuccess(data.user)
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-widget">
      <div className="auth-toggle">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(null); setFieldErrors({}); }}>
          Login
        </button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(null); setFieldErrors({}); }}>
          Register
        </button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <div className="auth-field">
            <label htmlFor="auth-name">Full Name</label>
            <input id="auth-name" className={fieldErrors.name ? 'input-error' : ''} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" className={fieldErrors.email ? 'input-error' : ''} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <div className="password-input-wrap">
            <input id="auth-password" type={showPassword ? 'text' : 'password'} className={fieldErrors.password ? 'input-error' : ''} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="auth-actions">
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}</button>
        </div>

        {mode === 'login' && (
          <div className="auth-links">
            <button
              type="button"
              className="auth-link"
              onClick={() => setHelpMessage('Forgot User ID: Use the registered email used at signup. If unavailable, recover via official Delhi e-District support.')}
            >
              Forgot User ID
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => setHelpMessage(`Forgot Password: Reset using the official Delhi e-District support flow at ${OFFICIAL_PORTAL_URL}`)}
            >
              Forgot Password
            </button>
          </div>
        )}

        {helpMessage && <div className="auth-help">{helpMessage}</div>}
        {error && <div className="auth-error">{error}</div>}
      </form>
    </div>
  )
}
