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
import SchemeDetails from './pages/SchemeDetails'
import SDMLocator from './pages/SDMLocator'

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
        // Only call auth.me() if a token exists to avoid expected 401s
        const token = localStorage.getItem('sd_token')
        if (token) {
          const res = await auth.me()
          if (!mounted) return
          setUser(res.user)
        }
      } catch (e) {
        // Clear invalid token from localStorage
        localStorage.removeItem('sd_token')
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
          <Route path="/schemes" element={<Home />} />
          <Route path="/schemes/:id" element={<SchemeDetails />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/sdm-locator" element={<SDMLocator />} />
        </Routes>
      </main>
    </>
  )
}

export default App
