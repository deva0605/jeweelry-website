'use strict'

/**
 * Strict server-side validation helpers for untrusted browser input.
 * Any value that reaches this layer is treated as hostile until proven valid.
 */

function normalizeText(value, { maxLength = 255, minLength = 1 } = {}) {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (trimmed.length < minLength) return ''
  if (trimmed.length > maxLength) return ''
  return trimmed
}

function isValidIndianPhone(value) {
  if (typeof value !== 'string') return false
  return /^[6-9]\d{9}$/.test(value.trim())
}

function isWholeNumber(value, { min = 1, max = 100 } = {}) {
  return Number.isInteger(value) && value >= min && value <= max
}

function hasForbiddenCheckoutFields(payload) {
  const forbidden = ['customer', 'items', 'total', 'grandTotal', 'price', 'qty', 'id']
  return forbidden.some((field) => Object.prototype.hasOwnProperty.call(payload, field))
}

function isCanonicalCartItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  if (typeof item.productId !== 'string') return false

  const productId = item.productId.trim()
  if (productId.length === 0 || productId.length > 50) return false

  if (!isWholeNumber(item.quantity, { min: 1, max: 100 })) return false

  const forbiddenItemFields = ['price', 'total', 'grandTotal', 'pricePerUnit']
  if (forbiddenItemFields.some((field) => Object.prototype.hasOwnProperty.call(item, field))) {
    return false
  }

  return true
}

module.exports = {
  normalizeText,
  isValidIndianPhone,
  isWholeNumber,
  hasForbiddenCheckoutFields,
  isCanonicalCartItem,
}
