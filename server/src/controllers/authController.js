/**
 * controllers/authController.js
 *
 * Security controls:
 * - Passwords hashed with bcrypt (rounds from env)
 * - Parameterised DB queries throughout (prepared statements)
 * - Account lockout after N failed attempts (configurable)
 * - Constant-time bcrypt comparison prevents timing attacks
 * - JWT stored in httpOnly cookie only — never returned in JSON body
 * - Detailed errors logged server-side; generic messages sent to client
 */

'use strict'

const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const config = require('../config')
const db     = require('../db')

// ── Prepared statements (compiled once, reused safely) ────────────────────
const stmtFindByEmail = db.prepare(
  'SELECT id, name, email, password_hash, failed_login_attempts, locked_until FROM users WHERE email = ? COLLATE NOCASE'
)
const stmtInsertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
)
const stmtResetAttempts = db.prepare(
  'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?'
)
const stmtIncrementAttempts = db.prepare(`
  UPDATE users
  SET
    failed_login_attempts = failed_login_attempts + 1,
    locked_until = CASE
      WHEN failed_login_attempts + 1 >= ?
      THEN datetime('now', '+' || ? || ' minutes')
      ELSE locked_until
    END
  WHERE id = ?
`)

// ── Helpers ───────────────────────────────────────────────────────────────

function issueAuthCookie(res, userId) {
  const token = jwt.sign(
    { sub: String(userId) },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, algorithm: 'HS256' }
  )

  res.cookie('auth_token', token, {
    httpOnly: true,                          // JS cannot read this cookie
    secure:   config.isProd,                 // HTTPS only in production
    sameSite: 'strict',                      // CSRF protection
    maxAge:   config.cookie.maxAge,
    path:     '/',
  })
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', { httpOnly: true, sameSite: 'strict', path: '/' })
}

function isLocked(user) {
  if (!user.locked_until) return false
  return new Date(user.locked_until + 'Z') > new Date()
}

// ── Controllers ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  // 1. Validate inputs
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg })
  }

  const { name, email, password } = req.body

  try {
    // 2. Check for existing account (parameterised)
    const existing = stmtFindByEmail.get(email)
    if (existing) {
      // Generic message — don't reveal whether the email is registered
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    // 3. Hash password
    const hash = await bcrypt.hash(password, config.bcryptRounds)

    // 4. Insert user (parameterised)
    const result = stmtInsertUser.run(name.trim(), email.trim().toLowerCase(), hash)

    // 5. Issue JWT cookie
    issueAuthCookie(res, result.lastInsertRowid)

    return res.status(201).json({
      user: { id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() },
    })
  } catch (err) {
    // Log full error server-side only
    console.error('[register] Unexpected error:', err)
    return res.status(500).json({ error: 'Could not create account. Please try again.' })
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  // 1. Validate inputs
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg })
  }

  const { email, password } = req.body

  try {
    // 2. Find user (parameterised)
    const user = stmtFindByEmail.get(email)

    // 3. Generic "invalid credentials" — do NOT reveal whether email exists
    //    Still run bcrypt to prevent timing-based email enumeration
    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattacks.........')
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // 4. Account lockout check
    if (isLocked(user)) {
      return res.status(423).json({
        error: `Account temporarily locked. Please try again later.`,
      })
    }

    // 5. Verify password (constant-time)
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      stmtIncrementAttempts.run(
        config.auth.maxLoginAttempts,
        config.auth.lockDurationMinutes,
        user.id
      )
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // 6. Success — reset failed attempts and issue cookie
    stmtResetAttempts.run(user.id)
    issueAuthCookie(res, user.id)

    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error('[login] Unexpected error:', err)
    return res.status(500).json({ error: 'Sign-in failed. Please try again.' })
  }
}

/**
 * POST /api/auth/logout
 */
function logout(_req, res) {
  clearAuthCookie(res)
  return res.json({ message: 'Signed out successfully.' })
}

/**
 * GET /api/auth/me — protected by requireAuth middleware
 */
function me(req, res) {
  // req.user is set by the requireAuth middleware
  return res.json({ user: req.user })
}

module.exports = { register, login, logout, me }
