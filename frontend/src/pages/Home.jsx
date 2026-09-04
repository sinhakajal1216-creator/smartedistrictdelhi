import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import SchemeCard from '../components/SchemeCard'
import '../styles/schemes.css'
import '../styles/stitch.css'

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const isHomeView = location.pathname === '/'

  const [q, setQ] = useState(params.get('q') || '')
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [department, setDepartment] = useState(params.get('department') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [serverDepartments, setServerDepartments] = useState([])
  const [serverCategories, setServerCategories] = useState([])

  const fetchSchemes = async (opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = { q: opts.q ?? q }
      if (opts.department !== undefined) searchParams.department = opts.department
      if (opts.category !== undefined) searchParams.category = opts.category
      searchParams.limit = opts.limit ?? 200
      const res = await api.get('/schemes', { params: searchParams })
      const result = res.data?.schemes || res.schemes || []
      setSchemes(result)
    } catch (err) {
      setError(err?.response?.data || { error: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const qParam = searchParams.get('q') || ''
    const deptParam = searchParams.get('department') || ''
    const catParam = searchParams.get('category') || ''

    let mounted = true
    ;(async () => {
      setQ(qParam)
      setDepartment(deptParam)
      setCategory(catParam)

      await fetchSchemes({ q: qParam, department: deptParam || undefined, category: catParam || undefined, limit: 200 })

      try {
        const [dRes, cRes] = await Promise.all([
          api.get('/schemes/departments'),
          api.get('/schemes/categories')
        ])
        if (!mounted) return
        setServerDepartments(dRes.data?.departments || dRes.departments || [])
        setServerCategories(cRes.data?.categories || cRes.categories || [])
      } catch {
        // ignore server list failures
      }
    })()

    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const departments = useMemo(() => {
    if (serverDepartments && serverDepartments.length > 0) return serverDepartments
    const set = new Set()
    schemes.forEach((s) => s.department && set.add(s.department))
    return Array.from(set).sort()
  }, [schemes, serverDepartments])

  const categories = useMemo(() => {
    if (serverCategories && serverCategories.length > 0) return serverCategories
    const set = new Set()
    schemes.forEach((s) => Array.isArray(s.categories) && s.categories.forEach((c) => c && set.add(c)))
    return Array.from(set).sort()
  }, [schemes, serverCategories])

  useEffect(() => {
    if (isHomeView) return
    const search = new URLSearchParams()
    if (q) search.set('q', q)
    if (department) search.set('department', department)
    if (category) search.set('category', category)
    navigate({ pathname: '/schemes', search: search.toString() }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, category, isHomeView])

  const onSearch = (event) => {
    event.preventDefault()
    const search = new URLSearchParams()
    if (q) search.set('q', q)
    if (department) search.set('department', department)
    if (category) search.set('category', category)
    navigate({ pathname: '/schemes', search: search.toString() })
  }

  const clearFilters = () => {
    setDepartment('')
    setCategory('')
    setQ('')
    navigate('/schemes')
    fetchSchemes({ q: '', department: undefined, category: undefined })
  }

  if (isHomeView) {
    return (
      <div className="stitch-home">
        {/* Hero Section Bleeding Seamlessly Under Header */}
        <section className="stitch-hero-wrap" aria-label="SevaSphere Homepage Hero">
          <div
            className="stitch-hero-bg"
            style={{ backgroundImage: 'url("/india_gate_dusk.jpg")' }}
            aria-hidden="true"
          />
          <div className="stitch-hero-overlay" aria-hidden="true" />

          <div className="stitch-hero-content">
            <h1 className="stitch-hero-title">SevaSphere</h1>
            <p className="stitch-hero-subtitle">SmartEDistrict Delhi</p>
            <p className="stitch-hero-tagline">
              One Platform. Every Citizen Service.
            </p>
          </div>
        </section>

        {/* Cards Section: Exactly the 5 Requested Concepts, Matching Visual Styling */}
        <section className="stitch-section-services" id="services" aria-label="Citizen Facilitation Services">
          <div className="stitch-section-inner">
            {/* Section Header */}
            <div className="stitch-section-header">
              <div className="stitch-eyebrow">
                <span className="material-symbols-outlined">account_balance</span>
                <span>Citizen Facilitation Architecture</span>
              </div>
              <h2 className="stitch-heading">AI POWERED  CITIZEN ASSITANCE PLATFORM</h2>
              <p className="stitch-heading-sub">
                Structured administrative access across Delhi departments, facilitating seamless civil and governance workflows.
              </p>
            </div>

            {/* 5 Requested Concepts Grid */}
            <div className="stitch-cards-grid-5">
              {/* Card 1: Government Services & Schemes */}
              <div
                className="stitch-feature-card"
                onClick={() => navigate('/schemes')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/schemes')}
                aria-label="Navigate to Government Services and Schemes"
              >
                <div className="stitch-card-top">
                  <div className="stitch-card-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined">category</span>
                  </div>
                  <h3 className="stitch-card-h3">
                    Government Services &amp; Schemes
                  </h3>
                  <p className="stitch-card-p">
                    Explore unified state schemes and civic certifications.
                  </p>
                </div>
                <div className="stitch-card-bottom">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>State Department Integration</span>
                </div>
              </div>

              {/* Card 2: Eligibility Assistance */}
              <div
                className="stitch-feature-card"
                onClick={() => navigate('/eligibility')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/eligibility')}
                aria-label="Navigate to Eligibility Assistance"
              >
                <div className="stitch-card-top">
                  <div className="stitch-card-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined">rule</span>
                  </div>
                  <h3 className="stitch-card-h3">
                    Eligibility Assistance
                  </h3>
                  <p className="stitch-card-p">
                    Check qualifying criteria and benefits across departments.
                  </p>
                </div>
                <div className="stitch-card-bottom">
                  <span className="material-symbols-outlined">verified</span>
                  <span>Scheme Qualification</span>
                </div>
              </div>

              {/* Card 3: Document Guidance */}
              <div
                className="stitch-feature-card"
                onClick={() => navigate('/schemes')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/schemes')}
                aria-label="Navigate to Document Guidance"
              >
                <div className="stitch-card-top">
                  <div className="stitch-card-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <h3 className="stitch-card-h3">
                    Document Guidance
                  </h3>
                  <p className="stitch-card-p">
                    Clear requirements and procedural steps for citizen applications.
                  </p>
                </div>
                <div className="stitch-card-bottom">
                  <span className="material-symbols-outlined">checklist</span>
                  <span>Procedural Instructions</span>
                </div>
              </div>

              {/* Card 4: Dilli Sahayak AI Assistant */}
              <div
                className="stitch-feature-card"
                onClick={() => window.dispatchEvent(new CustomEvent('open-assistant'))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('open-assistant'))}
                aria-label="Open Dilli Sahayak AI Assistant"
              >
                <div className="stitch-card-top">
                  <div className="stitch-card-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <h3 className="stitch-card-h3">
                    Dilli Sahayak AI Assistant
                  </h3>
                  <p className="stitch-card-p">
                    24/7 intelligent citizen guidance and query support.
                  </p>
                </div>
                <div className="stitch-card-bottom">
                  <span className="material-symbols-outlined">forum</span>
                  <span>Interactive Citizen Aid</span>
                </div>
              </div>

              {/* Card 5: SDM / Jurisdiction Assistance */}
              <div
                className="stitch-feature-card"
                onClick={() => navigate('/sdm-locator')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/sdm-locator')}
                aria-label="Navigate to SDM and Jurisdiction Assistance"
              >
                <div className="stitch-card-top">
                  <div className="stitch-card-icon-wrap" aria-hidden="true">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <h3 className="stitch-card-h3">
                    SDM / Jurisdiction Assistance
                  </h3>
                  <p className="stitch-card-p">
                    Locate relevant revenue jurisdiction and subdivision magistracy.
                  </p>
                </div>
                <div className="stitch-card-bottom">
                  <span className="material-symbols-outlined">distance</span>
                  <span>Subdivision Locator</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="schemes-container">
      <section className="search-panel card">
        <form className="search-row" onSubmit={onSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services, certificates or keywords" />
          <button className="btn-primary" type="submit">Search</button>
          <button type="button" className="btn-ghost" onClick={clearFilters}>Clear</button>
        </form>

        <div className="filter-row">
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </section>

      {loading && <div className="loading">Loading services…</div>}
      {error && <div className="empty">{String(error?.error || error?.message || 'Failed to load services')}</div>}

      {!loading && !error && (
        <div className="schemes-grid">
          {schemes.length ? schemes.map((scheme) => (
            <SchemeCard key={scheme.id || scheme._id || scheme.title} scheme={scheme} />
          )) : <div className="empty">No services found for the selected filters.</div>}
        </div>
      )}
    </div>
  )
}
