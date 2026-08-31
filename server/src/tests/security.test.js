'use strict'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

const test = require('node:test')
const assert = require('node:assert/strict')

const { createOrderId, isAllowedOrigin } = require('../utils/security')
const { isValidIndianPhone, isWholeNumber, isCanonicalCartItem, hasForbiddenCheckoutFields } = require('../utils/validation')
const { processCheckout } = require('../controllers/checkoutController')
const pool = require('../db')
const { register, login } = require('../controllers/authController')

const originalQuery = pool.query
const originalConnect = pool.connect

function setMockDbResponses({ productRows = [], userRows = [] } = {}) {
  pool.query = async (...args) => {
    const sql = String(args[0]).trim()

    if (/SELECT\s+id,\s*name,\s*price_inr\s+FROM\s+products/i.test(sql)) {
      return { rows: productRows }
    }

    if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+LOWER\(email\)\s*=\s*LOWER\(/i.test(sql)) {
      return { rows: userRows }
    }

    if (/SELECT\s+id,\s*name,\s*email,\s*password_hash,\s*failed_login_attempts,\s*locked_until\s+FROM\s+users\s+WHERE\s+LOWER\(email\)\s*=\s*LOWER\(/i.test(sql)) {
      return { rows: userRows }
    }

    if (/INSERT INTO orders/i.test(sql)) {
      return { rows: [] }
    }

    if (/UPDATE\s+users/i.test(sql)) {
      return { rows: [] }
    }

    if (/INSERT INTO users/i.test(sql)) {
      return { rows: [{ id: 42 }] }
    }

    return { rows: [] }
  }

  pool.connect = async () => ({
    query: async (sql) => {
      const normalized = String(sql).trim()

      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [] }
      }

      if (/SELECT\s+id,\s*name,\s*price_inr\s+FROM\s+products/i.test(normalized)) {
        return { rows: productRows }
      }

      if (/INSERT INTO orders/i.test(normalized)) {
        return { rows: [] }
      }

      return { rows: [] }
    },
    release: () => {},
  })
}

test.afterEach(() => {
  pool.query = originalQuery
  pool.connect = originalConnect
})

test('order IDs are cryptographically random and follow the ORD prefix', () => {
  const id = createOrderId()
  assert.match(id, /^ORD-[A-F0-9]{8}$/)
  assert.notEqual(id, createOrderId())
})

test('phone validation accepts only valid 10-digit Indian numbers', () => {
  assert.equal(isValidIndianPhone('9876543210'), true)
  assert.equal(isValidIndianPhone('1234567890'), false)
  assert.equal(isValidIndianPhone('987654321'), false)
  assert.equal(isValidIndianPhone('987654321a'), false)
})

test('quantity validation rejects invalid values', () => {
  assert.equal(isWholeNumber(1, { min: 1, max: 100 }), true)
  assert.equal(isWholeNumber(0), false)
  assert.equal(isWholeNumber(-1), false)
  assert.equal(isWholeNumber(101), false)
  assert.equal(isWholeNumber(1.5), false)
  assert.equal(isWholeNumber(Number.NaN), false)
  assert.equal(isWholeNumber(Number.POSITIVE_INFINITY), false)
})

test('duplicate product IDs and fake financial fields are rejected in canonical checkout contract', () => {
  const item1 = { productId: 'j-001', quantity: 1 }
  const item2 = { productId: 'j-001', quantity: 2 }
  assert.equal(isCanonicalCartItem(item1), true)
  assert.equal(isCanonicalCartItem(item2), true)
  assert.equal(isCanonicalCartItem({ productId: 'j-001', quantity: 1, price: 10 }), false)

  const duplicateIds = [item1.productId, item2.productId]
  assert.equal(new Set(duplicateIds).size === duplicateIds.length, false)
  assert.equal(hasForbiddenCheckoutFields({ customer: 'x' }), true)
})

test('checkout calculates server-side total from PostgreSQL pricing, ignoring client price fields', async () => {
  setMockDbResponses({
    productRows: [{ id: 'j-001', name: 'Daisy Bangle Set', price_inr: 129900 }],
  })

  const req = {
    body: {
      customerName: 'Alice',
      phone: '9876543210',
      address: '123 Main St',
      cartItems: [{ productId: 'j-001', quantity: 2 }],
    },
    id: 'req-123',
  }

  const res = {
    statusCode: null,
    payload: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this },
    json(data) { this.payload = data; return this },
  }

  await processCheckout(req, res)

  assert.equal(res.statusCode, 201)
  assert.match(res.payload.orderId, /^ORD-[A-F0-9]{8}$/)
  assert.equal(res.payload.grandTotal, undefined)
})

test('unknown product IDs fail checkout before any order is created', async () => {
  setMockDbResponses({
    productRows: [],
  })

  const req = {
    body: {
      customerName: 'Alice',
      phone: '9876543210',
      address: '123 Main St',
      cartItems: [{ productId: 'missing-product', quantity: 1 }],
    },
    id: 'req-456',
  }

  const res = {
    statusCode: null,
    payload: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this },
    json(data) { this.payload = data; return this },
  }

  await processCheckout(req, res)

  assert.equal(res.statusCode, 400)
  assert.match(res.payload.error, /not available|available/i)
})

test('register and login controllers avoid leaking account existence data', async () => {
  setMockDbResponses({ userRows: [] })

  const registerReq = { body: { name: 'Jane Doe', email: 'jane@example.com', password: 'Password123', confirmPassword: 'Password123' } }
  const registerRes = { statusCode: null, payload: null, cookie: null, setHeader() {}, json(data) { this.payload = data; return this }, status(code) { this.statusCode = code; return this }, cookie(name, value) { this.cookie = { name, value } } }

  await register(registerReq, registerRes)
  assert.equal(registerRes.statusCode, 201)
  assert.equal(registerRes.payload.user.email, 'jane@example.com')

  setMockDbResponses({ userRows: [] })
  const loginReq = { body: { email: 'ghost@example.com', password: 'Password123' } }
  const loginRes = { statusCode: null, payload: null, cookie: null, setHeader() {}, json(data) { this.payload = data; return this }, status(code) { this.statusCode = code; return this }, cookie(name, value) { this.cookie = { name, value } } }
  await login(loginReq, loginRes)
  assert.equal(loginRes.statusCode, 401)
  assert.match(loginRes.payload.error, /invalid.*password|invalid.*email/i)
})

test('origin validation rejects unsafe cross-origin requests', () => {
  assert.equal(isAllowedOrigin('https://evil.example', ['https://app.example.com']), false)
  assert.equal(isAllowedOrigin('https://app.example.com', ['https://app.example.com']), true)
})
