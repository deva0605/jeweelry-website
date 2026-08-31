'use strict'

const crypto = require('crypto')

/**
 * Security helpers for server-owned decisions.
 * The browser is untrusted and must never influence identity, pricing, totals,
 * order IDs, or state transitions.
 */

function createOrderId() {
  // Sequential IDs are predictable and leak order enumeration patterns.
  // We use 4 bytes of cryptographic randomness and a fixed prefix so the
  // order ID remains opaque while still being human-readable.
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `ORD-${suffix}`
}

function safeErrorMessage(err) {
  if (err && err.message) {
    return err.message
  }
  return 'An unexpected error occurred.'
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return allowedOrigins.includes(parsed.origin)
  } catch (_error) {
    return false
  }
}

module.exports = {
  createOrderId,
  safeErrorMessage,
  isAllowedOrigin,
}
