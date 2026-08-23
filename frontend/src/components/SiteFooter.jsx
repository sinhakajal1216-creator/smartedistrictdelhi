import { Link } from 'react-router-dom'

const OFFICIAL_EDISTRICT_URL = 'https://edistrict.delhigovt.nic.in/'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section>
          <h4>SmartEDistrict Delhi</h4>
          <p>
            SmartEDistrict Delhi helps citizens discover government services, understand eligibility, and locate the correct SDM office with clarity.
          </p>
        </section>

        <section>
          <h4>About</h4>
          <ul>
            <li><Link to="/why-smartedistrict">Why SmartEDistrict</Link></li>
            <li><Link to="/schemes">Services</Link></li>
            <li><Link to="/sdm-locator">SDM Finder</Link></li>
          </ul>
        </section>

        <section>
          <h4>Accessibility</h4>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/eligibility">Eligibility</Link></li>
          </ul>
        </section>

        <section>
          <h4>Privacy & terms</h4>
          <ul>
            <li><Link to="/why-smartedistrict">Privacy</Link></li>
            <li><Link to="/why-smartedistrict">Terms</Link></li>
            <li><a href={OFFICIAL_EDISTRICT_URL} target="_blank" rel="noreferrer">Official portal</a></li>
          </ul>
        </section>
      </div>

      <div className="site-footer-bottom">
        SmartEDistrict Delhi is an assistance layer and does not replace official government decisions.
      </div>
    </footer>
  )
}
