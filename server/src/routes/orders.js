/**
 * routes/orders.js — PostgreSQL order routes.
 *
 * Mounted at /api/orders in index.js.
 * The orderLimiter is applied per-route (not globally) so it targets
 * checkout traffic exclusively without affecting other endpoints.
 */

'use strict'

const { Router } = require('express')
const { orderLimiter } = require('../middleware/rateLimiter')
const { createOrder } = require('../controllers/orderController')

const router = Router()

// POST /api/orders/checkout
router.post('/checkout', orderLimiter, createOrder)

module.exports = router
