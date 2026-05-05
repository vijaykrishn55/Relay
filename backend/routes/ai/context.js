/**
 * routes/ai/context.js
 * GET /api/ai/context-info/:sessionId
 *
 * Returns an estimated token count for the current session so the frontend
 * ContextMeter component can display a live context usage bar.
 *
 * Computes real system context size (memory, profile, session summaries)
 * instead of using a flat estimate.
 */

const express = require('express')
const router  = express.Router()
const {
  query, loadModels,
  buildFullSystemContext, buildConversationHistory,
} = require('./shared')

// GET /api/ai/context-info/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    // 1. Count visible message chars from DB
    const messages = await query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    let messageChars = 0
    for (const m of messages) {
      messageChars += (m.content || '').length
    }

    // 2. Compute real system context size (memory + profile + persistent)
    let systemContextChars = 0
    try {
      const models = await loadModels()
      const systemContext = await buildFullSystemContext(models, sessionId, '')
      systemContextChars = (systemContext || '').length
    } catch {
      // Fallback: estimate based on known budgets
      // ContextBuilder budgets: conversation(2000) + summary(1000) + profile(500) + memory(1000)
      systemContextChars = 2000
    }

    // Note: conversation history (last 10 messages) is a subset of the messages
    // already counted in messageChars, so we don't count it separately.
    // The real hidden overhead is the system context (memory, profile, summaries).

    const totalChars = messageChars + systemContextChars
    const estimatedTokens = Math.round(totalChars / 4)

    res.json({
      success: true,
      estimatedTokens,
      messageCount: messages.length,
      breakdown: {
        messageChars,
        systemContextChars,
        totalChars,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router

