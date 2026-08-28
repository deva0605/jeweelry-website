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
const pool = require('../db')
const crypto = require('crypto')

const formatWhatsAppNumber = (phone) => {
  let number = String(phone).replace(/\D/g, '')
  if (number.length === 10) number = `91${number}`
  return number
}

const dispatchConciergeMessage = async ({ phone, customerName, address, items, total, orderId }) => {
  const { WHATSAPP_TOKEN: token, WHATSAPP_PHONE_ID: phoneId, UPI_ID: upiId, BUSINESS_NAME: businessName } = process.env
  if (!token || !phoneId) {
    console.warn('[checkout] WhatsApp credentials missing. Skipping message dispatch.')
    return
  }

  const safeBusinessName = businessName || 'Ushhh.atelier'
  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(safeBusinessName)}&am=${(total / 100).toFixed(2)}&cu=INR&tn=Order_${orderId}`
    : 'UPI payment details will be shared by our concierge.'
  const itemList = items.map(item => `• ${item.name} (x${item.quantity}) - ₹${(item.price / 100).toLocaleString('en-IN')}`).join('\n')
  const messageText = `✨ *${safeBusinessName}* ✨\n\nHello ${customerName},\n\nThank you for your request. Your pieces are currently being reserved by our concierge.\n\n*Order ID:* ${orderId}\n*Total:* ₹${(total / 100).toLocaleString('en-IN')}\n\n*Items:*\n${itemList}\n\n*Delivery To:*\n${address}\n\nTo confirm your order, please complete your secure payment using the UPI link below:\n\n🔗 ${upiLink}\n\nOnce paid, please reply to this message with a screenshot of your transaction.`

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatWhatsAppNumber(phone),
      type: 'text',
      text: { preview_url: false, body: messageText },
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('[checkout] Meta API error:', data)
    throw new Error('Failed to dispatch WhatsApp message')
  }
}

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
exports.processCheckout = async (req, res) => {
  // Support the concierge payload directly while retaining the original
  // customerName/phone/address/cartItems contract used by the storefront.
  if (req.body.customer && Array.isArray(req.body.items)) {
    const { customer, items, total } = req.body
    if (!customer.phone || items.length === 0 || typeof total !== 'number' || !Number.isFinite(total)) {
      return res.status(400).json({ error: 'Invalid checkout payload' })
    }

    try {
      const orderId = `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      await dispatchConciergeMessage({
        phone: customer.phone,
        customerName: customer.name || 'there',
        address: [customer.address, customer.city, customer.zip].filter(Boolean).join(', '),
        total: total * 100,
        orderId,
        items: items.map(item => ({
          name: item.name || item.productId || item.id || 'Jewelry piece',
          quantity: item.quantity,
          price: Number(item.price) * 100,
        })),
      })
      return res.status(200).json({ success: true, orderId })
    } catch (error) {
      console.error('[checkout] Concierge dispatch error:', error)
      return res.status(502).json({ error: 'Failed to dispatch WhatsApp message' })
    }
  }

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

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    // Fetch all product prices from database (server-side pricing)
    const productIds = normalizedCartItems.map(item => item.productId)
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',')
    
    const productResult = await client.query(
      `SELECT id, name, price_inr FROM products WHERE id IN (${placeholders})`,
      productIds
    )

    // Check if all products exist
    if (productResult.rows.length !== normalizedCartItems.length) {
      if (client) await client.query('ROLLBACK')
      return res.status(400).json({ error: 'One or more products not found.' })
    }

    // Create price lookup map
    const productMap = {}
    productResult.rows.forEach(p => {
      productMap[p.id] = { name: p.name, price: parseInt(p.price_inr) }
    })

    // Calculate grand total (server-side only)
    let grandTotal = 0
    for (const item of normalizedCartItems) {
      const product = productMap[item.productId]
      if (!product) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Product ${item.productId} not found.` })
      }
      grandTotal += product.price * item.quantity
    }

    // Generate unique 8-character order ID
    const orderId = `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

    // Insert order into database
    await client.query(
      `INSERT INTO orders (id, customer_name, phone, address, cart_items, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [orderId, customerName, phone, address, JSON.stringify(normalizedCartItems), grandTotal]
    )

    await client.query('COMMIT')

    console.log(`[checkout] Order created: ${orderId} | Total: ₹${(grandTotal / 100).toFixed(2)}`)

    await dispatchConciergeMessage({
      phone,
      customerName,
      address,
      total: grandTotal,
      orderId,
      items: normalizedCartItems.map(item => ({
        name: productMap[item.productId].name,
        price: productMap[item.productId].price,
        quantity: item.quantity,
      })),
    })

    res.json({
      orderId,
      grandTotal,
    })

  } catch (err) {
    if (client) await client.query('ROLLBACK')
    console.error('[checkout] Error processing order:', err)
    res.status(500).json({ error: 'Failed to process checkout. Please try again.' })
  } finally {
    if (client) client.release()
  }
}

// Kept as the route handler name used by the existing checkout router.
exports.submit = exports.processCheckout
