/**
 * routes/auth.js — Auth route definitions with input validation rules.
 * express-validator sanitises and validates all inputs before the
 * controller runs. Invalid requests are rejected before any DB query.
 */

'use strict'

const { Router }   = require('express')
const { body }     = require('express-validator')
const ctrl         = require('../controllers/authController')
const requireAuth  = require('../middleware/auth')
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter')

const router = Router()

// ── Validation rule sets ──────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.')
    .escape(),                                // Strip HTML entities

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail()                          // Lowercase + strip dots/aliases
    .isLength({ max: 254 }).withMessage('Email is too long.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .isLength({ max: 128 }).withMessage('Password must be 128 characters or fewer.')
    // Confirm password match is validated server-side
    .custom((value, { req }) => {
      if (value !== req.body.confirmPassword) {
        throw new Error('Passwords do not match.')
      }
      return true
    }),
]

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Password is too long.'),
]

// ── Routes ────────────────────────────────────────────────────────────────

// Apply broad rate limiter to all auth routes
router.use(authLimiter)

router.post('/register', registerRules,              ctrl.register)
router.post('/login',    loginLimiter, loginRules,   ctrl.login)
router.post('/logout',   requireAuth,                ctrl.logout)
router.get('/me',        requireAuth,                ctrl.me)

module.exports = router
