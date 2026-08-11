import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import SchemeCard from '../components/SchemeCard'
import '../styles/schemes.css'

export default function SchemeDetails() {
  const { id } = useParams()
  const [scheme, setScheme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    api.get(`/schemes/${id}`)
      .then(res => {
        if (!mounted) return
        setScheme(res.data?.scheme || null)
      })
      .catch(err => {
        if (!mounted) return
        setError(err?.response?.data?.error || err.message || 'Failed to load')
      })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="schemes-container"><div className="loading">Loading scheme details…</div></div>
  if (error) return <div className="schemes-container"><div className="empty">{String(error)}</div></div>
  if (!scheme) return <div className="schemes-container"><div className="empty">Scheme not found</div></div>

  // render rule predicate to human text
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
    if (op === '>=' ) return `at least ${value}`
    if (op === '<=' ) return `at most ${value}`
    if (op === '>' ) return `greater than ${value}`
    if (op === '<' ) return `less than ${value}`
    if (op === '==' ) return `is ${value}`
    if (op === '!=' ) return `is not ${value}`
    if (op === 'in' ) return `one of (${Array.isArray(value)? value.join(', '): value})`
    if (op === 'not_in' ) return `not one of (${Array.isArray(value)? value.join(', '): value})`
    return `${op} ${value}`
  }

  const renderNode = (node) => {
    if (!node) return []
    if (node.all && Array.isArray(node.all)) {
      // AND list
      return node.all.flatMap(child => renderNode(child))
    }
    if (node.any && Array.isArray(node.any)) {
      // OR list, prefix each child
      return node.any.flatMap(child => {
        return renderNode(child).map(t => `(Any) ${t}`)
      })
    }
    // predicate expected: { field, operator, value, reason }
    const field = node.field || node.f || ''
    const op = node.operator || node.op || node?.op || ''
    const value = node.value
    const reason = node.reason || ''
    const label = fieldLabel(field)
    const human = `${label}: ${opText(op, value)}`
    return reason ? [`${human} — ${reason}`] : [human]
  }

  const renderEligibility = (rules) => {
    const items = renderNode(rules)
    if (!items || items.length === 0) return <div className="empty">No eligibility rules available for this scheme.</div>
    return (
      <ul>
        {items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
      </ul>
    )
  }

  return (
    <div className="schemes-container">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>{scheme.title}</h1>
        {scheme.department && <div className="scheme-meta">{scheme.department}</div>}
        {scheme.description && <p className="scheme-desc">{scheme.description}</p>}

        <section style={{ marginTop: 16 }}>
          <h3>Eligibility</h3>
          {scheme.eligibilityRules ? (
            renderEligibility(scheme.eligibilityRules)
          ) : (
            <div className="empty">No eligibility rules available for this scheme.</div>
          )}
        </section>

        {scheme.requiredDocuments && scheme.requiredDocuments.length > 0 && (
          <section style={{ marginTop: 16 }}>
            <h3>Required documents</h3>
            <ul>
              {scheme.requiredDocuments.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </section>
        )}

        {scheme.steps && scheme.steps.length > 0 && (
          <section style={{ marginTop: 16 }}>
            <h3>Application steps</h3>
            <ol>
              {scheme.steps.map((s, i) => (
                <li key={i}>
                  <strong>{s.title}</strong>
                  {s.description && <div style={{ color: 'var(--text-muted)' }}>{s.description}</div>}
                  {s.link && <div><a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></div>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {scheme.officialLink && (
          <section style={{ marginTop: 16 }}>
            <h3>Official link</h3>
            <a href={scheme.officialLink} target="_blank" rel="noreferrer">Open official page</a>
          </section>
        )}
      </div>
    </div>
  )
}
