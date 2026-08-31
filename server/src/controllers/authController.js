/**
 * controllers/authController.js
 *
 * Authentication is a trust boundary: the browser never owns identity. The JWT is
 * issued only to the server's httpOnly cookie and is revalidated against the
 * database before any request is treated as authenticated.
 */

'use strict'

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const config = require('../config')
const pool = require('../db')

function issueAuthCookie(res, userId) {
  const token = jwt.sign(
    { sub: String(userId) },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, algorithm: 'HS256' }
  )

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
    path: '/',
  })
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  })
}

function isLocked(user) {
  if (!user.locked_until) return false
  return new Date(user.locked_until) > new Date()
}

async function register(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg })
  }

  const { name, email, password } = req.body

  try {
    const existingResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim().toLowerCase()]
    )

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds)
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    )

    const newUserId = result.rows[0].id
    issueAuthCookie(res, newUserId)

    return res.status(201).json({
      user: { id: newUserId, name: name.trim(), email: email.trim().toLowerCase() },
    })
  } catch (err) {
    console.error('[register] Unexpected error:', err)
    return res.status(500).json({ error: 'Could not create account. Please try again.' })
  }
}

async function login(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg })
  }

  const { email, password } = req.body

  try {
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, failed_login_attempts, locked_until FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim().toLowerCase()]
    )
    const user = userResult.rows[0]

    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingprotection0000000000000000')
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (isLocked(user)) {
      return res.status(423).json({ error: 'Account temporarily locked. Please try again later.' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      await pool.query(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE
               WHEN failed_login_attempts + 1 >= $1 THEN NOW() + ($2 || ' minutes')::INTERVAL
               ELSE locked_until
             END
         WHERE id = $3`,
        [config.auth.maxLoginAttempts, config.auth.lockDurationMinutes, user.id]
      )
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    )
    issueAuthCookie(res, user.id)

    return res.json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    console.error('[login] Unexpected error:', err)
    return res.status(500).json({ error: 'Sign-in failed. Please try again.' })
  }
}

function logout(_req, res) {
  clearAuthCookie(res)
  return res.json({ message: 'Signed out successfully.' })
}

function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { register, login, logout, me }
