import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as auth from '../services/auth'
import '../styles/dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await auth.me()
        if (!mounted) return
        if (res && res.user) {
          setUser(res.user)
        } else {
          setError('Unable to load user profile.')
        }
      } catch (err) {
        if (!mounted) return
        setError(err?.response?.data?.error || 'Authentication required. Please log in.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sd_token')
    setUser(null)
    navigate('/')
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-state">
          <h3>Loading your dashboard...</h3>
          <p>Retrieving citizen details and application records.</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-state">
          <h3>Authentication Required</h3>
          <p>{error || 'Please log in to view your citizen dashboard.'}</p>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const prof = user.citizenProfile || {}
  const apps = Array.isArray(user.applications) ? user.applications : []
  const cards = [
    { title: 'Find a Government Service', path: '/schemes', description: 'Browse available citizen services and official guidance.' },
    { title: 'Check My Eligibility', path: '/eligibility', description: 'Review service eligibility with the latest rules and profile data.' },
    { title: 'Find Required Documents', path: '/schemes', description: 'Review exact document requirements for the service you want.' },
    { title: 'Find My Correct SDM Office', path: '/sdm-locator', description: 'Confirm your locality, ward and assigned SDM office.' },
    { title: 'Track My Application', path: '/dashboard', description: 'Monitor progress and next steps for each application.' },
    { title: 'Ask Dilli Sahayak', description: 'Get quick guidance on eligibility, documents and support.' }
  ]

  const timelineSteps = ['Submitted', 'Verification', 'SDM Review', 'Approved']
  const approved = apps.filter((item) => ['approved', 'completed', 'success'].includes(String(item.status || '').toLowerCase()))
  const inProgress = apps.filter((item) => ['in_progress', 'under_process', 'pending', 'current'].includes(String(item.status || '').toLowerCase()))
  const rejected = apps.filter((item) => String(item.status || '').toLowerCase() === 'rejected')

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>What would you like to do today?</h2>
          <div className="subtext">Welcome back, <strong>{user.name}</strong></div>
        </div>
        <button onClick={handleLogout} className="btn-ghost" type="button">
          Logout
        </button>
      </header>

      <section className="dashboard-action-grid">
        {cards.map((card) => (
          <div key={card.title} className="dashboard-action-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.path ? (
              <Link to={card.path} className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Open
              </Link>
            ) : (
              <button type="button" className="btn-primary" onClick={() => window.dispatchEvent(new Event('open-assistant'))}>
                Chat now
              </button>
            )}
          </div>
        ))}
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Citizen profile</h3>
          <div className="info-list">
            <div className="info-item"><span className="info-label">Full Name</span><span className="info-value">{user.name}</span></div>
            <div className="info-item"><span className="info-label">Email</span><span className="info-value">{user.email}</span></div>
            <div className="info-item"><span className="info-label">Role</span><span className="info-value badge">{user.role || 'Citizen'}</span></div>
            <div className="info-item"><span className="info-label">Member Since</span><span className="info-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Active User'}</span></div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Profile snapshot</h3>
          <div className="info-list">
            <div className="info-item"><span className="info-label">Age</span><span className="info-value">{prof.age ? `${prof.age} years` : 'Not specified'}</span></div>
            <div className="info-item"><span className="info-label">Delhi resident</span><span className="info-value">{prof.residency ? 'Yes' : 'Not specified'}</span></div>
            <div className="info-item"><span className="info-label">Years in Delhi</span><span className="info-value">{prof.residenceYears || 'Not specified'}</span></div>
            <div className="info-item"><span className="info-label">Income</span><span className="info-value">{prof.income ? `₹${Number(prof.income).toLocaleString('en-IN')}` : 'Not specified'}</span></div>
          </div>
        </div>
      </div>

      <section className="dashboard-card timeline-panel">
        <h3>Applications timeline</h3>
        <div className="timeline-step-row">
          {timelineSteps.map((step, index) => (
            <div key={step} className={`timeline-step ${index === 0 ? 'active' : ''}`}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <div className="timeline-note">Submitted → Verification → SDM Review → Approved</div>
      </section>

      <section className="dashboard-card">
        <h3>Application summary</h3>
        <div className="application-sections">
          <div>
            <h4>Approved</h4>
            {approved.length ? approved.map((item) => <div key={item.id || item.applicationId} className="application-card"><strong>{item.serviceName || item.service || 'Service Application'}</strong><span>{item.status || 'Approved'}</span></div>) : <div className="app-empty">No approved applications in your record.</div>}
          </div>
          <div>
            <h4>In Progress</h4>
            {inProgress.length ? inProgress.map((item) => <div key={item.id || item.applicationId} className="application-card"><strong>{item.serviceName || item.service || 'Service Application'}</strong><span>{item.status || 'In progress'}</span></div>) : <div className="app-empty">No applications are currently in progress.</div>}
          </div>
          <div>
            <h4>Rejected</h4>
            {rejected.length ? rejected.map((item) => <div key={item.id || item.applicationId} className="application-card"><strong>{item.serviceName || item.service || 'Service Application'}</strong><span>{item.rejectionReason || 'Review available records for rejection details.'}</span></div>) : <div className="app-empty">No rejected applications found in your record.</div>}
          </div>
        </div>
      </section>
    </div>
  )
}
