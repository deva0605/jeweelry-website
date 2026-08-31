'use strict'

require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const config = require('./config')
const requestId = require('./middleware/requestId')
const errorHandler = require('./middleware/errorHandler')
const csrfProtection = require('./middleware/csrf')
const authRoutes = require('./routes/auth')
const checkoutRoutes = require('./routes/checkout')

const app = express()

app.set('trust proxy', config.trustProxy ? 1 : false)
app.use(requestId)
app.use(helmet({
  hsts: config.isProd,
  referrerPolicy: { policy: 'no-referrer' },
  xFrameOptions: { action: 'deny' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}))

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, config.isProd ? false : true)
    }

    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS: origin '${origin}' not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Request-ID'],
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false, limit: '10kb' }))
app.use(cookieParser(config.cookie.secret))
app.use(csrfProtection)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/checkout', checkoutRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})
app.use(errorHandler)

module.exports = app
