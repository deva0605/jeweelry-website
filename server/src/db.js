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

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT    PRIMARY KEY,
    code        TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    price_inr   INTEGER NOT NULL,
    description TEXT,
    img_url     TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            TEXT     PRIMARY KEY,
    customer_name TEXT     NOT NULL,
    phone         TEXT     NOT NULL,
    address       TEXT     NOT NULL,
    cart_items    TEXT     NOT NULL,
    grand_total   INTEGER  NOT NULL,
    status        TEXT     NOT NULL DEFAULT 'PENDING',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
`)

// ── Seed products table (idempotent) ────────────────────────────────────────
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get()

if (productCount.count === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, code, name, category, price_inr, description, img_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const products = [
    ['j-001', 'J 001', 'Daisy Bangle Set', 'BRACELETS', 129900, 'Delicate daisy-motif gold-toned bangles. A charming pair perfect for stacking or wearing solo.', ''],
    ['j-002', 'J 002', 'Charm Cuff Duo', 'BRACELETS', 149900, 'Bamboo-inspired charm cuffs with playful dangling accents in red and gold.', ''],
    ['j-003', 'J 003', 'Crystal Line Bangle', 'BRACELETS', 99900, 'Slim bangles set with rows of sparkling micro-crystals. Subtle, timeless, and versatile.', ''],
    ['j-004', 'J 004', 'Roman Numeral Cuff', 'BRACELETS', 119900, 'Gold cuff featuring Roman numeral engravings with a diamond-paved crossover accent.', ''],
    ['j-005', 'J 005', 'Butterfly Heart Bangle', 'BRACELETS', 109900, 'Heart-shaped crystal cluster bangle with a butterfly motif. Elegant and whimsical.', ''],
    ['j-006', 'J 006', 'Emerald Stripe Cuff', 'BRACELETS', 139900, 'Bold gold cuff with an emerald centre stone and pink crystal pavé striping.', ''],
    ['j-007', 'J 007', 'Gold Hoop Collection', 'EARRINGS', 89900, 'A curated set of sculptural gold hoops — from classic circles to textured organic forms.', ''],
    ['j-008', 'J 008', 'Satellite Chain', 'CHAINS', 79900, 'Minimalist satellite-bead herringbone chain. Wear layered or solo for an understated look.', ''],
    ['j-009', 'J 009', 'Heart Pendant Necklace', 'PENDANTS', 69900, 'Dainty open-heart pendant on a snake chain. A forever piece for everyday wear.', ''],
    ['j-010', 'J 010', 'Full Bracelet Tray', 'BRACELETS', 249900, 'Our complete signature bracelet tray — 12 curated styles in one premium collection.', ''],
    ['j-011', 'J 011', 'Vine Crystal Bracelet', 'BRACELETS', 179900, 'Flowing vine-and-crystal bracelet on a delicate gold chain. Feminine and refined.', ''],
    ['j-012', 'J 012', 'Sapphire Bloom Bracelet', 'BRACELETS', 189900, 'Oval sapphire-hued stones set in gold — a rich, saturated statement piece.', ''],
    ['j-013', 'J 013', 'Pendant Necklace Set', 'PENDANTS', 159900, 'Three charm pendants — heart, avocado, and green cat-eye — on matching gold chains.', ''],
    ['j-014', 'J 014', 'Mixed Chain Display', 'CHAINS', 109900, 'A curated wall of layered chains — snake, curb, ball, and paperclip styles all in gold.', ''],
    ['j-015', 'J 015', 'Greek Key Cuff', 'BRACELETS', 124900, 'Wide gold cuff with an embossed Greek-key meander pattern. Architectural and bold.', ''],
  ]

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertProduct.run(...row)
    }
  })

  insertMany(products)
  console.log('[db] Seeded 15 products into database')
}

console.log('[db] SQLite database ready at', DB_PATH)

module.exports = db
