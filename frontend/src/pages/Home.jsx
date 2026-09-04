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
      } catch (e) {
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
        <section className="identity-hero" aria-label="SmartEDistrict Delhi home hero">
          <div className="identity-hero-inner">
            <span className="eyebrow">Delhi e-District</span>
            <h1>SmartEDistrict Delhi</h1>
            <p>One Platform. Every Citizen Service.</p>
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
