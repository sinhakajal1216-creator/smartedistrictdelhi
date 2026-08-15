import { useState, useEffect } from 'react'
import './App.css'
import api from './services/api'
import * as auth from './services/auth'
import Navbar from './components/Navbar'
import ChatbotWidget from './components/ChatbotWidget'
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
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

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
      <Navbar
        serverStatus={serverStatus}
        serverError={serverError}
        user={user}
        onLogout={logout}
        onAuthSuccess={handleAuthSuccess}
        onOpenAssistant={() => setIsChatbotOpen(true)}
      />

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

      {/* Floating Assistant Trigger Launcher */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            padding: '0.875rem 1.25rem',
            backgroundColor: '#1e3a8a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            zIndex: 9980,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>💬</span>
          <span>e-District Assistant</span>
        </button>
      )}

      {/* Embedded Chatbot Drawer Widget */}
      <ChatbotWidget
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        citizenProfile={user?.citizenProfile}
      />
    </>
  )
}

export default App
