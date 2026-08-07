import { useState, useEffect } from 'react'
import './App.css'
import api from './services/api'
import * as auth from './services/auth'
import Navbar from './components/Navbar'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Eligibility from './pages/Eligibility'

function App() {
  const [serverStatus, setServerStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true

    api.get('/health')
      .then(res => {
        if (!mounted) return
        setServerStatus(res.data)
      })
      .catch(err => {
        if (!mounted) return
        setServerError(err?.response?.data || { error: err.message })
      })

    ;(async () => {
      try {
        const res = await auth.me()
        if (!mounted) return
        setUser(res.user)
      } catch (e) {
        // ignore - user not logged in
      }
    })()

    return () => { mounted = false }
  }, [])

  const handleAuthSuccess = (u) => {
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('sd_token')
    setUser(null)
  }

  return (
    <>
      <Navbar serverStatus={serverStatus} serverError={serverError} user={user} onLogout={logout} onAuthSuccess={handleAuthSuccess} />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/eligibility" element={<Eligibility />} />
        </Routes>
      </main>
    </>
  )
}

export default App
