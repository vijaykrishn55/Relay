/**
 * routes/ai/relay.js
 * Relay endpoints:
 *   POST /api/ai/relay-smart       — classify intent, then route to follow-up or new-session
 *   POST /api/ai/relay-followup    — explicit follow-up (no classification step)
 *   POST /api/ai/relay-topics      — extract topic clusters from a session
 *   POST /api/ai/relay-topics-manual — find messages matching a user-described topic
 *
 * All relay endpoints share the shared.js helpers for providers + context building.
 */

const express = require('express')
const router  = express.Router()

const {
  providers,
  loadModels,
  getRelayService, getConversationMemory, getPersistentMemory,
  RelayPipeline, UserPatternService,
  query, addMessage,
  buildUserContext, updateMessageInPlace,
} = require('./shared')

// ─── Helper: resolve target message from session messages list ────────────────
/**
 * Given a session's messages array and an optional targetMessageIndex,
 * returns { resolvedIndex, targetMessage, originalQuestion, originalResponse }.
 * Defaults to the last assistant message if targetMessageIndex is null.
 */
function resolveTarget(allMessages, targetMessageIndex, requestOriginalQuestion, requestOriginalResponse) {
  let resolvedIndex = targetMessageIndex

  // Default to last assistant message if unspecified
  if (resolvedIndex === undefined || resolvedIndex === null) {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].role === 'assistant') { resolvedIndex = i; break }
    }
  }

  const targetMessage = allMessages[resolvedIndex]

  let originalResponse = requestOriginalResponse || (targetMessage?.content || '')

  let originalQuestion = requestOriginalQuestion
  if (!originalQuestion) {
    for (let i = (resolvedIndex || 0) - 1; i >= 0; i--) {
      if (allMessages[i].role === 'user') { originalQuestion = allMessages[i].content; break }
    }
    if (!originalQuestion) originalQuestion = '(no prior question found)'
  }

  return { resolvedIndex, targetMessage, originalQuestion, originalResponse }
}

// ─── Shared: run a follow-up through RelayPipeline and update DB ──────────────
async function runFollowUp(sessionId, userInput, originalQuestion, originalResponse, targetMessage, resolvedIndex, res) {
  const models      = await loadModels()
  const relay       = getRelayService(models)
  const userContext = await buildUserContext(models, sessionId, userInput)
  const mergedInput = relay.buildFollowUpPrompt(originalQuestion, originalResponse, userInput.trim())

  const relayPipeline = new RelayPipeline(providers, models, userContext)
  const result        = await relayPipeline.process(mergedInput, sessionId, originalQuestion, originalResponse)

  // Update DB in-place
  if (targetMessage) {
    try {
      await updateMessageInPlace(targetMessage, result.output, result.model, userInput.trim())
    } catch (dbErr) {
      console.error('Failed to update message in DB:', dbErr.message)
    }
    // Record follow-up pattern (non-blocking)
    new UserPatternService().recordFeedback('follow_up', { sessionId }).catch(() => {})
  }

  console.log(`🔄 Relay follow-up processed via pipeline for session ${sessionId}`)

  return res.json({
    success:            true,
    action:             'follow_up',
    output:             result.output,
    model:              result.model,
    targetMessageIndex: resolvedIndex,
    followUpQuestion:   userInput.trim(),
    metrics:            result.metrics,
    orchestration:      result.orchestration,
  })
}

