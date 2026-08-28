/**
 * routes/checkout.js — Checkout route with validation and rate limiting.
 */

'use strict'

const { Router } = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/checkoutController')
const { checkoutLimiter } = require('../middleware/rateLimiter')

const router = Router()

// ── Validation rules ──────────────────────────────────────────────────────

const checkoutRules = [
  body('customerName')
    .if((value, { req }) => !req.body.customer)
    .trim()
    .notEmpty().withMessage('Customer name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.')
    .escape(),

  body('phone')
    .if((value, { req }) => !req.body.customer)
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number.'),

  body('address')
    .if((value, { req }) => !req.body.customer)
    .trim()
    .notEmpty().withMessage('Address is required.')
    .isLength({ max: 500 }).withMessage('Address must be 500 characters or fewer.')
    .escape(),

  body('cartItems')
    .if((value, { req }) => !req.body.customer)
    .isArray({ min: 1 }).withMessage('Cart cannot be empty.')
    .custom((items) => {
      for (const item of items) {
        if (!item.id || typeof item.qty !== 'number') {
          throw new Error('Invalid cart item format.')
        }
      }
      return true
    }),
]

// ── Routes ────────────────────────────────────────────────────────────────

router.post('/', checkoutLimiter, checkoutRules, ctrl.submit)

module.exports = router
