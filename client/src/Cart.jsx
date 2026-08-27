import { useCart } from './CartContext'
import './Cart.css'

export default function Cart({ isOpen, onClose }) {
  const { items, removeFromCart, updateQty, totalCount, totalPrice } = useCart()

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`cart-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={onClose}
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
            Your Bag
            {totalCount > 0 && (
              <span className="cart__count">{String(totalCount).padStart(2, '0')}</span>
            )}
          </h2>
          <button
            className="cart__close"
            type="button"
            aria-label="Close cart"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="cart__empty">
            <p>Your bag is empty.</p>
            <p>Browse the collection and add something you love.</p>
          </div>
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
              <button className="btn cart__checkout" type="button">
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

