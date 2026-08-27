/**
 * middleware/rateLimiter.js
 *
 * Two limiters:
 *  - authLimiter  : 10 requests / 15 min — applied to all /api/auth routes
 *  - loginLimiter : 5 requests / 15 min  — applied only to POST /api/auth/login
 *
 * Generic error messages prevent enumeration of whether a limit was hit
 * due to a valid vs invalid account.
 */

'use strict'

const rateLimit = require('express-rate-limit')

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/** Broad limiter — all auth endpoints */
const authLimiter = rateLimit({
  windowMs:          WINDOW_MS,
  max:               10,
  standardHeaders:   true,  // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders:     false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please wait a few minutes and try again.',
    })
  },
})

/** Strict limiter — login endpoint only */
const loginLimiter = rateLimit({
  windowMs:          WINDOW_MS,
  max:               5,
  standardHeaders:   true,
  legacyHeaders:     false,
  skipSuccessfulRequests: true, // Only count failed/attempted requests
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
    })
  },
})

/** Checkout limiter — prevent abuse of SQLite checkout endpoint */
const checkoutLimiter = rateLimit({
  windowMs:          WINDOW_MS,
  max:               5,
  standardHeaders:   true,
  legacyHeaders:     false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many checkout attempts. Please wait 15 minutes and try again.',
    })
  },
})

/**
 * orderLimiter — applied strictly to POST /api/orders/checkout.
 * 5 requests per 15-minute window per IP.
 * Prevents spam bots from flooding the orders table with fake PENDING rows.
 */
const orderLimiter = rateLimit({
  windowMs:          WINDOW_MS,
  max:               5,
  standardHeaders:   true,  // Sends standard RateLimit-* headers to the client
  legacyHeaders:     false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many checkout attempts. Please wait 15 minutes and try again.',
    })
  },
})

module.exports = { authLimiter, loginLimiter, checkoutLimiter, orderLimiter }
