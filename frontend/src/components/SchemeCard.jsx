import { Link } from 'react-router-dom'

export default function SchemeCard({ scheme }) {
  if (!scheme) return null
  const { _id, id, code, title, description, department, categories, officialLink } = scheme
  const schemeId = id || code || _id

  const openAssistant = () => {
    window.dispatchEvent(new Event('open-assistant'))
  }

  const hasDepartment = department && String(department).trim().length > 0
  const hasCategories = Array.isArray(categories) && categories.filter(Boolean).length > 0
  const hasDescription = description && String(description).trim().length > 0

  return (
    <article className="scheme-card card">
      <div className="scheme-card-body">
        <div className="scheme-title-row">
          <h3 className="scheme-title">{title}</h3>
        </div>

        {hasDepartment && <div className="scheme-meta">{department}</div>}

        {hasCategories && (
          <div className="scheme-categories">
            {categories.filter(Boolean).map((c) => (
              <span className="badge" key={c}>{c}</span>
            ))}
          </div>
        )}

        {hasDescription && <p className="scheme-desc">{description}</p>}

        <div className="scheme-actions">
          <Link to={`/schemes/${schemeId}`} className="btn-primary">View Details</Link>
          {officialLink ? (
            <a href={officialLink} target="_blank" rel="noreferrer" className="btn-ghost">Apply Online</a>
          ) : null}
          <button type="button" className="btn-ghost" onClick={openAssistant}>e-District Assistant</button>
        </div>
      </div>
    </article>
  )
}
