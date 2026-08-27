/**
 * config.js — Load and validate all environment variables at startup.
 * The process exits immediately if any required variable is missing,
 * so misconfigured deployments fail loudly rather than silently.
 */

'use strict'

const required = [
  'JWT_SECRET',
  'COOKIE_SECRET',
  'BCRYPT_ROUNDS',
]

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`)
    console.error('Copy .env.example to .env and fill in all values.')
    process.exit(1)
  }
}

const jwtSecret = process.env.JWT_SECRET
if (jwtSecret.length < 32) {
  console.error('[FATAL] JWT_SECRET must be at least 32 characters.')
  process.exit(1)
}

module.exports = {
  port:              parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv:           process.env.NODE_ENV ?? 'development',
  isProd:            process.env.NODE_ENV === 'production',

  jwt: {
    secret:          process.env.JWT_SECRET,
    expiresIn:       process.env.JWT_EXPIRES_IN ?? '24h',
  },

  cookie: {
    secret:          process.env.COOKIE_SECRET,
    maxAge:          24 * 60 * 60 * 1000, // 24 h in ms
  },

  bcryptRounds:      parseInt(process.env.BCRYPT_ROUNDS, 10),

  allowedOrigins:    (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
                       .split(',')
                       .map((o) => o.trim()),

  auth: {
    maxLoginAttempts:    parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
    lockDurationMinutes: parseInt(process.env.LOCK_DURATION_MINUTES ?? '30', 10),
  },
}
