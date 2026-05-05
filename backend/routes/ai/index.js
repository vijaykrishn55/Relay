/**
 * routes/ai/index.js
 * Mounts the three focused ai sub-routers under /api/ai.
 *
 * Route map:
 *   POST   /api/ai/process                  → process.js
 *   GET    /api/ai/context-info/:sessionId   → context.js
 *   POST   /api/ai/relay-smart              → relay.js
 *   POST   /api/ai/relay-followup           → relay.js
 *   POST   /api/ai/relay-topics             → relay.js
 *   POST   /api/ai/relay-topics-manual      → relay.js
 */

const express = require('express')
const router  = express.Router()

const processRouter  = require('./process')
const contextRouter  = require('./context')
const relayRouter    = require('./relay')

// Main AI request handler
router.use('/process', processRouter)

// Context meter info
router.use('/context-info', contextRouter)

// All relay endpoints (relay-smart, relay-followup, relay-topics, relay-topics-manual)
router.use('/', relayRouter)

module.exports = router
