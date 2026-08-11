import { useState } from 'react'
import * as auth from '../services/auth'

export default function AuthWidget({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
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
        <button type="button" onClick={() => setMode('login')} disabled={mode === 'login'}>Login</button>
        <button type="button" onClick={() => setMode('register')} disabled={mode === 'register'}>Register</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <div>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <button type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}</button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  )
}
