'use strict'

/**
 * Centralized application error handling.
 * The client receives sanitized JSON only and never sees stack traces, SQL,
 * filesystem paths, or secrets. Server logs may contain diagnostic details,
 * but they must stay carefully redacted.
 */
module.exports = function errorHandler(err, _req, res, _next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload.' })
  }

  if (err && err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Authentication failed.' })
  }

  console.error('[server] Unhandled error:', {
    message: err && err.message,
    stack: err && err.stack,
  })

  return res.status(500).json({ error: 'An unexpected error occurred.' })
}
