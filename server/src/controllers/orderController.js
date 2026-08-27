/**
 * controllers/orderController.js — PostgreSQL-backed secure checkout.
 *
 * Security principles enforced here:
 *
 *  1. Zero-Trust Pricing  — the client payload contains only `productId` and
 *     `quantity`. Price is ALWAYS fetched from the `products` table; any
 *     price value the client sends is silently ignored.
 *
 *  2. Anti-Enumeration IDs — order IDs are generated with nanoid (random,
 *     URL-safe characters), making sequential guessing computationally
 *     infeasible.
 *
 *  3. Parameterised queries throughout — no string interpolation near SQL;
 *     the `pg` driver binds every $N placeholder separately.
 *
 *  4. No stack-trace leakage — errors are logged server-side only; the
 *     client receives a generic message.
 */

'use strict'

const pool = require('../pgPool')
const { nanoid } = require('nanoid')

// Allowed characters for the order ID suffix (uppercase alphanumeric only)
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a nanoid using only uppercase alphanumeric characters.
 * nanoid's default alphabet includes lowercase and special chars,
 * so we supply our own to get clean IDs like ORD-A1B2C3D4.
 */
function generateOrderId() {
  // Build an 8-char string from nanoid bytes mapped to our alphabet
  const raw = nanoid(8)
  const suffix = raw
    .split('')
    .map((ch) => {
      const idx = ch.codePointAt(0) % ID_ALPHABET.length
      return ID_ALPHABET[idx]
    })
    .join('')
  return `ORD-${suffix}`
}

/**
 * POST /api/orders/checkout
 *
 * Request body (JSON):
 * {
 *   customerName : string   — full name of the buyer
 *   phone        : string   — 10-digit Indian mobile number
 *   address      : string   — delivery address
 *   cartItems    : Array<{ productId: string, quantity: number }>
 * }
 *
 * Success response (200):
 * { success: true, orderId: "ORD-A1B2C3D4" }
 *
 * Error responses:
 *   400 — validation failure or unknown productId
 *   500 — database / unexpected error (generic message only)
 */
exports.createOrder = async (req, res) => {
  const { customerName, phone, address, cartItems } = req.body

  // ── 1. Input validation ──────────────────────────────────────────────────
  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    return res.status(400).json({ success: false, error: 'customerName is required.' })
  }
  if (!phone || typeof phone !== 'string' || !/^[6-9]\d{9}$/.test(phone.trim())) {
    return res.status(400).json({ success: false, error: 'A valid 10-digit Indian mobile number is required.' })
  }
  if (!address || typeof address !== 'string' || !address.trim()) {
    return res.status(400).json({ success: false, error: 'address is required.' })
  }
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'cartItems must be a non-empty array.' })
  }

  // Validate each cart item's shape
  for (const item of cartItems) {
    if (!item.productId || typeof item.productId !== 'string') {
      return res.status(400).json({ success: false, error: 'Each cart item must have a valid productId.' })
    }
    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({ success: false, error: 'Each cart item quantity must be an integer between 1 and 100.' })
    }
  }

  // Acquire a client for the entire transaction lifetime
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // ── 2. Zero-Trust pricing: fetch authoritative prices from DB ────────────
    let totalAmount = 0

    for (const item of cartItems) {
      // Parameterised query — $1 is bound by the driver, never interpolated
      const { rows } = await client.query(
        'SELECT price FROM products WHERE id = $1',
        [item.productId]
      )

      if (rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.productId}`,
        })
      }

      // Price is stored as an integer (paise). Cast to Number defensively.
      totalAmount += Number(rows[0].price) * Number(item.quantity)
    }

    // ── 3. Generate a non-sequential, opaque order ID ────────────────────────
    const orderId = generateOrderId()

    // ── 4. Persist the order ─────────────────────────────────────────────────
    await client.query(
      `INSERT INTO orders
         (order_id, customer_name, phone, address, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
      [
        orderId,
        customerName.trim(),
        phone.trim(),
        address.trim(),
        totalAmount,
      ]
    )

    await client.query('COMMIT')

    console.log(`[orders] Created: ${orderId} | total=${totalAmount}`)

    return res.status(200).json({ success: true, orderId })

  } catch (err) {
    // Roll back on any unexpected error; never expose internal details
    await client.query('ROLLBACK').catch(() => {})
    console.error('[orders] createOrder error:', err.message)
    return res.status(500).json({
      success: false,
      error: 'Failed to place order. Please try again.',
    })
  } finally {
    client.release()
  }
}
