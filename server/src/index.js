/**
 * index.js — application bootstrap for the production-oriented Express backend.
 * Request IDs, secure headers, strict CORS, and sanitized error handling are all
 * enforced before route logic runs.
 */

'use strict'

const app = require('./app')
const config = require('./config')

const server = app.listen(config.port, () => {
  console.log(`[server] Running on http://localhost:${config.port} (${config.nodeEnv})`)
})

module.exports = server
