/**
 * routes/auth.js — authentication boundary for login, logout, and account creation.
 * The browser is not trusted: passwords are validated server-side, cookies are
 * httpOnly, and account state is read from PostgreSQL before any identity claim is accepted.
 */

'use strict'

const { Router } = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/authController')
const requireAuth = require('../middleware/auth')
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter')

const router = Router()

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters.')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email is too long.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .isLength({ max: 128 }).withMessage('Password must be 128 characters or fewer.')
    .custom((value, { req }) => {
      if (value !== req.body.confirmPassword) {
        throw new Error('Passwords do not match.')
      }
      return true
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password.')
    .isLength({ min: 8, max: 128 }).withMessage('Password confirmation must be 8-128 characters.'),
]

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters.'),
]

router.use(authLimiter)
router.post('/register', registerRules, ctrl.register)
router.post('/login', loginLimiter, loginRules, ctrl.login)
router.post('/logout', requireAuth, ctrl.logout)
router.get('/me', requireAuth, ctrl.me)

module.exports = router
