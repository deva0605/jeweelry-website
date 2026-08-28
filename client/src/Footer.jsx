import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (event) => {
    event.preventDefault()
    setEmail('')
    setSubscribed(true)
    window.setTimeout(() => setSubscribed(false), 3000)
  }

  return (
    <footer className="luxury-footer">
      <div className="luxury-footer__newsletter">
        <p className="luxury-footer__eyebrow">The private edit</p>
        <h2>Ushhh.atelier — considered adornment for a life well lived.</h2>
        <form onSubmit={handleSubscribe}>
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input id="newsletter-email" type="email" placeholder="Your email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <button className="btn-luxury" type="submit">Subscribe</button>
        </form>
        {subscribed && <p className="luxury-footer__success" role="status">Subscription successful.</p>}
      </div>
      <div className="luxury-footer__links">
        <div>
          <p className="luxury-footer__eyebrow">Explore</p>
          <Link to="/collections">Shop collection</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/collections">Bestsellers</Link>
        </div>
        <div>
          <p className="luxury-footer__eyebrow">Care & service</p>
          <Link to="/">Care guide</Link>
          <Link to="/">Terms of service</Link>
          <Link to="/">Concierge support</Link>
        </div>
      </div>
      <div className="luxury-footer__bottom">
        <span>© 2026 Ushhh.atelier. All rights reserved.</span>
        <span>BIS 925 · Certified Purity · Insured Delivery</span>
      </div>
    </footer>
  )
}
