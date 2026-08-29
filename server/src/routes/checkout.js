/**
 * routes/checkout.js — Checkout route with validation and rate limiting.
 *
 * ONE CANONICAL CHECKOUT ENDPOINT with ONE CANONICAL PAYLOAD:
 *
 * POST /api/checkout
 * {
 *   customerName: string (required, 1-100 chars)
 *   phone: string (required, 10 digits, format: 6-9xxxxxxxxx)
 *   address: string (required, 1-500 chars)
 *   cartItems: [
 *     { productId: string, quantity: integer (1-100) }
 *   ]
 * }
 *
 * Rate limiting: 5 requests per 15-minute window per IP
 * Prevents abuse of the checkout endpoint (spam orders, DOS attacks, etc.)
 *
 * All alternate payload formats (customer/items/total, id/qty, etc.) are
 * not supported and will be rejected as invalid input.
 */

'use strict'

const { Router } = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/checkoutController')
const { checkoutLimiter } = require('../middleware/rateLimiter')

const router = Router()

// ── Validation rules — enforce ONE canonical contract ──────────────────────
// These rules ensure requests conform to the canonical payload format.
// Any deviation (missing fields, wrong types, invalid values) is rejected.

const checkoutRules = [
  // Customer name: required, trimmed, max 100 characters
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.')
    .escape(),

  // Phone: required, exactly 10 digits, Indian mobile format (6-9 as first digit)
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number.'),

  // Address: required, trimmed, max 500 characters
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required.')
    .isLength({ max: 500 }).withMessage('Address must be 500 characters or fewer.')
    .escape(),

  // Cart items: required, non-empty array, each item must have productId and quantity
  body('cartItems')
    .isArray({ min: 1 }).withMessage('Cart cannot be empty.')
    .custom((items) => {
      // Validate each item matches the canonical contract: productId + quantity
      for (const item of items) {
        // productId: must be a string
        if (typeof item.productId !== 'string' || item.productId.trim().length === 0) {
          throw new Error('Each cart item must have a valid productId (string).')
        }

        // quantity: must be an integer between 1 and 100
        const qty = item.quantity
        if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 100) {
          throw new Error('Each cart item quantity must be an integer between 1 and 100.')
        }

        // Reject any financial fields sent by the client
        // Frontend MUST NOT send price, total, discount, etc.
        if ('price' in item || 'total' in item || 'pricePerUnit' in item || 'grandTotal' in item) {
          throw new Error('Cart item contains price field. Prices are calculated server-side only.')
        }
      }
      return true
    }),
]

// ── Routes ────────────────────────────────────────────────────────────
// ONE endpoint, ONE rate limiter, ONE validation set, ONE controller

router.post('/', checkoutLimiter, checkoutRules, ctrl.submit)

module.exports = router
