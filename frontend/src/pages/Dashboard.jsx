import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, FileCheck, MapPin, Search } from 'lucide-react'
import * as auth from '../services/auth'
import '../styles/dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-state">
          <h3>Loading your dashboard...</h3>
          <p>Retrieving your citizen profile.</p>
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
  const profileEditPath = '/eligibility'
  const profileEditState = { fromProfileEdit: true }
  const cards = [
    { title: 'Find a Government Service', path: '/schemes', description: 'Browse available citizen services and official guidance.', icon: Search },
    { title: 'Check My Eligibility', path: '/eligibility', description: 'Review service eligibility with the latest rules and profile data.', icon: CheckCircle },
    { title: 'Find Required Documents', path: '/schemes', description: 'Review exact document requirements for the service you want.', icon: FileCheck },
    { title: 'Find My Correct SDM Office', path: '/sdm-locator', description: 'Confirm your locality, ward and assigned SDM office.', icon: MapPin }
  ]

  const hasResidencyBoolean = typeof prof.residency === 'boolean'
  const hasDelhiResidentBoolean = typeof prof.delhiResident === 'boolean'
  const residencyKnown = hasResidencyBoolean || hasDelhiResidentBoolean
  const isDelhiResident = hasResidencyBoolean ? prof.residency : prof.delhiResident
  const hasAge = prof.age !== null && prof.age !== undefined && prof.age !== ''
  const hasResidenceYears = prof.residenceYears !== null && prof.residenceYears !== undefined && prof.residenceYears !== ''
  const hasIncome = prof.income !== null && prof.income !== undefined && prof.income !== ''

  const renderProfilePrompt = (prompt) => (
    <Link to={profileEditPath} state={profileEditState} className="profile-complete-link">
      {prompt} <span aria-hidden>→</span>
    </Link>
  )

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>What would you like to do today?</h2>
          <div className="subtext">Welcome back, <strong>{user.name}</strong></div>
        </div>
        <Link to="/schemes" className="btn-primary dashboard-header-action" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Explore Services
        </Link>
      </header>

      <section className="dashboard-action-zone">
        <h3 className="section-heading">Quick actions</h3>
        <div className="dashboard-action-grid">
        {cards.map((card) => (
          <article key={card.title} className="dashboard-action-card">
            <div className="action-card-content">
              <div className="action-icon-wrap" aria-hidden="true">
                <card.icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </div>
            <Link to={card.path} className="btn-primary dashboard-open-link" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Open <span aria-hidden>→</span>
            </Link>
          </article>
        ))}
        </div>
      </section>

      <section className="dashboard-profile-zone">
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="profile-card-header">
            <h3>Your Profile</h3>
            <Link to={profileEditPath} state={profileEditState} className="profile-edit-link">
              Edit Profile
            </Link>
          </div>
          <div className="info-list">
            <div className="info-item"><span className="info-label">Full Name</span><span className="info-value">{user.name}</span></div>
            <div className="info-item"><span className="info-label">Email</span><span className="info-value">{user.email}</span></div>
            <div className="info-item"><span className="info-label">Role</span><span className="info-value badge">{user.role || 'Citizen'}</span></div>
            <div className="info-item"><span className="info-label">Member Since</span><span className="info-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Active User'}</span></div>
            <div className="info-item"><span className="info-label">Age</span><span className="info-value">{hasAge ? `${prof.age} years` : renderProfilePrompt('Add your age')}</span></div>
            <div className="info-item"><span className="info-label">Delhi resident</span><span className="info-value">{residencyKnown ? (isDelhiResident ? 'Yes' : 'No') : renderProfilePrompt('Complete your profile')}</span></div>
            <div className="info-item"><span className="info-label">Years in Delhi</span><span className="info-value">{hasResidenceYears ? prof.residenceYears : renderProfilePrompt('Add years in Delhi')}</span></div>
            <div className="info-item"><span className="info-label">Income</span><span className="info-value">{hasIncome ? `₹${Number(prof.income).toLocaleString('en-IN')}` : renderProfilePrompt('Add your income')}</span></div>
          </div>
        </div>
      </div>
      </section>
    </div>
  )
}
