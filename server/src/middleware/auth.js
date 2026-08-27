/**
 * middleware/auth.js — JWT verification middleware.
 * Reads the token from the httpOnly cookie (never from Authorization header
 * or query string, which would be accessible to JS / server logs).
 */

'use strict'

const jwt    = require('jsonwebtoken')
const config = require('../config')
const pool   = require('../db')

module.exports = async function requireAuth(req, res, next) {
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

  try {
    // Re-fetch the user to catch deleted/suspended accounts
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [payload.sub]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Account not found.' })
    }

    req.user = userResult.rows[0]
    next()
  } catch (err) {
    console.error('[auth middleware] Error checking user:', err)
    return res.status(500).json({ error: 'Authentication check failed.' })
  }
}
