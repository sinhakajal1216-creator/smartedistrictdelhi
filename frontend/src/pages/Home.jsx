import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

    setQ(qParam)
    setDepartment(deptParam)
    setCategory(catParam)

    fetchSchemes({ q: qParam, department: deptParam || undefined, category: catParam || undefined, limit: 200 })

    let mounted = true
    ;(async () => {
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
    fetchSchemes({ q, department: department || undefined, category: category || undefined })
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
            <h1>SevaSphere</h1>
            <p>One Platform. Every Citizen Service.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="schemes-container">
      <section className="search-panel card">
        <form className="service-controls" onSubmit={onSearch}>
          <div className="service-controls-row">
            <label className="service-control-field service-control-field-search">
              <span className="control-label">Search services</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search services, certificates or keywords"
              />
            </label>
            <div className="service-control-actions">
              <button className="btn-primary service-control-btn" type="submit">Search</button>
              <button type="button" className="btn-ghost service-control-btn" onClick={clearFilters}>Clear</button>
            </div>
          </div>

          <div className="service-controls-row">
            <label className="service-control-field">
              <span className="control-label">Department</span>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select Department</option>
                {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
              </select>
            </label>
            <label className="service-control-field">
              <span className="control-label">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select Category</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
          </div>
        </form>
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
