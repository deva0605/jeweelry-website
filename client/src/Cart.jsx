import { useState } from 'react'
import { useCart } from './CartContext'
import { checkoutApi } from './api'
import './Cart.css'

const WHATSAPP_NUMBER = '918010369855'

export default function Cart({ isOpen, onClose }) {
  const { items, removeFromCart, updateQty, totalCount, totalPrice, clearCart } = useCart()

  const [showForm, setShowForm]           = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (checkoutError) setCheckoutError('')
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (isCheckingOut) return

    setIsCheckingOut(true)
    setCheckoutError('')

    try {
      const cartItems = items.map(item => ({ id: item.id, qty: item.qty }))
      const { orderId } = await checkoutApi.submit(
        formData.customerName,
        formData.phone,
        formData.address,
        cartItems
      )

      clearCart()

      const message = encodeURIComponent(`Hi, I am ready to pay for order #${orderId}`)
      window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed. Please try again.')
      setIsCheckingOut(false)
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setCheckoutError('')
    setFormData({ customerName: '', phone: '', address: '' })
    onClose()
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`cart-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside
        className={`cart${isOpen ? ' is-open' : ''}`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="cart__header">
          <h2 className="cart__title">
            {showForm ? 'Checkout' : 'Your Bag'}
            {!showForm && totalCount > 0 && (
              <span className="cart__count">{String(totalCount).padStart(2, '0')}</span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {showForm && (
              <button
                className="cart__close"
                type="button"
                aria-label="Back to cart"
                onClick={() => { setShowForm(false); setCheckoutError('') }}
                style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
              >
                ← Back
              </button>
            )}
            <button
              className="cart__close"
              type="button"
              aria-label="Close cart"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 && !showForm ? (
          <div className="cart__empty">
            <p>Your bag is empty.</p>
            <p>Browse the collection and add something you love.</p>
          </div>
        ) : showForm ? (
          /* ── Checkout Form ── */
          <form className="cart__checkout-form" onSubmit={handleCheckout} noValidate>
            <div className="cart__form-group">
              <label htmlFor="checkout-name" className="cart__form-label">Full Name</label>
              <input
                id="checkout-name"
                className="cart__form-input"
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Your full name"
                required
                maxLength={100}
                disabled={isCheckingOut}
                autoComplete="name"
              />
            </div>

            <div className="cart__form-group">
              <label htmlFor="checkout-phone" className="cart__form-label">Mobile Number</label>
              <div className="cart__phone-wrapper">
                <span className="cart__phone-prefix">+91</span>
                <input
                  id="checkout-phone"
                  className="cart__form-input cart__form-input--phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  required
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  disabled={isCheckingOut}
                  autoComplete="tel-national"
                />
              </div>
            </div>

            <div className="cart__form-group">
              <label htmlFor="checkout-address" className="cart__form-label">Delivery Address</label>
              <textarea
                id="checkout-address"
                className="cart__form-input cart__form-input--textarea"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Full delivery address"
                required
                maxLength={500}
                rows={3}
                disabled={isCheckingOut}
                autoComplete="street-address"
              />
            </div>

            {checkoutError && (
              <p className="cart__form-error" role="alert">{checkoutError}</p>
            )}

            <div className="cart__footer">
              <div className="cart__total">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <button
                className="btn cart__checkout"
                type="submit"
                disabled={isCheckingOut}
                aria-busy={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <span className="cart__spinner" aria-hidden="true" />
                    Processing…
                  </>
                ) : (
                  <>Pay via WhatsApp 📲</>
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Item list */}
            <ul className="cart__list">
              {items.map((item) => (
                <li key={item.id} className="cart__item">
                  {/* Thumbnail with blurred backdrop */}
                  <div className="cart__thumb">
                    <img
                      className="cart__thumb-blur"
                      src={item.img}
                      alt=""
                      aria-hidden="true"
                    />
                    <img
                      className="cart__thumb-main"
                      src={item.img}
                      alt={item.name}
                    />
                  </div>

                  {/* Info */}
                  <div className="cart__item-info">
                    <p className="cart__item-name">{item.name}</p>
                    <p className="cart__item-cat">{item.category}</p>
                    <p className="cart__item-price">{item.price}</p>

                    {/* Qty controls */}
                    <div className="cart__qty">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQty(item.id, -1)}
                      >
                        −
                      </button>
                      <span>{item.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(item.id, +1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    className="cart__remove"
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeFromCart(item.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer — total + checkout */}
            <div className="cart__footer">
              <div className="cart__total">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <button
                className="btn cart__checkout"
                type="button"
                onClick={() => setShowForm(true)}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

