import { useState, useEffect } from 'react'
import * as auth from '../services/auth'
import '../styles/schemes.css'

export default function Eligibility() {
  const [form, setForm] = useState({
    age: '',
    residency: false,
    income: '',
    gender: '',
    category: '',
    occupation: '',
    disability: false,
    maritalStatus: '',
    loadingProfile: true,
    error: null
  })

  // useEffect must come after form state declaration
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
            income: prof.income ?? '',
            gender: prof.gender ?? '',
            category: prof.category ?? '',
            occupation: prof.occupation ?? '',
            disability: !!prof.disability,
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

  // Single useState for form; handlers operate on it
  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const handleSubmit = (e) => { e && e.preventDefault(); /* local only for now */ }
  const clear = () => setForm({ age: '', residency: false, income: '', gender: '', category: '', occupation: '', disability: false, maritalStatus: '', loadingProfile: false, error: null })

  return (
    <div className="schemes-container">
      <h2>Eligibility Questionnaire</h2>
      <p>Provide your basic details to find schemes you may be eligible for. If logged in, your saved profile will pre-fill the form (local edits only).</p>

      {form.loadingProfile ? (
        <div className="loading">Loading profile…</div>
      ) : (
        <form style={{ display: 'grid', gap: 8, maxWidth: 720 }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              Age
              <input value={form.age} onChange={e => handleChange('age', e.target.value)} placeholder="e.g. 45" />
            </label>

            <label style={{ flex: 1 }}>
              Annual income (INR)
              <input value={form.income} onChange={e => handleChange('income', e.target.value)} placeholder="e.g. 250000" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              Gender
              <select value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label style={{ flex: 1 }}>
              Category
              <select value={form.category} onChange={e => handleChange('category', e.target.value)}>
                <option value="">—</option>
                <option value="General">General</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC">OBC</option>
                <option value="EWS">EWS</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              Occupation
              <input value={form.occupation} onChange={e => handleChange('occupation', e.target.value)} placeholder="e.g. Farmer, Student, Unemployed" />
            </label>

            <label style={{ flex: 1 }}>
              Marital status
              <select value={form.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)}>
                <option value="">—</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.residency} onChange={e => handleChange('residency', e.target.checked)} /> Residency in Delhi
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.disability} onChange={e => handleChange('disability', e.target.checked)} /> Disability
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit">Apply (local)</button>
            <button type="button" className="btn-ghost" onClick={clear}>Clear</button>
          </div>

          {form.error && <div className="empty">{String(form.error)}</div>}
        </form>
      )}
    </div>
  )
}
