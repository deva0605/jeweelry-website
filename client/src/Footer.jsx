import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="luxury-footer">
      <div className="luxury-footer__newsletter">
        <p className="luxury-footer__eyebrow">The private edit</p>
        <h2>Join our world of considered adornment.</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input id="newsletter-email" type="email" placeholder="Your email address" required />
          <button className="btn-luxury" type="submit">Subscribe</button>
        </form>
      </div>
      <div className="luxury-footer__links">
        <div>
          <p className="luxury-footer__eyebrow">Explore</p>
          <Link to="/collections">Shop collection</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/#collection">Bestsellers</Link>
        </div>
        <div>
          <p className="luxury-footer__eyebrow">Care & service</p>
          <a href="#care">Care guide</a>
          <a href="#terms">Terms of service</a>
          <a href="mailto:concierge@formobject.com">Concierge support</a>
        </div>
      </div>
      <div className="luxury-footer__bottom">
        <span>© 2026 Form / Object</span>
        <span>BIS 925 · Certified Purity · Insured Delivery</span>
      </div>
    </footer>
  )
}
