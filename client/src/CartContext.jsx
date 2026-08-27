import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addToCart = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeFromCart = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id))

  const updateQty = (id, delta) =>
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    )

  const totalCount = items.reduce((s, i) => s + i.qty, 0)

  const totalPrice = items.reduce((s, i) => {
    const num = Number(i.price.replace(/[₹,]/g, ''))
    return s + num * i.qty
  }, 0)

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQty, totalCount, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}

