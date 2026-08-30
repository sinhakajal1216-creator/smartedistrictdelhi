import { useState, useEffect } from 'react'
import * as auth from '../services/auth'
import api from '../services/api'
import SchemeCard from '../components/SchemeCard'
import '../styles/schemes.css'

// Convert technical evaluator reasons into user-friendly messages
function formatReason(reason) {
  if (!reason) return ''
  const fieldLabel = (f) => {
    const map = {
      age: 'Age',
      income: 'annual income',
      category: 'Category',
      gender: 'Gender',
      occupation: 'Occupation',
      maritalStatus: 'Marital status',
      delhiResident: 'Delhi residency',
      residenceYears: 'Years of Delhi residency',
      aadhaar: 'Aadhaar',
      receivesOtherPension: 'Receiving other pension',
      disability: 'Disability',
      disabilityPercentage: 'Disability percentage'
    }
    return map[f] || f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
  }

  // Missing field
  let m = reason.match(/Missing profile field '([^']+)'/i)
  if (m) return `Additional information required: ${fieldLabel(m[1])}.`

  // in / not_in
  m = reason.match(/^Field\s+(\w+)\s+\(([^)]+)\)\s+(in|not_in)\s+\[([^\]]*)\]\s+=>\s+(pass|fail)$/i)
  if (m) {
    const [, field, profileVal, op, listStr, pf] = m
    const allowed = listStr.split(',').map(s => s.trim()).filter(Boolean)
    if (pf.toLowerCase() === 'pass') return `Your ${fieldLabel(field)} (${profileVal}) is within the allowed values.`
    return `Your ${fieldLabel(field)} (${profileVal}) is not within the allowed values (${allowed.join(', ')}).`
  }

  // numeric / comparison / equality
  m = reason.match(/^Field\s+(\w+)\s+\(([^)]+)\)\s+(>=|<=|>|<|==|!=)\s+([^\s]+)\s+=>\s+(pass|fail)$/i)
  if (m) {
    const [, field, profileVal, op, valRaw, pf] = m
    const value = valRaw.replace(/^['"]|['"]$/g, '')
    const label = fieldLabel(field)
    const pv = profileVal
    // Specific human messages
    if (field === 'age' && op === '>=' && pf.toLowerCase() === 'fail') return `You must be ${value} years or older.`
    if (field === 'age' && op === '>=' && pf.toLowerCase() === 'pass') return `You meet the age requirement.`
    if (field === 'residenceYears' && op === '>=' && pf.toLowerCase() === 'fail') return `You need at least ${value} years of residence in Delhi.`
    if (field === 'residenceYears' && op === '>=' && pf.toLowerCase() === 'pass') return `You meet the residence duration requirement.`
    if (field === 'income' && (op === '<' || op === '<=')) {
      if (pf.toLowerCase() === 'pass') return `Your annual income is within the required limit.`
      return `Your annual income exceeds the allowed limit of ₹${value}.`
    }
    if ((field === 'delhiResident' || field === 'aadhaar') && (op === '==' || op === '!=')) {
      const wants = value === '1' || value === 'true' || value === 'True' || value === true
      if (pf.toLowerCase() === 'pass') {
        if (field === 'delhiResident') return `You meet the Delhi residency requirement.`
        if (field === 'aadhaar') return `You have the required Aadhaar document.`
      } else {
        if (field === 'delhiResident') return `You must be a resident of Delhi.`
        if (field === 'aadhaar') return `This scheme requires an Aadhaar document.`
      }
    }
    if (field === 'disability' && (op === '==' || op === '!=')) {
      if (pf.toLowerCase() === 'pass') return `Applicant has a qualifying disability.`
      return `This scheme requires the applicant to have a disability.`
    }
    if (field === 'category' && (op === '==' || op === '!=')) {
      const pretty = String(value).toUpperCase()
      if (pf.toLowerCase() === 'pass') return `You belong to the required category: ${pretty}.`
      return `This scheme is available only to applicants in the ${pretty} category.`
    }

    // generic messages
    if (pf.toLowerCase() === 'pass') return `Requirement satisfied: ${label} (${pv}) ${op} ${value}.`
    return `Requirement not satisfied: ${label} (${pv}) ${op} ${value}.`
  }

  // fallback for other messages (e.g., unsupported operator, invalid predicate)
  if (/=>\s*pass$/i.test(reason)) return 'Requirement satisfied.'
  if (/=>\s*fail$/i.test(reason)) return 'Requirement not satisfied.'

  return reason
}

export default function Eligibility() {
  const [form, setForm] = useState({
    age: '',
    residency: false,
    residenceYears: '',
    income: '',
    gender: '',
    category: '',
    occupation: '',
    disability: false,
    disabilityPercentage: '',
    aadhaar: false,
    receivesOtherPension: false,
    maritalStatus: '',
    loadingProfile: true,
    error: null,
    evalLoading: false,
    results: null
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await auth.me()
        if (!mounted) return
        if (res && res.user) {
          const prof = res.user.citizenProfile || {}
          setForm(prev => ({
            ...prev,
            age: prof.age ?? '',
            residency: !!prof.residency,
            residenceYears: prof.residenceYears ?? '',
            income: prof.income ?? '',
            gender: prof.gender ?? '',
            category: prof.category ?? '',
            occupation: prof.occupation ?? '',
            disability: !!prof.disability,
            disabilityPercentage: prof.disabilityPercentage ?? '',
            aadhaar: !!prof.aadhaar,
            receivesOtherPension: !!prof.receivesOtherPension,
            maritalStatus: prof.maritalStatus ?? ''
          }))
        }
      } catch (e) {
        // not logged in or error; allow anonymous flow
      } finally {
        if (mounted) setForm(prev => ({ ...prev, loadingProfile: false }))
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const buildProfile = (f) => ({
    age: f.age !== '' ? Number(f.age) : null,
    // Backend rules expect `delhiResident`
    delhiResident: !!f.residency,
    residenceYears: f.residenceYears !== '' ? Number(f.residenceYears) : null,
    aadhaar: !!f.aadhaar,
    receivesOtherPension: !!f.receivesOtherPension,
    income: f.income !== '' ? Number(f.income) : null,
    gender: f.gender || null,
    // normalise category to lowercase as many rules use lowercase values
    category: f.category ? String(f.category).toLowerCase() : null,
    occupation: f.occupation || null,
    // some rules expect 'yes'/'no' strings for disability, others numeric percentage
    disability: f.disability ? 'yes' : 'no',
    disabilityPercentage: f.disabilityPercentage !== '' ? Number(f.disabilityPercentage) : null,
    maritalStatus: f.maritalStatus || null
  })

  const handleSubmit = async (e) => {
    e && e.preventDefault()
    setForm(prev => ({ ...prev, evalLoading: true, results: null, error: null }))
    try {
      const profile = buildProfile(form)
      const res = await api.post('/eligibility/evaluate', profile)
      const data = res.data || {}
      try {
        sessionStorage.setItem('sd_eligibility_profile', JSON.stringify(profile))
      } catch {
        // ignore storage errors
      }
      setForm(prev => ({ ...prev, results: data, evalLoading: false }))
    } catch (err) {
      setForm(prev => ({ ...prev, error: err?.response?.data?.error || err.message || 'Failed to evaluate', evalLoading: false }))
    }
  }

  const clear = () => setForm({
    age: '',
    residency: false,
    residenceYears: '',
    income: '',
    gender: '',
    category: '',
    occupation: '',
    disability: false,
    disabilityPercentage: '',
    aadhaar: false,
    receivesOtherPension: false,
    maritalStatus: '',
    loadingProfile: false,
    error: null,
    evalLoading: false,
    results: null
  })

  return (
    <div className="schemes-container">
      <div className="eligibility-panel">
        <h2>Eligibility Questionnaire</h2>
        <p className="muted">Provide basic details to find schemes you may be eligible for. If logged in, your saved profile will pre-fill the form.</p>
        <div className="reason-box muted" role="note" style={{ marginBottom: 16 }}>
          <strong>Important:</strong> Results are based on the currently available starter rules and data in this platform. They are guidance only and are <strong>not</strong> an official government eligibility decision. Verify current criteria on the relevant official portal before applying.
        </div>

        {form.loadingProfile ? (
          <div className="loading">Loading profile…</div>
        ) : (
          <form className="eligibility-form" onSubmit={handleSubmit}>
            <div className="eligibility-grid">
              <fieldset className="card">
                {/* <legend>Personal details</legend> */}
                <legend style={{ color: '#0f172a', fontWeight: 'bold' }}>Personal details</legend>

                <label>
                  <div className="field-label">Age</div>
                  <input value={form.age} onChange={e => handleChange('age', e.target.value)} placeholder="e.g. 45" />
                </label>

                <label>
                  <div className="field-label">Gender</div>
                  <select value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  <div className="field-label">Marital status</div>
                  <select value={form.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)}>
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </label>

                <label>
                  <div className="field-label">Occupation</div>
                  <input value={form.occupation} onChange={e => handleChange('occupation', e.target.value)} placeholder="e.g. Retired, Student" />
                </label>
              </fieldset>

              <fieldset className="card">
                {/* <legend>Location & residency</legend> */}
                <legend style={{ color: '#0f172a', fontWeight: 'bold' }}>Location & residency</legend>
                <label>
                  <div className="field-label">Residence (years in Delhi)</div>
                  <input value={form.residenceYears} onChange={e => handleChange('residenceYears', e.target.value)} placeholder="e.g. 5" />
                </label>

                <label>
                  <div className="field-label">Residency</div>
                  <div className="checkbox-control"><input type="checkbox" checked={form.residency} onChange={e => handleChange('residency', e.target.checked)} /> Residency in Delhi</div>
                </label>

                <label>
                  <div className="field-label">Aadhaar available</div>
                  <div className="checkbox-control"><input type="checkbox" checked={form.aadhaar} onChange={e => handleChange('aadhaar', e.target.checked)} /> I have Aadhaar</div>
                </label>
              </fieldset>

              <fieldset className="card">
                {/* <legend>Identification & benefits</legend> */}
                <legend style={{ color: '#0f172a', fontWeight: 'bold' }}>Identification & benefits</legend>
                <label>
                  <div className="field-label">Disability</div>
                  <div className="checkbox-control"><input type="checkbox" checked={form.disability} onChange={e => handleChange('disability', e.target.checked)} /> Disability</div>
                </label>

                {form.disability && (
                  <label>
                    <div className="field-label">Disability percentage</div>
                    <input value={form.disabilityPercentage} onChange={e => handleChange('disabilityPercentage', e.target.value)} placeholder="e.g. 40" />
                  </label>
                )}

                <label>
                  <div className="field-label">Receives other pension</div>
                  <div className="checkbox-control"><input type="checkbox" checked={form.receivesOtherPension} onChange={e => handleChange('receivesOtherPension', e.target.checked)} /> I receive other pension</div>
                </label>
              </fieldset>

              <fieldset className="card">
                {/* <legend>Financial & category</legend> */}
                <legend style={{ color: '#0f172a', fontWeight: 'bold' }}>Financial & category</legend>

                <label>
                  <div className="field-label">Annual income (INR)</div>
                  <input value={form.income} onChange={e => handleChange('income', e.target.value)} placeholder="e.g. 250000" />
                </label>

                <label>
                  <div className="field-label">Category</div>
                  <select value={form.category} onChange={e => handleChange('category', e.target.value)}>
                    <option value="">Select Category</option>
                    <option value="general">General</option>
                    <option value="sc">SC</option>
                    <option value="st">ST</option>
                    <option value="obc">OBC</option>
                    <option value="ews">EWS</option>
                  </select>
                </label>
              </fieldset>
            </div>

            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={form.evalLoading}>{form.evalLoading ? 'Finding…' : 'Find Eligible Schemes'}</button>
              <button type="button" className="btn-ghost" onClick={clear}>Clear</button>
            </div>

            {form.error && <div className="empty">{String(form.error)}</div>}
          </form>
        )}

        {/* Results */}
        {form.results && (
          <div className="eligibility-results">
            <div className="result-summary">
              <div className="summary-item">Eligible: <strong>{form.results.eligible.length}</strong></div>
              <div className="summary-item">Not eligible: <strong>{form.results.notEligible.length}</strong></div>
              <div className="summary-item">Unknown: <strong>{form.results.unknown.length}</strong></div>
            </div>

            <div className="results-grid">
              <div className="results-column">
                <h3>Eligible</h3>
                {form.results.eligible.length === 0 ? <div className="empty">No eligible schemes found</div> : (
                  <div className="schemes-list">
                    {form.results.eligible.map(r => (
                      <div key={r.scheme._id} className="result-card card">
                        <div className="result-card-body">
                          <SchemeCard scheme={r.scheme} />
                          <div className="reason-box success">
                            <strong>Why matched:</strong>
                            <ul>
                              {r.reasons.map((t, i) => <li key={i}>{formatReason(t)}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="results-column">
                <h3>Not eligible</h3>
                {form.results.notEligible.length === 0 ? <div className="empty">No negative determinations</div> : (
                  <div className="schemes-list">
                    {form.results.notEligible.map(r => (
                      <div key={r.scheme._id} className="result-card card">
                        <div className="result-card-body">
                          <SchemeCard scheme={r.scheme} />
                          <div className="reason-box warning">
                            <strong>Why not eligible:</strong>
                            <ul>
                              {r.reasons.map((t, i) => <li key={i}>{formatReason(t)}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ marginTop: 18 }}>Unknown</h3>
                {form.results.unknown.length === 0 ? <div className="empty">All schemes evaluated</div> : (
                  <div className="schemes-list">
                    {form.results.unknown.map(r => (
                      <div key={r.scheme._id} className="result-card card">
                        <div className="result-card-body">
                          <SchemeCard scheme={r.scheme} />
                          <div className="reason-box muted">
                            <strong>Status:</strong>
                            <div>{formatReason(r.reason || '')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