// ─── POST /relay-smart ────────────────────────────────────────────────────────
router.post('/relay-smart', async (req, res) => {
  try {
    const { sessionId, targetMessageIndex, userInput } = req.body
    let { originalQuestion, originalResponse } = req.body

    if (!userInput?.trim())  return res.status(400).json({ error: 'User input is required' })
    if (!sessionId)          return res.status(400).json({ error: 'sessionId is required' })

    const models = await loadModels()
    const relay  = getRelayService(models)

    const allMessages = await query(
      'SELECT id, role, content, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )
    if (!allMessages.length) return res.status(400).json({ error: 'No messages found in this session' })

    const { resolvedIndex, targetMessage, originalQuestion: resolvedQ, originalResponse: resolvedR } =
      resolveTarget(allMessages, targetMessageIndex, originalQuestion, originalResponse)

    if (!allMessages[resolvedIndex]) {
      return res.status(400).json({ error: 'Could not find target AI message in session' })
    }

    originalQuestion = resolvedQ
    originalResponse = resolvedR

    // Step 1: classify intent
    const classification = await relay.classifyIntent(userInput.trim(), originalQuestion, originalResponse)
    console.log(`🧠 Relay intent: ${classification.intent}`, classification.topic || '')

    // ── FOLLOW-UP ──
    if (classification.intent === 'follow_up') {
      return await runFollowUp(sessionId, userInput, originalQuestion, originalResponse, targetMessage, resolvedIndex, res)
    }

    // ── NEW SESSION ──
    if (classification.intent === 'new_session' && classification.topic) {
      const topicResult = await relay.extractTopicManual(sessionId, classification.topic)

      if (!topicResult?.messageIndices?.length) {
        return res.json({ success: true, action: 'new_session', error: 'no_matches', topic: classification.topic })
      }

      const smartContext = await relay.buildSmartContext(sessionId, classification.topic, topicResult.messageIndices)
      if (!smartContext) {
        return res.json({ success: true, action: 'new_session', error: 'no_matches', topic: classification.topic })
      }

      const contextMsgs = [{
        role:    'system',
        content: `[Context about "${classification.topic}" from previous conversation]\n\n${smartContext}`,
        model:   null,
      }]

      const { createSessionWithContext } = require('../../data/sessions')
      const newSession = await createSessionWithContext(contextMsgs, sessionId, classification.topic)
      console.log(`🌿 Relay branched session ${newSession.id} for topic: "${classification.topic}"`)

      return res.json({
        success:      true,
        action:       'new_session',
        topic:        classification.topic,
        newSession: {
          id:                newSession.id,
          title:             newSession.title,
          context_messages:  newSession.context_messages,
          parent_session_id: newSession.parent_session_id,
          relay_topic:       newSession.relay_topic,
        },
        messageCount: contextMsgs.length,
      })
    }

    // ── FALLBACK: treat as follow-up ──
    console.warn('⚠️ Relay intent unclear, defaulting to follow-up')
    return await runFollowUp(sessionId, userInput, originalQuestion, originalResponse, targetMessage, resolvedIndex, res)

  } catch (error) {
    console.error('Smart relay error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ─── POST /relay-followup ─────────────────────────────────────────────────────
router.post('/relay-followup', async (req, res) => {
  try {
    const { sessionId, targetMessageIndex, followUpQuestion } = req.body
    let { originalQuestion, originalResponse } = req.body

    if (!followUpQuestion?.trim()) return res.status(400).json({ error: 'Follow-up question is required' })
    if (!sessionId)                return res.status(400).json({ error: 'sessionId is required' })

    const models = await loadModels()

    const allMessages = await query(
      'SELECT id, role, content, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    const { resolvedIndex, targetMessage, originalQuestion: resolvedQ, originalResponse: resolvedR } =
      resolveTarget(allMessages, targetMessageIndex, originalQuestion, originalResponse)

    if (!resolvedR || !resolvedQ) {
      return res.status(400).json({ error: 'Could not determine original question and response' })
    }

    return await runFollowUp(sessionId, followUpQuestion, resolvedQ, resolvedR, targetMessage, resolvedIndex, res)

  } catch (error) {
    console.error('Relay follow-up error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ─── POST /relay-topics ───────────────────────────────────────────────────────
router.post('/relay-topics', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

    const models = await loadModels()
    const relay  = getRelayService(models)
    const topics = await relay.extractTopics(sessionId)

    res.json({ success: true, topics })
  } catch (error) {
    console.error('Topic extraction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ─── POST /relay-topics-manual ────────────────────────────────────────────────
router.post('/relay-topics-manual', async (req, res) => {
  try {
    const { sessionId, description } = req.body
    if (!sessionId || !description) {
      return res.status(400).json({ error: 'sessionId and description are required' })
    }

    const models = await loadModels()
    const relay  = getRelayService(models)
    const topic  = await relay.extractTopicManual(sessionId, description)

    res.json({ success: true, topic: topic || null })
  } catch (error) {
    console.error('Manual topic extraction error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
