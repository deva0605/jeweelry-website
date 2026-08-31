'use strict'

const config = require('../config')
const { isAllowedOrigin } = require('../utils/security')

/**
 * Origin checks help mitigate CSRF for browser-authenticated state-changing
 * requests when the browser sends an Origin/Referer header.
 * This supplements SameSite cookies and does not replace them.
 */
module.exports = function enforceOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next()
  }

  const origin = req.get('Origin') || req.get('Referer')
  if (!origin) {
    return next()
  }

  if (!isAllowedOrigin(origin, config.allowedOrigins)) {
    return res.status(403).json({ error: 'Origin not allowed.' })
  }

  return next()
}
