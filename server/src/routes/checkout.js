/**
 * routes/checkout.js — canonical checkout boundary.
 *
 * Allowed request shape:
 * {
 *   customerName: string,
 *   phone: '9876543210',
 *   address: string,
 *   cartItems: [{ productId: 'j-001', quantity: 1 }]
 * }
 *
 * The browser may provide only productId + quantity. Product pricing and totals are
 * always derived from PostgreSQL in the server-owned checkout controller.
 */

'use strict'

const { Router } = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/checkoutController')
const { checkoutLimiter } = require('../middleware/rateLimiter')
const { hasForbiddenCheckoutFields, isCanonicalCartItem, isValidIndianPhone } = require('../utils/validation')

const router = Router()

const checkoutRules = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ min: 1, max: 100 }).withMessage('Customer name must be 1-100 characters.')
    .escape(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .custom((value) => {
      if (!isValidIndianPhone(value)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.')
      }
      return true
    }),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required.')
    .isLength({ min: 1, max: 500 }).withMessage('Address must be 1-500 characters.')
    .escape(),

  body('cartItems')
    .isArray({ min: 1 }).withMessage('Cart cannot be empty.')
    .custom((items) => {
      if (!Array.isArray(items)) {
        throw new Error('Cart must be an array.')
      }

      const seen = new Set()
      for (const item of items) {
        if (!isCanonicalCartItem(item)) {
          throw new Error('Each cart item must contain a valid productId and quantity between 1 and 100.')
        }

        if (seen.has(item.productId)) {
          throw new Error('Duplicate product IDs are not allowed in one checkout request.')
        }

        seen.add(item.productId)
      }

      return true
    }),

  body().custom((value, { req }) => {
    if (hasForbiddenCheckoutFields(req.body)) {
      throw new Error('Unsupported legacy checkout payload. Use customerName, phone, address, and cartItems only.')
    }
    return true
  }),
]

router.post('/', checkoutLimiter, checkoutRules, ctrl.submit)

module.exports = router
