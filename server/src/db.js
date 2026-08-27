/**
 * db.js — PostgreSQL database connection pool and initialization.
 * All queries use parameterized statements ($1, $2, etc.),
 * which prevents SQL injection by design.
 */

'use strict'

const { Pool } = require('pg')

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jewellery_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Graceful shutdown
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

// ── Initialize database (create tables and seed data) ──────────────────────
async function initializeDatabase() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                    SERIAL PRIMARY KEY,
        name                  VARCHAR(255) NOT NULL,
        email                 VARCHAR(255) UNIQUE NOT NULL,
        password_hash         VARCHAR(255) NOT NULL,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until          TIMESTAMP,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email))
    `)

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          VARCHAR(50) PRIMARY KEY,
        code        VARCHAR(50) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        category    VARCHAR(100) NOT NULL,
        price_inr   INTEGER NOT NULL,
        description TEXT,
        img_url     TEXT
      )
    `)

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id            VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        phone         VARCHAR(20) NOT NULL,
        address       TEXT NOT NULL,
        cart_items    JSONB NOT NULL,
        grand_total   INTEGER NOT NULL,
        status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)
    `)

    // ── Seed products table (idempotent) ────────────────────────────────────
    const productCount = await client.query('SELECT COUNT(*) as count FROM products')
    
    if (parseInt(productCount.rows[0].count) === 0) {
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

      for (const product of products) {
        await client.query(
          `INSERT INTO products (id, code, name, category, price_inr, description, img_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          product
        )
      }

      console.log('[db] Seeded 15 products into database')
    }

    await client.query('COMMIT')
    console.log('[db] PostgreSQL database initialized successfully')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[db] Failed to initialize database:', err.message)
    throw err
  } finally {
    client.release()
  }
}

// Run initialization
initializeDatabase().catch((err) => {
  console.error('[db] Fatal database initialization error:', err)
  process.exit(1)
})

module.exports = pool
