'use strict'

const crypto = require('crypto')

/**
 * Every request gets a correlation ID for safe production debugging.
 * The ID is returned as an HTTP header and logged with route metadata instead
 * of including sensitive request bodies or secrets in logs.
 */
module.exports = function requestId(req, res, next) {
  const existingId = req.get('X-Request-ID') || crypto.randomUUID()
  req.id = existingId
  res.setHeader('X-Request-ID', existingId)
  next()
}
