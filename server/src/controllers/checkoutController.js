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
const pool = require('../db')

/**
 * POST /api/checkout
 * 
 * Request body:
 * {
 *   customerName: string,
 *   phone: string (10-digit Indian mobile),
 *   address: string,
 *   cartItems: [{ productId: string, quantity: number }] or [{ id: string, qty: number }]
 * }
 * 
 * Response:
 * {
 *   orderId: string (e.g., "ORD-8F7A2B9C"),
 *   grandTotal: number (in paise)
 * }
 */
exports.submit = async (req, res) => {
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

  // Normalize cart items (support both {id, qty} and {productId, quantity})
  const normalizedCartItems = cartItems.map(item => ({
    productId: item.productId || item.id,
    quantity: item.quantity || item.qty,
  }))

  // Validate cart item structure
  for (const item of normalizedCartItems) {
    if (!item.productId || typeof item.productId !== 'string') {
      return res.status(400).json({ error: 'Invalid cart item format.' })
    }
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 100) {
      return res.status(400).json({ error: 'Invalid quantity. Must be between 1 and 100.' })
    }
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Fetch all product prices from database (server-side pricing)
    const productIds = normalizedCartItems.map(item => item.productId)
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',')
    
    const productResult = await client.query(
      `SELECT id, price_inr FROM products WHERE id IN (${placeholders})`,
      productIds
    )

    // Check if all products exist
    if (productResult.rows.length !== normalizedCartItems.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'One or more products not found.' })
    }

    // Create price lookup map
    const priceMap = {}
    productResult.rows.forEach(p => {
      priceMap[p.id] = parseInt(p.price_inr)
    })

    // Calculate grand total (server-side only)
    let grandTotal = 0
    for (const item of normalizedCartItems) {
      const price = priceMap[item.productId]
      if (!price) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Product ${item.productId} not found.` })
      }
      grandTotal += price * item.quantity
    }

    // Generate unique 8-character order ID
    const orderId = `ORD-${nanoid(8).toUpperCase()}`

    // Insert order into database
    await client.query(
      `INSERT INTO orders (id, customer_name, phone, address, cart_items, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [orderId, customerName, phone, address, JSON.stringify(normalizedCartItems), grandTotal]
    )

    await client.query('COMMIT')

    console.log(`[checkout] Order created: ${orderId} | Total: ₹${(grandTotal / 100).toFixed(2)}`)

    res.json({
      orderId,
      grandTotal,
    })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[checkout] Error processing order:', err)
    res.status(500).json({ error: 'Failed to process checkout. Please try again.' })
  } finally {
    client.release()
  }
}
