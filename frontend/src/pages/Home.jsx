import { useEffect, useState, useMemo } from 'react'
import api from '../services/api'
import SchemeCard from '../components/SchemeCard'
import '../styles/schemes.css'

export default function Home() {
  const [q, setQ] = useState('')
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [department, setDepartment] = useState('')
  const [category, setCategory] = useState('')
  const [serverDepartments, setServerDepartments] = useState([])
  const [serverCategories, setServerCategories] = useState([])

  // fetch schemes with optional params
  const fetchSchemes = async (opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = { q: opts.q ?? q }
      if (opts.department !== undefined) params.department = opts.department
      if (opts.category !== undefined) params.category = opts.category
      // request a larger page to populate filters if needed
      params.limit = opts.limit ?? 200
      const res = await api.get('/schemes', { params })
      const result = res.data?.schemes || res.schemes || []
      setSchemes(result)
    } catch (err) {
      setError(err?.response?.data || { error: err.message })
    } finally {
      setLoading(false)
    }
  }

  // initial load
  useEffect(() => {
    fetchSchemes({ q: '', limit: 200 })

    // also attempt to load authoritative lists from server
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
        // ignore - fall back to derived lists
      }
    })()

    return () => { mounted = false }
  }, [])

  // derive filter options from loaded schemes, prefer server lists when available
  const departments = useMemo(() => {
    if (serverDepartments && serverDepartments.length > 0) return serverDepartments
    const set = new Set()
    schemes.forEach(s => s.department && set.add(s.department))
    return Array.from(set).sort()
  }, [schemes, serverDepartments])

  const categories = useMemo(() => {
    if (serverCategories && serverCategories.length > 0) return serverCategories
    const set = new Set()
    schemes.forEach(s => Array.isArray(s.categories) && s.categories.forEach(c => c && set.add(c)))
    return Array.from(set).sort()
  }, [schemes, serverCategories])

  // apply filters when changed
  useEffect(() => {
    // fetch with current filters and query
    fetchSchemes({ q, department: department || undefined, category: category || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, category])

  const onSearch = (e) => {
    e.preventDefault()
    fetchSchemes({ q, department: department || undefined, category: category || undefined })
  }

  const clearFilters = () => {
    setDepartment('')
    setCategory('')
    setQ('')
    fetchSchemes({ q: '', department: undefined, category: undefined })
  }

  return (
    <div className="schemes-container">
      <h2 style={{ marginBottom: 12 }}>Government Services & Schemes</h2>

      <form className="search-row" onSubmit={onSearch}>
        <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schemes or services" />
        <button className="btn-primary search-button" type="submit">Search</button>
      </form>

      <div className="filters">
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button type="button" className="btn-ghost" onClick={clearFilters}>Clear</button>
      </div>

      {loading ? (
        <div className="loading">Loading schemes…</div>
      ) : error ? (
        <div className="empty">Error loading schemes</div>
      ) : schemes.length === 0 ? (
        <div className="empty">No schemes found</div>
      ) : (
        <div className="schemes-list">
          {schemes.map(s => <SchemeCard key={s._id || s.id} scheme={s} />)}
        </div>
      )}
    </div>
  )
}
