import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import '../styles/schemes.css'

export default function SchemeDetails() {
  const { id } = useParams()
  const [scheme, setScheme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prevId, setPrevId] = useState(id)

  if (id !== prevId) {
    setPrevId(id)
    setLoading(true)
    setError(null)
    setScheme(null)
  }

  useEffect(() => {
    let mounted = true
    api.get(`/schemes/${id}`)
      .then(res => {
        if (!mounted) return
        setScheme(res.data?.scheme || null)
      })
      .catch(err => {
        if (!mounted) return
        setError(err?.response?.data?.error || err.message || 'Failed to load scheme')
      })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="schemes-container"><div className="loading">Loading scheme details…</div></div>
  if (error) return <div className="schemes-container"><div className="empty">{String(error)}</div></div>
  if (!scheme) return <div className="schemes-container"><div className="empty">Scheme not found</div></div>

  const fieldLabel = (f) => {
    const map = {
      age: 'Age',
      income: 'Annual income',
      category: 'Category',
      gender: 'Gender',
      occupation: 'Occupation',
      maritalStatus: 'Marital status',
      delhiResident: 'Delhi residency',
      residenceYears: 'Years of Delhi residency',
      aadhaar: 'Aadhaar',
      receivesOtherPension: 'Receives other pension',
      disability: 'Disability',
      disabilityPercentage: 'Disability percentage'
    }
    return map[f] || f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
  }

  const opText = (op, value) => {
    if (op === '>=') return `at least ${value}`
    if (op === '<=') return `at most ${value}`
    if (op === '>') return `greater than ${value}`
    if (op === '<') return `less than ${value}`
    if (op === '==') return `is ${value}`
    if (op === '!=') return `is not ${value}`
    if (op === 'in') return `one of (${Array.isArray(value) ? value.join(', ') : value})`
    if (op === 'not_in') return `not one of (${Array.isArray(value) ? value.join(', ') : value})`
    return `${op} ${value}`
  }

  const renderNode = (node) => {
    if (!node) return []
    if (node.all && Array.isArray(node.all)) {
      return node.all.flatMap(child => renderNode(child))
    }
    if (node.any && Array.isArray(node.any)) {
      return node.any.flatMap(child => {
        return renderNode(child).map(t => `(Any) ${t}`)
      })
    }
    const field = node.field || node.f || ''
    const op = node.operator || node.op || ''
    const value = node.value
    const reason = node.reason || ''
    const label = fieldLabel(field)
    const human = `${label}: ${opText(op, value)}`
    return reason ? [`${human} — ${reason}`] : [human]
  }

  const renderEligibility = (rules) => {
    const items = renderNode(rules)
    if (!items || items.length === 0) {
      return <div className="unavailable-box">Eligibility Criteria: Information not available in repository records.</div>
    }
    return (
      <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
        {items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
      </ul>
    )
  }

  const hasDocuments = Array.isArray(scheme.requiredDocuments) && scheme.requiredDocuments.length > 0
  const hasSteps = Array.isArray(scheme.steps) && scheme.steps.length > 0
  const hasOfficialLink = Boolean(scheme.officialLink)

  return (
    <div className="schemes-container">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>{scheme.title}</h1>

        {scheme.department ? (
          <div className="scheme-meta">{scheme.department}</div>
        ) : (
          <div className="scheme-meta unavailable">Department: Information not available</div>
        )}

        {scheme.description && (
          <p className="scheme-desc" style={{ marginTop: '0.75rem', fontSize: '1rem', lineHeight: '1.5' }}>
            {scheme.description}
          </p>
        )}

        <div className="guidance-box">
          <div>
            <h4>Check Your Eligibility</h4>
            <p>Evaluate your profile against all Delhi welfare rules using our citizen eligibility tool.</p>
          </div>
          <div className="scheme-actions">
            <Link to="/eligibility" className="btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Evaluate Eligibility
            </Link>
            {/* <button type="button" className="btn-ghost" onClick={openAssistant}>e-District Assistant</button> */}
            {hasOfficialLink && (
              <a href={scheme.officialLink} target="_blank" rel="noreferrer" className="btn-ghost">
                Apply Online
              </a>
            )}
          </div>
        </div>

        <div className="details-grid">
        <section className="details-section">
          <h3>Eligibility Rules</h3>
          {scheme.eligibilityRules ? (
            renderEligibility(scheme.eligibilityRules)
          ) : (
            <div className="unavailable-box">Eligibility Criteria: Information not available in repository records.</div>
          )}
        </section>

        <section className="details-section">
          <h3>Required Documents</h3>
          {hasDocuments ? (
            <ul>
              {scheme.requiredDocuments.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          ) : (
            <div className="unavailable-box">Required Documents: Information not available in repository records.</div>
          )}
        </section>

        <section className="details-section">
          <h3>Application Steps</h3>
          {hasSteps ? (
            <ol>
              {scheme.steps.map((s, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <strong>{s.title}</strong>
                  {s.description && <div style={{ color: 'var(--text-muted)' }}>{s.description}</div>}
                  {s.link && <div><a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></div>}
                </li>
              ))}
            </ol>
          ) : (
            <div className="unavailable-box">Application Steps: Information not available in repository records.</div>
          )}
        </section>

        <section className="details-section" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20}}>Official Portals & Contacts</h3>
          {hasOfficialLink ? (
            <div>
              <a href={scheme.officialLink} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
                Open Official Portal
              </a>
            </div>
          ) : (
            <div className="unavailable-box">Official Link & Support Contact: Information not available in repository records.</div>
          )}
        </section>
        </div>
      </div>
    </div>
  )
}
