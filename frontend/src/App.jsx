import { useState, useEffect } from 'react'
import './App.css'
import './styles/stitch.css'
import * as auth from './services/auth'
import Navbar from './components/Navbar'
import ChatbotWidget from './components/ChatbotWidget'
import SiteFooter from './components/SiteFooter'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
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

function AuthPage({ mode = 'login', onAuthSuccess }) {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <AuthWidget
        initialMode={mode}
        onAuthSuccess={(u) => {
          if (onAuthSuccess) onAuthSuccess(u)
          navigate('/dashboard')
        }}
      />
    </div>
  )
}

function WhySmartEDistrict() {
  const metrics = [
    { label: 'Services', value: '15' },
    { label: 'SDM Mappings', value: '33 SDMs / 11 Districts' },
    { label: 'Eligibility Rules', value: '5 Core Services with Full Evaluation' },
    { label: 'Document Sets', value: '15 Verified Services' }
  ]

  return (
    <div className="why-page">
      <div className="why-card">
        <h1>Why SevaSphere?</h1>
        <p>
          Delhi citizens often face fragmented portals, unclear criteria, and repeated office visits.
        </p>

        <div className="why-grid">
          <div className="why-item">
            <h3>Problems citizens face</h3>
            <ul>
              <li>Multiple portals for similar citizen services</li>
              <li>Confusion among service categories and offices</li>
              <li>Wrong office visits due to unclear SDM jurisdiction</li>
            </ul>
          </div>

          <div className="why-item">
            <h3>SevaSphere advantages</h3>
            <ul>
              <li>Eligibility engine for service readiness</li>
              <li>Document clarity before every application</li>
              <li>SDM mapping by ward and locality</li>
              <li>AI assistant for guidance and support</li>
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
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [user, setUser] = useState(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [language] = useState(() => localStorage.getItem('smartedistrict_language') || 'en')
  const [accessibility] = useState(() => {
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

  return (
    <div className={`app-shell ${isHome ? 'stitch-body-root' : ''}`}>
      <Navbar
        user={user}
        onLogout={logout}
      />

      <main className={`app-main ${isHome ? 'app-main--home' : 'stitch-page-spacer'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" onAuthSuccess={handleAuthSuccess} title="Login" subtitle="Access digital citizen services" />} />
          <Route path="/register" element={<AuthPage mode="register" onAuthSuccess={handleAuthSuccess} title="Register" subtitle="Create your citizen account" />} />
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
          className="stitch-floating-launcher"
          onClick={() => setIsChatbotOpen(true)}
          aria-label="Open Dilli Sahayak AI assistant"
        >
          <div className="stitch-floating-pill">
            <span className="stitch-floating-pill-title">Dilli Sahayak</span>
            <span className="stitch-floating-pill-desc">Citizen Help</span>
          </div>
          <div className="stitch-floating-btn">
            <span className="material-symbols-outlined">support_agent</span>
            <span className="stitch-ping-container">
              <span className="stitch-ping-radar" />
              <span className="stitch-ping-dot" />
            </span>
          </div>
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
