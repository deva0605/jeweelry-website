import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCTS } from './data'
import { useCart } from './CartContext'
import Footer from './Footer'
import './Collections.css'

const COLLECTION_FILTERS = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets']

export default function Collections() {
  const [category, setCategory] = useState('All')
  const { addToCart } = useCart()
  const visible = category === 'All'
    ? PRODUCTS
    : PRODUCTS.filter((product) => {
      if (category === 'Necklaces') return ['CHAINS', 'PENDANTS'].includes(product.category)
      return product.category === category.toUpperCase()
    })

  return (
    <main className="collections">
      <header className="collections__hero">
        <p className="collections__eyebrow">The collection / 2026</p>
        <h1>Sculpted<br />Silhouettes</h1>
        <p>Carefully curated pieces in gold and silver.</p>
      </header>
      <div className="collections__toolbar">
        <span>{String(visible.length).padStart(2, '0')} pieces</span>
        <div className="collections__filters">
          {COLLECTION_FILTERS.map((filter) => (
            <button className={category === filter ? 'active' : ''} type="button" key={filter} onClick={() => setCategory(filter)}>
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="product-grid collections__grid">
        {visible.map((product) => (
          <Link className="card" to={`/product/${product.id}`} key={product.id}>
            <div className="card__img-wrap">
              <img className="card__img-blur" src={product.img} alt="" aria-hidden="true" />
              <img className="card__img-main" src={product.img} alt={product.name} loading="lazy" />
              <button className="card__add" type="button" aria-label={`Add ${product.name} to cart`} onClick={(event) => { event.preventDefault(); addToCart(product) }}>+</button>
            </div>
            <div className="card__body">
              <p className="card__name">{product.name}</p>
              <p className="card__price">{product.price}</p>
            </div>
          </Link>
        ))}
      </div>
      <Footer />
    </main>
  )
}
