/**
 * middleware/auth.js — server-side authentication boundary.
 * The browser is untrusted; we therefore read the JWT only from the httpOnly
 * cookie, verify it against the server secret, and re-fetch the user record
 * from PostgreSQL before trusting the identity.
 */

'use strict'

const jwt = require('jsonwebtoken')
const config = require('../config')
const pool = require('../db')

module.exports = async function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  let payload
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] })
  } catch (_err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }

  try {
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [payload.sub]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Account not found.' })
    }

    req.user = userResult.rows[0]
    return next()
  } catch (err) {
    console.error('[auth middleware] Error checking user:', err)
    return res.status(500).json({ error: 'Authentication check failed.' })
  }
}
