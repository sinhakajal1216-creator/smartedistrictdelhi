import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, FileText, CheckCircle2, MapPin, Bot } from 'lucide-react'
import api from '../services/api'
import SchemeCard from '../components/SchemeCard'
import '../styles/schemes.css'

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
      <div className="identity-page">
        <section className="identity-hero" aria-label="SevaSphere home hero">
          <div className="identity-hero-media" aria-hidden="true">
            <picture className="identity-hero-shot identity-hero-shot--india-gate">
              <source
                media="(max-width: 680px)"
                srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/India_Gate%2C_New_Delhi%2C_India_%282018%29.jpg/960px-India_Gate%2C_New_Delhi%2C_India_%282018%29.jpg"
              />
              <source
                media="(min-width: 681px)"
                srcSet="https://upload.wikimedia.org/wikipedia/commons/5/55/India_Gate%2C_New_Delhi%2C_India_%282018%29.jpg"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/India_Gate%2C_New_Delhi%2C_India_%282018%29.jpg/960px-India_Gate%2C_New_Delhi%2C_India_%282018%29.jpg"
                alt=""
                loading="eager"
                decoding="async"
              />
            </picture>
            <picture className="identity-hero-shot identity-hero-shot--red-fort">
              <source
                media="(max-width: 680px)"
                srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Red_fort_new_delhi_with_indian_flag.jpg/960px-Red_fort_new_delhi_with_indian_flag.jpg"
              />
              <source
                media="(min-width: 681px)"
                srcSet="https://upload.wikimedia.org/wikipedia/commons/b/b8/Red_fort_new_delhi_with_indian_flag.jpg"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Red_fort_new_delhi_with_indian_flag.jpg/960px-Red_fort_new_delhi_with_indian_flag.jpg"
                alt=""
                loading="eager"
                decoding="async"
              />
            </picture>
            <div className="identity-hero-overlay" />
          </div>

          <div className="identity-hero-inner">
            <span className="eyebrow">Delhi e-District</span>
            <h1>SevaSphere</h1>
            <p>One Platform. Every Citizen Service.</p>

            <form className="identity-hero-search" onSubmit={onSearch}>
              <div className="identity-search-box">
                <Search className="identity-search-icon" size={20} aria-hidden="true" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search services, certificates or keywords"
                  aria-label="Search citizen services"
                />
                <button type="submit" className="btn-primary">
                  Search
                </button>
              </div>
            </form>

            <div className="stitch-cards-grid" aria-label="Portal Capabilities">
              <div className="stitch-card">
                <div className="stitch-card-icon" aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div className="stitch-card-body">
                  <h3>Government Services & Schemes</h3>
                  <p>Official certificates, revenue department records, and social welfare programs</p>
                </div>
              </div>

              <div className="stitch-card">
                <div className="stitch-card-icon" aria-hidden="true">
                  <CheckCircle2 size={18} />
                </div>
                <div className="stitch-card-body">
                  <h3>Eligibility Evaluation</h3>
                  <p>Rule-based pre-application checks for citizen criteria and entitlements</p>
                </div>
              </div>

              <div className="stitch-card">
                <div className="stitch-card-icon" aria-hidden="true">
                  <MapPin size={18} />
                </div>
                <div className="stitch-card-body">
                  <h3>SDM & Ward Locator</h3>
                  <p>Find your designated administrative office by residential ward and locality</p>
                </div>
              </div>

              <div className="stitch-card">
                <div className="stitch-card-icon" aria-hidden="true">
                  <Bot size={18} />
                </div>
                <div className="stitch-card-body">
                  <h3>Dilli Sahayak AI Assistant</h3>
                  <p>Conversational citizen guidance for required documents and procedures</p>
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
