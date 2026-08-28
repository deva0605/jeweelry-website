import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import { PRODUCTS, FILTERS } from './data'
import { useCart } from './CartContext'
import { useAuth } from './AuthContext'
import Cart from './Cart'
import Auth from './Auth'
import ProductDetail from './ProductDetail'

/* Hero & editorial images */
import heroImg      from '../assests/WhatsApp Image 2026-08-24 at 11.38.09 PM.jpeg'
import editorialImg from '../assests/WhatsApp Image 2026-08-24 at 11.39.23 PM (1).jpeg'

/* ── Shared Nav ── */
function Nav({ dark, setDark, onCartOpen }) {
  const { totalCount } = useCart()
  const { user }       = useAuth()

  return (
    <nav className="nav">
      <ul className="nav__links">
        <li><Link to="/#collection" className="nav__link">Collection</Link></li>
        <li><Link to="/#journal"    className="nav__link">Journal</Link></li>
      </ul>

      <Link to="/" className="wordmark">Form / Object</Link>

      <ul className="nav__links">
        {user && (
          <li>
            <span className="nav__user">Hi, {user.name}</span>
          </li>
        )}
        <li>
          <button
            className="nav__theme"
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setDark((d) => !d)}
          >
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
        </li>
        <li>
          <button
            className="nav__cart-btn"
            type="button"
            aria-label={`Open cart${totalCount > 0 ? `, ${totalCount} items` : ''}`}
            onClick={onCartOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalCount > 0 && (
              <span className="nav__cart-badge">{totalCount}</span>
            )}
          </button>
        </li>
      </ul>
    </nav>
  )
}

/* ── Home / catalogue page ── */
function Home() {
  const [category, setCategory] = useState('ALL')
  const { addToCart }           = useCart()

  const visible = category === 'ALL'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === category)

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    e.preventDefault()
    addToCart(product)
  }

  return (
    <div className="site">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero__form-col">
          <Auth />
        </div>

        <div className="hero__img-col">
          <img
            src={heroImg}
            alt="Gold pendant necklace collection"
            fetchpriority="high"
          />
          <span className="hero__caption">C 001 / SS 2024</span>
        </div>
      </section>

      {/* ── COLLECTION ── */}
      <section id="collection">
        <div className="section-header">
          <h2 className="section-header__label">Selected Objects</h2>
          <span className="section-header__count">
            {String(visible.length).padStart(2, '0')} / {String(PRODUCTS.length).padStart(2, '0')}
          </span>
        </div>

        {/* Filter bar */}
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`filter${category === f ? ' is-active' : ''}`}
              type="button"
              onClick={() => setCategory(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="product-grid">
          {visible.map((p) => (
            <Link
              to={`/product/${p.id}`}
              className="card"
              key={p.id}
              aria-label={`View ${p.name}`}
            >
              <div className="card__img-wrap">
                <img className="card__img-blur" src={p.img} alt="" aria-hidden="true" loading="lazy" />
                <img className="card__img-main" src={p.img} alt={p.name} loading="lazy" />

                {/* Hover overlay — name + price */}
                <div className="card__overlay" aria-hidden="true">
                  <span className="card__overlay-name">{p.name}</span>
                  <span className="card__overlay-price">{p.price}</span>
                </div>

                {/* Add to cart button */}
                <button
                  className="card__add"
                  type="button"
                  aria-label={`Add ${p.name} to cart`}
                  onClick={(e) => handleAddToCart(e, p)}
                >
                  +
                </button>
              </div>
              <div className="card__body">
                <div className="card__meta">
                  <span>{p.code}</span>
                  <span>{p.category}</span>
                </div>
                <span className="card__tag">18K Gold Plated</span>
                <p className="card__name">{p.name}</p>
                <p className="card__price">{p.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── EDITORIAL / JOURNAL ── */}
      <section id="journal">
        <div className="section-sep" />
        <div className="editorial">
          <div className="editorial__img">
            <img src={editorialImg} alt="Pendant necklace lookbook" loading="lazy" />
          </div>
          <div className="editorial__text">
            <p className="editorial__eyebrow">Field Note / 004</p>
            <h2 className="editorial__heading">
              Objects with<br />a point of view.
            </h2>
            <a className="editorial__link" href="#collection">
              Read the journal <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <span>Form / Object © 2024</span>
        <span>Sterling · Gold · Intention</span>
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          Back to top ↑
        </a>
      </footer>
    </div>
  )
}

/* ── Root App ── */
export default function App() {
  const [dark,      setDark]      = useState(false)
  const [cartOpen,  setCartOpen]  = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <>
      <Nav dark={dark} setDark={setDark} onCartOpen={() => setCartOpen(true)} />

      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail onCartOpen={() => setCartOpen(true)} />} />
      </Routes>

      {/* Cart drawer — rendered globally above all routes */}
      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
