/**
 * middleware/auth.js — JWT verification middleware.
 * Reads the token from the httpOnly cookie (never from Authorization header
 * or query string, which would be accessible to JS / server logs).
 */

'use strict'

const jwt    = require('jsonwebtoken')
const config = require('../config')
const db     = require('../db')

// Prepared statement — reused across requests for efficiency
const findUserById = db.prepare(
  'SELECT id, name, email FROM users WHERE id = ?'
)

module.exports = function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  let payload
  try {
    payload = jwt.verify(token, config.jwt.secret)
  } catch (err) {
    // Do NOT expose whether the token is expired vs invalid
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }

  // Re-fetch the user to catch deleted/suspended accounts
  const user = findUserById.get(payload.sub)
  if (!user) {
    return res.status(401).json({ error: 'Account not found.' })
  }

  req.user = user
  next()
}
