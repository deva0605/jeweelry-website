/**
 * controllers/checkoutController.js
 *
 * Handles secure checkout flow:
 * - Validates cart items against products table (server-side pricing)
 * - Generates unique order IDs with nanoid
 * - Stores orders in database with PENDING status
 * - Returns order details for WhatsApp redirect
 */

'use strict'

const { validationResult } = require('express-validator')
const { nanoid } = require('nanoid')
const db = require('../db')

/**
 * POST /api/checkout
 * 
 * Request body:
 * {
 *   customerName: string,
 *   phone: string (10-digit Indian mobile),
 *   address: string,
 *   cartItems: [{ id: string, qty: number }]
 * }
 * 
 * Response:
 * {
 *   orderId: string (e.g., "ORD-8F7A2B9C"),
 *   grandTotal: number (in paise)
 * }
 */
exports.submit = (req, res) => {
  // Validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg
    return res.status(400).json({ error: firstError })
  }

  const { customerName, phone, address, cartItems } = req.body

  // Validate cart is not empty
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty.' })
  }

  // Validate cart item structure
  for (const item of cartItems) {
    if (!item.id || typeof item.id !== 'string') {
      return res.status(400).json({ error: 'Invalid cart item format.' })
    }
    if (!item.qty || typeof item.qty !== 'number' || item.qty < 1 || item.qty > 100) {
      return res.status(400).json({ error: 'Invalid quantity. Must be between 1 and 100.' })
    }
  }

  try {
    // Fetch all product prices from database (server-side pricing)
    const productIds = cartItems.map(item => item.id)
    const placeholders = productIds.map(() => '?').join(',')
    
    const products = db.prepare(
      `SELECT id, price_inr FROM products WHERE id IN (${placeholders})`
    ).all(...productIds)

    // Check if all products exist
    if (products.length !== cartItems.length) {
      return res.status(400).json({ error: 'One or more products not found.' })
    }

    // Create price lookup map
    const priceMap = {}
    products.forEach(p => {
      priceMap[p.id] = p.price_inr
    })

    // Calculate grand total (server-side only)
    let grandTotal = 0
    for (const item of cartItems) {
      const price = priceMap[item.id]
      if (!price) {
        return res.status(400).json({ error: `Product ${item.id} not found.` })
      }
      grandTotal += price * item.qty
    }

    // Generate unique 8-character order ID
    const orderId = `ORD-${nanoid(8).toUpperCase()}`

    // Insert order into database
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, customer_name, phone, address, cart_items, grand_total, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `)

    insertOrder.run(
      orderId,
      customerName,
      phone,
      address,
      JSON.stringify(cartItems),
      grandTotal
    )

    console.log(`[checkout] Order created: ${orderId} | Total: ₹${(grandTotal / 100).toFixed(2)}`)

    res.json({
      orderId,
      grandTotal,
    })

  } catch (err) {
    console.error('[checkout] Error processing order:', err)
    res.status(500).json({ error: 'Failed to process checkout. Please try again.' })
  }
}
