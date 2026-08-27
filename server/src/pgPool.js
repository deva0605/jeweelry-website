/**
 * pgPool.js — PostgreSQL connection pool via the `pg` package.
 *
 * A single Pool instance is exported and shared by all controllers.
 * Connection parameters are read exclusively from environment variables
 * so credentials never appear in source code.
 *
 * Required env vars:
 *   PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD
 *
 * Optional:
 *   PG_SSL=true  — set in production to enforce TLS to the server
 */

'use strict'

const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.PG_HOST     ?? 'localhost',
  port:     parseInt(process.env.PG_PORT ?? '5432', 10),
  database: process.env.PG_DATABASE ?? 'jewellry',
  user:     process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  // Enforce TLS in production; skip verification only when explicitly disabled
  ssl: process.env.PG_SSL === 'true'
    ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
  // Pool sizing — conservative defaults suitable for a small VPS
  max:              10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Surface connection errors early rather than silently ignoring them
pool.on('error', (err) => {
  console.error('[pg] Unexpected pool error:', err.message)
})

module.exports = pool
