/**
 * index.js — Express application entry point.
 *
 * Security headers applied by Helmet (CSP, HSTS, X-Frame-Options, etc.)
 * CORS restricted to the configured allowed origins only.
 * Cookies parsed by cookie-parser.
 * All errors caught and returned without stack traces.
 */

'use strict'

// Load .env before anything else
require('dotenv').config()
const config = require('./config')

const express      = require('express')
const helmet       = require('helmet')
const cors         = require('cors')
const cookieParser = require('cookie-parser')

const authRoutes   = require('./routes/auth')

const app = express()

// ── Security headers (Helmet) ─────────────────────────────────────────────
app.use(helmet())

// ── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl) in dev only
    if (!origin && !config.isProd) return callback(null, true)
    if (config.allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin '${origin}' not allowed`))
  },
  credentials: true, // Required for cross-origin cookies
}))

// ── Body parsing (limit to 10kb to prevent large payload attacks) ─────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false, limit: '10kb' }))

// ── Cookie parsing ────────────────────────────────────────────────────────
app.use(cookieParser(config.cookie.secret))

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// Health check (useful for uptime monitors, no sensitive data)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

// ── Global error handler (never expose stack traces to clients) ───────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: 'An unexpected error occurred.' })
})

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`[server] Running on http://localhost:${config.port} (${config.nodeEnv})`)
})
