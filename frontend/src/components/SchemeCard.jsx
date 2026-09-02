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

        {hasDepartment && <div className="scheme-meta-pill">{department}</div>}

        {hasCategories && (
          <div className="scheme-categories">
            {categories.filter(Boolean).map((c) => (
              <span className="badge badge-category" key={c}>{String(c).toUpperCase()}</span>
            ))}
          </div>
        )}

        {hasDescription && <p className="scheme-desc scheme-desc-note">{description}</p>}

        <div className="scheme-actions">
          {officialLink ? (
            <a href={officialLink} target="_blank" rel="noreferrer" className="btn-primary scheme-action-primary">Apply Online</a>
          ) : null}
          <Link to={`/schemes/${schemeId}`} className="btn-ghost scheme-action-outline">View Details</Link>
          {/* <button type="button" className="btn-ghost scheme-action-assistant" onClick={openAssistant}>e-District Assistant</button> */}
        </div>
      </div>
    </article>
  )
}
