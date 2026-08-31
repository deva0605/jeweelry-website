/**
 * config.js — validate deployment configuration before the process serves traffic.
 * The browser is never trusted; secure configuration is therefore enforced at the
 * server boundary before any request handling begins.
 */

'use strict'

const nodeEnv = process.env.NODE_ENV ?? 'development'
const isProd = nodeEnv === 'production'

const ensurePositiveInteger = (value, fallback, label) => {
  const parsed = Number.parseInt(value ?? String(fallback), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
  return parsed
}

const devFallbackJwtSecret = 'development_jwt_secret_for_local_testing_123456789'
const devFallbackCookieSecret = 'development_cookie_secret_for_local_testing_123456789'

const jwtSecret = process.env.JWT_SECRET ?? (isProd ? '' : devFallbackJwtSecret)
const cookieSecret = process.env.COOKIE_SECRET ?? (isProd ? '' : devFallbackCookieSecret)
const bcryptRounds = ensurePositiveInteger(process.env.BCRYPT_ROUNDS, 12, 'BCRYPT_ROUNDS')

if (isProd && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set to a secret string of at least 32 characters in production.')
}

if (!isProd && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set to a secret string of at least 32 characters in development.')
}

if (isProd && (!cookieSecret || cookieSecret.length < 32)) {
  throw new Error('COOKIE_SECRET must be set to a secret string of at least 32 characters in production.')
}

if (!isProd && (!cookieSecret || cookieSecret.length < 32)) {
  throw new Error('COOKIE_SECRET must be set to a secret string of at least 32 characters in development.')
}

if (bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS must be between 10 and 15 to balance cost and performance.')
}

const defaultAllowedOrigins = isProd
  ? []
  : 'http://localhost:5173,http://127.0.0.1:5173'

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? defaultAllowedOrigins)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (isProd && (allowedOrigins.length === 0 || allowedOrigins.includes('*'))) {
  throw new Error('ALLOWED_ORIGINS must contain a strict allowlist of trusted origins in production.')
}

if (!isProd && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must contain a strict allowlist of trusted origins in development.')
}

const trustProxy = process.env.TRUST_PROXY === 'true'

module.exports = {
  port: ensurePositiveInteger(process.env.PORT ?? '3001', 3001, 'PORT'),
  nodeEnv,
  isProd,
  trustProxy,

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  cookie: {
    secret: cookieSecret,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
    secure: isProd,
  },

  bcryptRounds,

  allowedOrigins,

  auth: {
    maxLoginAttempts: ensurePositiveInteger(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 5, 'MAX_LOGIN_ATTEMPTS'),
    lockDurationMinutes: ensurePositiveInteger(process.env.LOCK_DURATION_MINUTES ?? '30', 30, 'LOCK_DURATION_MINUTES'),
  },
}
