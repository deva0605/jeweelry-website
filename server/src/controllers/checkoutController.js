/**
 * controllers/checkoutController.js
 *
 * Secure server-side checkout flow with canonical contract.
 *
 * ONE CANONICAL PAYLOAD:
 * {
 *   customerName: string,
 *   phone: 10-digit Indian mobile,
 *   address: string,
 *   cartItems: [{ productId: string, quantity: number }]
 * }
 *
 * Responsibilities:
 * 1. Validates request against canonical contract
 * 2. Queries PostgreSQL for authoritative product prices (server-side pricing authority)
 * 3. Calculates order total server-side ONLY — frontend price fields are IGNORED
 * 4. Creates unique cryptographically-secure order ID (avoids sequential enumeration)
 * 5. Inserts order with PENDING status in a database transaction
 * 6. Returns order ID for frontend WhatsApp handoff
 *
 * IMPORTANT: Frontend can NEVER send price, total, or discount values.
 * Those are always calculated from PostgreSQL as the authoritative source.
 *
 * Future WhatsApp automation should resolve this Order ID against the
 * orders table rather than trusting customer-supplied pricing or product data.
 */

'use strict'

const { validationResult } = require('express-validator')
const pool = require('../db')
const crypto = require('crypto')

/**
 * POST /api/checkout
 *
 * Accepts the canonical checkout payload, creates a server-side order,
 * and returns the order ID for the frontend WhatsApp Click-to-Chat handoff.
 *
 * Response (success):
 * {
 *   orderId: "ORD-8F7A2B9C",
 *   grandTotal: 259800
 * }
 *
 * Response (error):
 * {
 *   error: "Human-readable error message"
 * }
 */
exports.processCheckout = async (req, res) => {
  // Validate input against express-validator rules
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg
    return res.status(400).json({ error: firstError })
  }

  const { customerName, phone, address, cartItems } = req.body

  // Additional validation: cart cannot be empty
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty.' })
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    // STEP 1: Validate that all productIds exist and fetch authoritative prices
    // This ensures the client cannot manipulate the cart by sending fake product IDs.
    const productIds = cartItems.map(item => item.productId)

    // Check for duplicate product IDs (ambiguity prevention)
    // Duplicates would allow the client to specify the same product twice
    // with different quantities, creating confusion. Reject explicitly.
    const uniqueIds = new Set(productIds)
    if (uniqueIds.size !== productIds.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        error: 'Cart contains duplicate product IDs. Please review your cart.'
      })
    }

    // Query PostgreSQL for products
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',')
    const productResult = await client.query(
      `SELECT id, name, price_inr FROM products WHERE id IN (${placeholders})`,
      productIds
    )

    // Verify all requested products exist
    if (productResult.rows.length !== cartItems.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        error: 'One or more products in your cart are no longer available.'
      })
    }

    // Build product lookup map: productId → { name, price }
    const productMap = {}
    productResult.rows.forEach(row => {
      productMap[row.id] = {
        name: row.name,
        price_inr: parseInt(row.price_inr, 10) // Price in paise
      }
    })

    // STEP 2: Calculate grand total server-side using PostgreSQL prices
    // Client-supplied prices, totals, discounts, or any other financial fields are IGNORED.
    // All calculations are authoritative and performed server-side.
    let grandTotal = 0
    const validatedItems = []

    for (const item of cartItems) {
      const product = productMap[item.productId]
      if (!product) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `Product ${item.productId} is not available.`
        })
      }

      // Quantity was already validated by express-validator (must be 1-100 integer)
      const quantity = parseInt(item.quantity, 10)
      const itemTotal = product.price_inr * quantity

      validatedItems.push({
        productId: item.productId,
        quantity,
        pricePerUnit: product.price_inr // For audit trail
      })

      grandTotal += itemTotal
    }

    // STEP 3: Generate cryptographically-secure order ID
    // Format: ORD-XXXXXXXX where X is from 4 bytes of secure random data.
    // Sequential IDs are predictable and enable order enumeration attacks.
    // Random IDs are opaque and safe for public exposure.
    const orderIdSuffix = crypto.randomBytes(4).toString('hex').toUpperCase()
    const orderId = `ORD-${orderIdSuffix}`

    // STEP 4: Insert order into database with PENDING status in transaction
    // Transaction ensures atomicity: either the entire order is created, or nothing is.
    await client.query(
      `INSERT INTO orders (id, customer_name, phone, address, cart_items, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        customerName,
        phone,
        address,
        JSON.stringify(validatedItems), // Store validated items for audit trail
        grandTotal, // Server-calculated total in paise
        'PENDING' // Initial order status
      ]
    )

    // Commit transaction — order is now durable in the database
    await client.query('COMMIT')

    console.log(`[checkout] Order ${orderId} created | Customer: ${customerName} | Total: ₹${(grandTotal / 100).toFixed(2)}`)

    // STEP 5: Return order ID to frontend for WhatsApp Click-to-Chat handoff
    // The frontend will open WhatsApp with ONLY the order ID in the URL.
    // Customer address, pricing, product details, and items remain server-side.
    // They are intentionally excluded from the browser URL and WhatsApp message.
    res.json({
      orderId,
      grandTotal
    })

  } catch (err) {
    if (client) await client.query('ROLLBACK')
    console.error('[checkout] Database error:', err.message)
    res.status(500).json({ error: 'Failed to process checkout. Please try again.' })
  } finally {
    if (client) client.release()
  }
}

// Alias for route handler
exports.submit = exports.processCheckout
