import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/stitch.css'

export default function SiteFooter() {
  const [activePolicy, setActivePolicy] = useState(null)

  const policies = {
    'Website Policy': 'This portal is designed, developed, and hosted for the Government of NCT of Delhi to facilitate citizen access to public services and administrative jurisdictions.',
    'Hyperlink Policy': 'At many places in this portal, links to other external websites/portals have been placed for citizen convenience. SevaSphere is not responsible for the contents and reliability of linked websites.',
    'Privacy Statement': 'This portal does not automatically capture any specific personal information from you without your consent. Any information provided is protected in accordance with government data protection standards.',
    'Terms of Service': 'This platform is an assistance facilitation layer for Delhi e-District citizen workflows and does not replace statutory determinations made by designated government authorities.'
  }

  return (
    <footer className="stitch-footer" aria-label="Official Delhi Government Portal Footer">
      <div className="stitch-footer-inner">
        <div className="stitch-footer-grid">
          {/* Branding & Authority Column */}
          <div className="stitch-footer-brand-col">
            <div className="stitch-footer-brand-header">
              <div className="stitch-footer-emblem-wrap">
                <img
                  alt="SevaSphere Delhi Emblem"
                  className="stitch-footer-emblem-img"
                  src="/sevasphere_emblem.png"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = '/sadi.png'
                  }}
                />
              </div>
              <span className="stitch-footer-brand-title">SevaSphere</span>
            </div>
            <p className="stitch-footer-desc">
              Official citizen services facilitation platform designed to assist residents of the National Capital Territory of Delhi with unified departmental information, requirements, and jurisdiction guidance.
            </p>
            <p className="stitch-footer-subtext">
              Government of NCT of Delhi • Dedicated to transparent public service delivery.
            </p>
          </div>

          {/* Portal Directory Navigation */}
          <div>
            <h4 className="stitch-footer-heading">Portal Directory</h4>
            <ul className="stitch-footer-list">
              <li>
                <Link className="stitch-footer-link" to="/schemes">
                  Citizen Services
                </Link>
              </li>
              <li>
                <Link className="stitch-footer-link" to="/eligibility">
                  Eligibility Checker
                </Link>
              </li>
              <li>
                <Link className="stitch-footer-link" to="/sdm-locator">
                  SDM Office Finder
                </Link>
              </li>
              <li>
                <Link className="stitch-footer-link" to="/schemes">
                  Document Requirements
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Information */}
          <div>
            <h4 className="stitch-footer-heading">Official Information</h4>
            <ul className="stitch-footer-list">
              <li>
                <a
                  className="stitch-footer-link"
                  href="https://delhi.gov.in"
                  target="_blank"
                  rel="noreferrer"
                >
                  State Portal of Delhi
                </a>
              </li>
              <li>
                <a
                  className="stitch-footer-link"
                  href="https://revenue.delhi.gov.in"
                  target="_blank"
                  rel="noreferrer"
                >
                  Revenue Department
                </a>
              </li>
              <li>
                <a
                  className="stitch-footer-link"
                  href="https://pgms.delhi.gov.in"
                  target="_blank"
                  rel="noreferrer"
                >
                  Grievance Redressal
                </a>
              </li>
              <li>
                <Link className="stitch-footer-link" to="/why-smartedistrict">
                  Accessibility Statement
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Statutory Bottom Bar */}
        <div className="stitch-footer-bottom">
          <p className="stitch-footer-bottom-copy">
            © 2025 Government of NCT of Delhi. All rights reserved.
          </p>
          <div className="stitch-footer-bottom-links">
            {['Website Policy', 'Hyperlink Policy', 'Privacy Statement', 'Terms of Service'].map((item) => (
              <button
                key={item}
                type="button"
                className="stitch-topstrip-btn stitch-policy-link"
                onClick={() => setActivePolicy(activePolicy === item ? null : item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Policy Information Panel if opened */}
        {activePolicy && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid rgba(194, 198, 210, 0.5)',
            fontSize: '0.825rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div>
              <strong style={{ color: '#002f5e', display: 'block', marginBottom: '0.25rem' }}>{activePolicy}</strong>
              <span style={{ color: '#424750' }}>{policies[activePolicy]}</span>
            </div>
            <button
              type="button"
              className="stitch-topstrip-btn"
              onClick={() => setActivePolicy(null)}
              style={{ marginLeft: '1rem', fontWeight: 700, color: '#002f5e' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}

