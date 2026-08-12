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
          <p>Retrieving citizen details and account records.</p>
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
          <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Go to Homepage & Login
          </Link>
        </div>
      </div>
    )
  }

  const prof = user.citizenProfile || {}

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>Citizen Dashboard</h2>
          <div className="subtext">Welcome back, <strong>{user.name}</strong></div>
        </div>
        <button onClick={handleLogout} className="btn-ghost">
          Logout
        </button>
      </header>

      <div className="dashboard-grid">
        {/* Account Details */}
        <div className="dashboard-card">
          <h3>Account Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Full Name</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email Address</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Account Role</span>
              <span className="info-value badge">{user.role || 'Citizen'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active User'}
              </span>
            </div>
          </div>
        </div>

        {/* Citizen Profile Details */}
        <div className="dashboard-card">
          <h3>Citizen Profile</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{prof.age !== '' && prof.age !== undefined ? `${prof.age} years` : 'Not specified'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Residency</span>
              <span className="info-value">
                {prof.residency ? 'Delhi Resident' : 'Non-Resident / Not specified'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration in Delhi</span>
              <span className="info-value">
                {prof.residenceYears ? `${prof.residenceYears} years` : 'Not specified'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Annual Income</span>
              <span className="info-value">
                {prof.income ? `₹${Number(prof.income).toLocaleString('en-IN')}` : 'Not specified'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender</span>
              <span className="info-value" style={{ textTransform: 'capitalize' }}>
                {prof.gender || 'Not specified'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Category</span>
              <span className="info-value">{prof.category || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Citizen Services & Actions */}
      <section className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3>Services & Tools</h3>
        <div className="quick-links-grid">
          <Link to="/eligibility" className="quick-link-card">
            <h4>Check Scheme Eligibility</h4>
            <p>Evaluate your eligibility against Delhi government welfare schemes.</p>
          </Link>
          <Link to="/schemes" className="quick-link-card">
            <h4>Browse All Schemes</h4>
            <p>Explore welfare programs, benefits, and application guidelines.</p>
          </Link>
          <Link to="/sdm-locator" className="quick-link-card">
            <h4>Locate SDM Office</h4>
            <p>Find your designated Sub-Divisional Magistrate office by locality or PIN.</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
