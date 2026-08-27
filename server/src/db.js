/**
 * db.js — SQLite database initialisation.
 * All queries use better-sqlite3 prepared statements (parameterised),
 * which prevents SQL injection by design.
 */

'use strict'

const path    = require('path')
const Database = require('better-sqlite3')

const DB_PATH = path.join(__dirname, '..', 'data', 'app.sqlite')

// Ensure the data directory exists
const fs = require('fs')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
// Enforce foreign key constraints
db.pragma('foreign_keys = ON')

// ── Schema migrations (idempotent) ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
    name                  TEXT     NOT NULL,
    email                 TEXT     UNIQUE NOT NULL COLLATE NOCASE,
    password_hash         TEXT     NOT NULL,
    failed_login_attempts INTEGER  NOT NULL DEFAULT 0,
    locked_until          DATETIME,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users (email COLLATE NOCASE);
`)

console.log('[db] SQLite database ready at', DB_PATH)

module.exports = db
