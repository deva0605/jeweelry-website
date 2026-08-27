import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { PRODUCTS } from './data'
import { useCart } from './CartContext'
import './ProductDetail.css'

export default function ProductDetail({ onCartOpen }) {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { addToCart } = useCart()
  const [flash, setFlash] = useState(false)

  const product = PRODUCTS.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="pd-not-found">
        <p>Product not found.</p>
        <button className="btn" onClick={() => navigate('/')}>← Back to collection</button>
      </div>
    )
  }

  const handleAdd = () => {
    addToCart(product)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
    // Open the cart drawer after a short delay so user sees the feedback first
    setTimeout(() => onCartOpen?.(), 400)
  }

  return (
    <div className="pd">
      {/* ── Back link ── */}
      <button className="pd__back" onClick={() => navigate(-1)} type="button">
        ← Back
      </button>

      <div className="pd__layout">
        {/* ── Image panel ── */}
        <div className="pd__img-panel">
          <div className="pd__img-wrap">
            <img className="pd__img-blur" src={product.img} alt="" aria-hidden="true" />
            <img className="pd__img-main" src={product.img} alt={product.name} />
          </div>
        </div>

        {/* ── Info panel ── */}
        <div className="pd__info">
          <p className="pd__eyebrow">{product.code} · {product.category}</p>
          <h1 className="pd__name">{product.name}</h1>
          <p className="pd__price">{product.price}</p>

          <p className="pd__desc">{product.description}</p>

          <div className="pd__actions">
            <button
              className={`btn pd__buy${flash ? ' pd__buy--added' : ''}`}
              type="button"
              onClick={handleAdd}
            >
              {flash ? '✓ Added to Bag' : 'Add to Bag'}
            </button>
          </div>

          <ul className="pd__meta-list">
            <li><span>Material</span><span>18k Gold Plated</span></li>
            <li><span>Finish</span><span>Polished</span></li>
            <li><span>Ships in</span><span>3–5 business days</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
