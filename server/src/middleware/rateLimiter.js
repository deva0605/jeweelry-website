/**
 * middleware/rateLimiter.js
 *
 * Different endpoints need different abuse protections. The in-memory limiters are
 * intentionally simple and per-process. For multi-instance production deployments,
 * this should later be backed by a shared store such as Redis so the limit is
 * enforced consistently across all app instances.
 */

'use strict'

const rateLimit = require('express-rate-limit')

const WINDOW_MS = 15 * 60 * 1000

const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' })
  },
})

const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' })
  },
})

const checkoutLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many checkout attempts. Please wait 15 minutes and try again.' })
  },
})

module.exports = { authLimiter, loginLimiter, checkoutLimiter }

