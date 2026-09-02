import { useState, useEffect } from 'react'
import './App.css'
import * as auth from './services/auth'
import Navbar from './components/Navbar'
import ChatbotWidget from './components/ChatbotWidget'
import SiteFooter from './components/SiteFooter'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Eligibility from './pages/Eligibility'
import SchemeDetails from './pages/SchemeDetails'
import SDMLocator from './pages/SDMLocator'
import AuthWidget from './components/AuthWidget'

const defaultAccessibility = {
  fontScale: 100,
  highContrast: false,
  simpleLanguage: false,
}

function AuthPage({ mode = 'login', title, subtitle }) {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-page-shell">
        <div className="auth-page-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="auth-page-body">
          <AuthWidget
            initialMode={mode}
            onAuthSuccess={() => navigate('/dashboard')}
          />
        </div>
      </div>
    </div>
  )
}

function WhySmartEDistrict() {
  const metrics = [
    { label: 'Services', value: '24+' },
    { label: 'SDM mappings', value: '50+' },
    { label: 'Eligibility rules', value: '60+' },
    { label: 'Document sets', value: '12+' },
    { label: 'Supported languages', value: '2' },
  ]

  return (
    <div className="why-page">
      <div className="why-card">
        <h1>Why SevaSphere?</h1>
        <p>
          Delhi citizens often face fragmented portals, unclear criteria, repeated office visits, and poor visibility into application status.
        </p>

        <div className="why-grid">
          <div className="why-item">
            <h3>Problems citizens face</h3>
            <ul>
              <li>Multiple portals for similar citizen services</li>
              <li>Confusion among service categories and offices</li>
              <li>Wrong office visits due to unclear SDM jurisdiction</li>
              <li>Manual tracking and delayed status updates</li>
            </ul>
          </div>

          <div className="why-item">
            <h3>SevaSphere advantages</h3>
            <ul>
              <li>Eligibility engine for service readiness</li>
              <li>Document clarity before every application</li>
              <li>SDM mapping by ward and locality</li>
              <li>AI assistant for guidance and support</li>
              <li>Tracking system for current application progress</li>
            </ul>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Measured impact</h3>
        <div className="why-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="metric-card">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/schemes" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Explore services
          </Link>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [isAssistantCompact, setIsAssistantCompact] = useState(false)
  const [language, setLanguage] = useState(() => localStorage.getItem('smartedistrict_language') || 'en')
  const [accessibility, setAccessibility] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartedistrict_accessibility') || 'null')
      return saved ? { ...defaultAccessibility, ...saved } : defaultAccessibility
    } catch {
      return defaultAccessibility
    }
  })

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const token = localStorage.getItem('sd_token')
        if (token) {
          const res = await auth.me()
          if (!mounted) return
          setUser(res.user)
        }
      } catch {
        localStorage.removeItem('sd_token')
      }
    })()

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const openAssistant = () => setIsChatbotOpen(true)
    window.addEventListener('open-assistant', openAssistant)
    return () => {
      window.removeEventListener('open-assistant', openAssistant)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsAssistantCompact(window.scrollY > 220)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('smartedistrict_language', language)
  }, [language])

  useEffect(() => {
    document.documentElement.style.setProperty('--app-scale', String(accessibility.fontScale / 100))
    document.body.classList.toggle('high-contrast', accessibility.highContrast)
    document.body.classList.toggle('easy-mode', accessibility.simpleLanguage)
    localStorage.setItem('smartedistrict_accessibility', JSON.stringify(accessibility))
  }, [accessibility])

  const handleAuthSuccess = (u) => {
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('sd_token')
    setUser(null)
  }

  const toggleLanguage = () => setLanguage(current => current === 'en' ? 'hi' : 'en')
  const increaseFont = () => setAccessibility(cur => ({ ...cur, fontScale: Math.min(130, cur.fontScale + 10) }))
  const decreaseFont = () => setAccessibility(cur => ({ ...cur, fontScale: Math.max(90, cur.fontScale - 10) }))
  const resetAccessibility = () => setAccessibility(defaultAccessibility)
  const toggleHighContrast = () => setAccessibility(cur => ({ ...cur, highContrast: !cur.highContrast }))
  const toggleSimpleLanguage = () => setAccessibility(cur => ({ ...cur, simpleLanguage: !cur.simpleLanguage }))

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onLogout={logout}
        onAuthSuccess={handleAuthSuccess}
        language={language}
        onToggleLanguage={toggleLanguage}
        accessibility={accessibility}
        onIncreaseFont={increaseFont}
        onDecreaseFont={decreaseFont}
        onResetAccessibility={resetAccessibility}
        onToggleHighContrast={toggleHighContrast}
        onToggleSimpleLanguage={toggleSimpleLanguage}
      />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" title="Login" subtitle="Access digital citizen services" />} />
          <Route path="/register" element={<AuthPage mode="register" title="Register" subtitle="Create your citizen account" />} />
          <Route path="/forgot-password" element={<div className="auth-page"><div className="auth-page-shell"><div className="auth-page-header"><h2>Forgot password</h2><p>Use the official Delhi e-District support route.</p></div><div className="auth-page-body"><p>Reset using the official Delhi e-District portal or contact the support desk.</p><a className="btn-primary" href="https://edistrict.delhigovt.nic.in/" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'inline-block', marginRight: '0.5rem' }}>Official portal</a><Link className="btn-ghost" to="/login" style={{ textDecoration: 'none', display: 'inline-block' }}>Back to login</Link></div></div></div>} />
          <Route path="/schemes" element={<Home />} />
          <Route path="/schemes/:id" element={<SchemeDetails />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/sdm-locator" element={<SDMLocator />} />
          <Route path="/why-smartedistrict" element={<WhySmartEDistrict />} />
        </Routes>
      </main>

      <SiteFooter />

      {!isChatbotOpen && (
        <button
          id="dilli-sahayak"
          type="button"
          className={`assistant-launcher ${isAssistantCompact ? 'assistant-launcher--compact' : ''}`}
          onClick={() => setIsChatbotOpen(true)}
          aria-label="Open Dilli Sahayak assistant"
        >
          <span className="assistant-launcher-icon" aria-hidden>💬</span>
          <span className="assistant-launcher-dot" aria-hidden />
          <span>Dilli Sahayak</span>
        </button>
      )}

      <ChatbotWidget
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        citizenProfile={user?.citizenProfile}
      />
    </div>
  )
}

export default App
