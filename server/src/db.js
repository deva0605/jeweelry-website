/**
 * db.js — PostgreSQL pool with explicit schema initialization and development seeding.
 * The browser never owns pricing or order state; PostgreSQL remains the source of
 * truth. Product and order records are therefore persisted only through this layer.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'jewellery_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

async function applySchema(client) {
  const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql')
  const schemaSql = fs.readFileSync(migrationPath, 'utf8')
  await client.query(schemaSql)
}

async function seedDevelopmentProducts(client) {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const productCount = await client.query('SELECT COUNT(*) AS count FROM products')
  if (Number.parseInt(productCount.rows[0].count, 10) > 0) {
    return
  }

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
}

async function initializeDatabase() {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await applySchema(client)
    await seedDevelopmentProducts(client)
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

initializeDatabase().catch((err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[db] Fatal database initialization error:', err)
    process.exit(1)
  }
})

module.exports = pool
