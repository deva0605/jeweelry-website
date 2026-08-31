/**
 * controllers/checkoutController.js
 *
 * This is the authority boundary for checkout. The browser may send productId and
 * quantity only. All pricing, order totals, and order-state decisions are created
 * from PostgreSQL and server-side calculations using integer paise.
 */

'use strict'

const { validationResult } = require('express-validator')
const pool = require('../db')
const { createOrderId } = require('../utils/security')

function calculateGrandTotal(productsById, cartItems) {
  let total = 0
  const validatedItems = []

  for (const item of cartItems) {
    const product = productsById[item.productId]
    if (!product) {
      throw new Error(`Product ${item.productId} is not available.`)
    }

    const quantity = Number.parseInt(item.quantity, 10)
    const itemTotal = product.price_inr * quantity
    validatedItems.push({
      productId: item.productId,
      quantity,
      pricePerUnit: product.price_inr,
    })
    total += itemTotal
  }

  return { total, validatedItems }
}

exports.calculateGrandTotal = calculateGrandTotal

exports.processCheckout = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  const { customerName, phone, address, cartItems } = req.body

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty.' })
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const productIds = cartItems.map((item) => item.productId)
    const placeholders = productIds.map((_, index) => `$${index + 1}`).join(', ')
    const productResult = await client.query(
      `SELECT id, name, price_inr FROM products WHERE id IN (${placeholders})`,
      productIds
    )

    if (productResult.rows.length !== cartItems.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'One or more products in your cart are no longer available.' })
    }

    const productsById = {}
    for (const row of productResult.rows) {
      productsById[row.id] = {
        name: row.name,
        price_inr: Number.parseInt(row.price_inr, 10),
      }
    }

    const { total, validatedItems } = calculateGrandTotal(productsById, cartItems)
    const orderId = createOrderId()

    await client.query(
      `INSERT INTO orders (id, customer_name, phone, address, cart_items, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orderId,
        customerName,
        phone,
        address,
        JSON.stringify(validatedItems),
        total,
        'PENDING',
      ]
    )

    await client.query('COMMIT')

    console.log(`[checkout] Order ${orderId} created | customer=${customerName} | total_paise=${total}`)

    res.status(201).json({ orderId })
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK')
    }
    console.error('[checkout] Failed to process checkout:', err.message)
    return res.status(500).json({ error: 'Failed to process checkout. Please try again.' })
  } finally {
    if (client) {
      client.release()
    }
  }
}

exports.submit = exports.processCheckout
