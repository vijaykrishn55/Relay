const express = require('express')
const router = express.Router()
const AIRouter = require('../services/router')
const MistralProvider = require('../services/mistralProvider')
const CerebrasProvider = require('../services/cerebrasProvider')
const GroqProvider = require('../services/groqProvider')
const CohereProvider = require('../services/cohereProvider')
const ConversationMemory = require('../services/conversationMemory')
const PersistentMemoryService = require('../services/persistentMemoryService')
const RelayService = require('../services/relayService')
const HiveOrchestrator = require('../services/hiveOrchestrator')
const RelayPipeline = require('../services/relayPipeline')  // Phase 8
const UserPatternService = require('../services/userPatternService')  // Phase 8
const { getModelsSync, loadModels } = require('../data/models')
const { addMessage, getSession, updateSession } = require('../data/sessions')
const { query } = require('../data/db')
const { getUserProfile } = require('../data/userProfile')
const memoryService = require('../services/memoryService')

const mistralProvider = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider = new GroqProvider()
const cohereProvider = new CohereProvider()

// Lazy-init: routerModel resolved at first request
let conversationMemory = null
let persistentMemory = null
let relayService = null

function getConversationMemory(models) {
  if (!conversationMemory) {
    const routerModel = models.find(m => m.id === 9)
    conversationMemory = new ConversationMemory(groqProvider, routerModel)
  }
  return conversationMemory
}

function getPersistentMemory(models) {
  if (!persistentMemory) {
    const summarizerModel = models.find(m => m.id === 9)
    persistentMemory = new PersistentMemoryService(groqProvider, summarizerModel)
  }
  return persistentMemory
}

function getRelayService(models) {
  if (!relayService) {
    const routerModel = models.find(m => m.id === 9)
    relayService = new RelayService(groqProvider, routerModel)
  }
  return relayService
}

/**
 * Log orchestration data to the database.
 */
async function logOrchestration(logEntry) {
  try {
    await query(
      `INSERT INTO orchestration_logs 
       (session_id, user_question, is_complex, triage_scores, decomposition, strategies, execution_results, models_used, total_latency, total_tokens, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logEntry.sessionId,
        logEntry.userQuestion,
        logEntry.isComplex,
        JSON.stringify(logEntry.triageScores),
        JSON.stringify(logEntry.decomposition),
        JSON.stringify(logEntry.strategies),
        JSON.stringify(logEntry.executionResults),
        JSON.stringify(logEntry.modelsUsed),
        logEntry.totalLatency,
        logEntry.totalTokens,
        logEntry.status
      ]
    )
  } catch (err) {
    console.error('Failed to log orchestration:', err.message)
  }
}

/**
 * Auto-title a session based on the user's first message.
 * Only updates if the session title is still the default "New Chat".
 */
async function autoTitleSession(sessionId, userInput) {
  try {
    const session = await getSession(sessionId)
    if (!session) return
    // Only auto-title if it's still "New Chat" (default)
    if (session.title && session.title !== 'New Chat') return

    // Generate a short title from the user's input
    let title = userInput.trim()
    // Remove newlines
    title = title.replace(/[\r\n]+/g, ' ')
    // Cap at 60 chars, break at word boundary
    if (title.length > 60) {
      title = title.substring(0, 60)
      const lastSpace = title.lastIndexOf(' ')
      if (lastSpace > 20) title = title.substring(0, lastSpace)
      title += '...'
    }
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1)

    await updateSession(sessionId, { title })
    console.log(`📝 Auto-titled session ${sessionId}: "${title}"`)
  } catch (err) {
    console.error('Auto-title failed:', err.message)
  }
}

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities, sessionId, mode } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    const models = await loadModels()
    const memory = getConversationMemory(models)
    const persistent = getPersistentMemory(models)

    // ── CRITICAL FIX: Load actual in-session message history ──
    let conversationHistory = []
    if (sessionId) {
      try {
        const recentMessages = await query(
          `SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 10`,
          [sessionId]
        )
        if (recentMessages && recentMessages.length > 0) {
          conversationHistory = recentMessages.reverse().map(m => ({
            role: m.role,
            content: m.content
          }))
          console.log(`💬 Loaded ${conversationHistory.length} in-session messages for context`)
        }
      } catch (err) {
        console.error('Failed to load in-session messages:', err.message)
      }
    }

    // Build persistent context (user profile + last session summary)
    let persistentContext = ''
    if (sessionId) {
      try {
        persistentContext = await persistent.buildPersistentContext(sessionId)
        if (persistentContext) {
          console.log(`🧠 Loaded persistent memory context for session ${sessionId}`)
        }
      } catch (err) {
        console.error('Failed to load persistent context:', err.message)
      }
    }

    // Build conversation context from stored summaries
    let systemContext = null
    if (sessionId) {
      systemContext = await memory.buildContext(sessionId)
      if (systemContext) {
        console.log(`📝 Loaded conversation context for session ${sessionId}`)
      }
    }

    // Build memory context from saved memories 
    const memoryContext = await memoryService.buildMemoryContext(input)

    // Load context messages if session has them (context-seeded sessions)
    let contextPrefix = ''
    if (sessionId) {
      const session = await getSession(sessionId)
      if (session && session.context_messages && session.context_messages.length > 0) {
        const contextBlock = session.context_messages
          .map(m => `[${m.role}]: ${m.content}`)
          .join('\n')
        contextPrefix = `\n\n[Context from a previous conversation — the user selected these messages as relevant]\n${contextBlock}\n`
      }
    }

    // Combine all context sources — deduplicate and cap total size
    const MAX_CONTEXT_CHARS = 6000
    const contextParts = []

    // Priority 1: Context-seeded session messages
    if (contextPrefix) {
      contextParts.push(contextPrefix)
    }

    // Priority 2: Memory context (saved memories matching query)
    if (memoryContext) {
      contextParts.push(memoryContext)
    }

    // Priority 3: Persistent context (user profile + last session summary)
    if (persistentContext) {
      contextParts.push(persistentContext)
    }

    // Join and cap
    let fullSystemContext = contextParts.filter(Boolean).join('\n\n')
    if (fullSystemContext.length > MAX_CONTEXT_CHARS) {
      fullSystemContext = fullSystemContext.substring(0, MAX_CONTEXT_CHARS)
    }

    // ── HIVE MIND ROUTING ──
    // mode='hive' forces full pipeline, otherwise auto-triage
    const useHive = !strategy || strategy === 'ai-powered' || strategy === 'orchestrated'

    if (useHive) {
      const userProfile = await getUserProfile()
      const userContext = {
        profile: userProfile,
        sessionContext: systemContext || '',
        memoryContext: memoryContext || '',
        lastSessionSummary: persistentContext || ''
      }

      const providers = {
        mistral: mistralProvider,
        cerebras: cerebrasProvider,
        groq: groqProvider,
        cohere: cohereProvider
      }

      const hive = new HiveOrchestrator(providers, models, userContext)
      const result = await hive.process(input, fullSystemContext, conversationHistory, mode === 'hive')

      // Record messages to DB
      if (sessionId) {
        await addMessage(sessionId, { role: 'user', content: input })
        await addMessage(sessionId, { role: 'assistant', content: result.output, model: result.model })
        memory.recordExchange(sessionId, input, result.output, result.model)

        // Auto-title session on first exchange
        autoTitleSession(sessionId, input).catch(() => {})
      }

      // Log orchestration (non-blocking)
      if (sessionId) {
        const logEntry = hive.buildLogEntry(sessionId, input, result)
        logOrchestration(logEntry).catch(() => {})
      }

      return res.json({
        success: true,
        input,
        output: result.output,
        model: result.model,
        provider: result.provider,
        decision: result.decision,
        metrics: result.metrics,
        orchestration: result.orchestration
      })
    }

    // ── LEGACY ROUTING (for explicit strategy selection) ──
    const aiRouter = new AIRouter(models)

    const selectedModel = await aiRouter.selectModel({
      strategy: strategy || 'balanced',
      requiredCapabilities: requiredCapabilities || ['text-generation'],
      input
    })

    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    const decision = aiRouter.explainDecision(selectedModel, strategy || 'balanced')
    decision.mode = 'legacy'
    console.log(`🎯 Legacy selected: ${selectedModel.name}`)

    let response
    const providerMap = {
      mistral: mistralProvider,
      cerebras: cerebrasProvider,
      groq: groqProvider,
      cohere: cohereProvider
    }
    const provider = providerMap[selectedModel.apiProvider]
    if (!provider) throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)
    response = await provider.callModel(selectedModel, input, fullSystemContext, conversationHistory)

    // Record messages to DB (non-blocking)
    if (sessionId) {
      await addMessage(sessionId, {role: 'user', content: input})
      await addMessage(sessionId, {role: 'assistant', content: response.output, model: selectedModel.name})
      memory.recordExchange(sessionId, input, response.output, selectedModel.name)

      // Auto-title session on first exchange
      autoTitleSession(sessionId, input).catch(() => {})
    }

    res.json({
      success: true,
      input,
      output: response.output,
      model: selectedModel.name,
      provider: selectedModel.provider,
      decision,
      metrics: {
        latency: response.latency,
        cost: response.cost,
        tokensUsed: response.tokensUsed
      }
    })

  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: error.message })
  }
})

// ── Context Info — for the context meter UI ──
router.get('/context-info/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const messages = await query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )
    let totalChars = 0
    for (const m of messages) {
      totalChars += (m.content || '').length
    }
    totalChars += 500 // system prompt overhead
    const estimatedTokens = Math.round(totalChars / 4)
    res.json({ success: true, estimatedTokens, messageCount: messages.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ── Relay: Follow-Up — regenerate a response with follow-up context ──
router.post('/relay-followup', async (req, res) => {
  try {
    const {
      sessionId,
      targetMessageIndex,
      followUpQuestion
    } = req.body

    // Allow these to be optional — derive from DB if missing
    let { originalQuestion, originalResponse } = req.body

    if (!followUpQuestion || !followUpQuestion.trim()) {
      return res.status(400).json({ error: 'Follow-up question is required' })
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)

    // ── Defensive: derive originalQuestion & originalResponse from DB if not provided ──
    let resolvedTargetIndex = targetMessageIndex
    const allMessages = await query(
      'SELECT id, role, content, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    // If targetMessageIndex not provided, default to last assistant message
    if (resolvedTargetIndex === undefined || resolvedTargetIndex === null) {
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].role === 'assistant') {
          resolvedTargetIndex = i
          break
        }
      }
    }

    const targetMessage = allMessages[resolvedTargetIndex]

    if (!originalResponse && targetMessage) {
      originalResponse = targetMessage.content || ''
    }
    if (!originalQuestion) {
      for (let i = (resolvedTargetIndex || 0) - 1; i >= 0; i--) {
        if (allMessages[i].role === 'user') {
          originalQuestion = allMessages[i].content
          break
        }
      }
      if (!originalQuestion) originalQuestion = '(no prior question found)'
    }

    if (!originalResponse || !originalQuestion) {
      return res.status(400).json({ error: 'Could not determine original question and response' })
    }

    // Build the merged prompt
    const mergedInput = relay.buildFollowUpPrompt(
      originalQuestion,
      originalResponse,
      followUpQuestion.trim()
    )

    // Load all existing context (same as /process)
    const persistent = getPersistentMemory(models)
    const memory = getConversationMemory(models)

    let persistentContext = ''
    let systemContext = null

    if (sessionId) {
      try {
        persistentContext = await persistent.buildPersistentContext(sessionId)
      } catch (err) {
        console.error('Failed to load persistent context:', err.message)
      }
      systemContext = await memory.buildContext(sessionId)
    }

    const memoryContext = await memoryService.buildMemoryContext(followUpQuestion)

    // ── Phase 8: Use RelayPipeline instead of legacy AIRouter ──
    const userProfile = await getUserProfile()
    const userContext = {
      profile: userProfile,
      sessionContext: systemContext || '',
      memoryContext: memoryContext || '',
      lastSessionSummary: persistentContext || ''
    }

    const providers = {
      mistral: mistralProvider,
      cerebras: cerebrasProvider,
      groq: groqProvider,
      cohere: cohereProvider
    }

    const relayPipeline = new RelayPipeline(providers, models, userContext)
    const result = await relayPipeline.process(
      followUpQuestion.trim(),
      sessionId,
      originalQuestion,
      originalResponse
    )

    // Update the original AI message in the database in-place
    if (targetMessage) {
      try {
        const dbMessageId = targetMessage.id
        let existingFollowups = []
        try {
          const raw = targetMessage.relay_followups
          existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
        } catch { existingFollowups = [] }

        existingFollowups.push(followUpQuestion.trim())

        await query(
          'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
          [result.output, result.model, JSON.stringify(existingFollowups), dbMessageId]
        )
      } catch (dbErr) {
        console.error('Failed to update message in DB:', dbErr.message)
      }

      // Phase 8: Record follow-up pattern (non-blocking)
      const patternService = new UserPatternService()
      patternService.recordFeedback('follow_up', { sessionId }).catch(() => {})
    }

    console.log(`🔄 Relay follow-up processed via Phase 8 pipeline for session ${sessionId}`)

    res.json({
      success: true,
      action: 'follow_up',
      output: result.output,
      model: result.model,
      targetMessageIndex: resolvedTargetIndex,
      followUpQuestion: followUpQuestion.trim(),
      metrics: result.metrics,
      orchestration: result.orchestration
    })

  } catch (error) {
    console.error('Relay follow-up error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ── Relay: Active — extract topic clusters from current session ──
router.post('/relay-topics', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)
    const topics = await relay.extractTopics(sessionId)

    res.json({ success: true, topics })
  } catch (error) {
    console.error('Topic extraction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ── Relay: Active (Manual) — find messages matching a user-described topic ──
router.post('/relay-topics-manual', async (req, res) => {
  try {
    const { sessionId, description } = req.body
    if (!sessionId || !description) {
      return res.status(400).json({ error: 'sessionId and description are required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)
    const topic = await relay.extractTopicManual(sessionId, description)

    if (!topic) {
      return res.json({ success: true, topic: null })
    }

    res.json({ success: true, topic })
  } catch (error) {
    console.error('Manual topic extraction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ── Relay: Smart — classify intent and auto-route ──
router.post('/relay-smart', async (req, res) => {
  try {
    const {
      sessionId,
      targetMessageIndex,
      userInput
    } = req.body

    // Allow these to be optional — we'll derive them from DB if missing
    let { originalQuestion, originalResponse } = req.body

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: 'User input is required' })
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)

    // ── Defensive: derive originalQuestion & originalResponse from DB if not provided ──
    let resolvedTargetIndex = targetMessageIndex
    const allMessages = await query(
      'SELECT id, role, content, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    if (allMessages.length === 0) {
      return res.status(400).json({ error: 'No messages found in this session' })
    }

    // If targetMessageIndex not provided, default to last assistant message
    if (resolvedTargetIndex === undefined || resolvedTargetIndex === null) {
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].role === 'assistant') {
          resolvedTargetIndex = i
          break
        }
      }
    }

    if (resolvedTargetIndex === undefined || resolvedTargetIndex === null || !allMessages[resolvedTargetIndex]) {
      return res.status(400).json({ error: 'Could not find target AI message in session' })
    }

    const targetMessage = allMessages[resolvedTargetIndex]

    // Derive originalResponse from DB if not provided
    if (!originalResponse) {
      originalResponse = targetMessage.content || ''
    }

    // Derive originalQuestion: find the user message immediately preceding the target
    if (!originalQuestion) {
      for (let i = resolvedTargetIndex - 1; i >= 0; i--) {
        if (allMessages[i].role === 'user') {
          originalQuestion = allMessages[i].content
          break
        }
      }
      if (!originalQuestion) {
        originalQuestion = '(no prior question found)'
      }
    }

    // Step 1: Classify intent
    const classification = await relay.classifyIntent(
      userInput.trim(),
      originalQuestion,
      originalResponse
    )

    console.log(`🧠 Relay intent classified as: ${classification.intent}`, classification.topic || '')

    // ── FOLLOW-UP: regenerate in-place ──
    if (classification.intent === 'follow_up') {
      // ── Phase 8: Use RelayPipeline instead of legacy AIRouter ──
      const memoryContext = await memoryService.buildMemoryContext(userInput)
      const userProfile = await getUserProfile()
      const memory = getConversationMemory(models)
      const persistent = getPersistentMemory(models)

      let persistentContext = ''
      let systemContext = null
      try {
        persistentContext = await persistent.buildPersistentContext(sessionId)
      } catch (err) {
        console.error('Failed to load persistent context:', err.message)
      }
      systemContext = await memory.buildContext(sessionId)

      const userContext = {
        profile: userProfile,
        sessionContext: systemContext || '',
        memoryContext: memoryContext || '',
        lastSessionSummary: persistentContext || ''
      }

      const providers = {
        mistral: mistralProvider,
        cerebras: cerebrasProvider,
        groq: groqProvider,
        cohere: cohereProvider
      }

      const relayPipeline = new RelayPipeline(providers, models, userContext)
      const result = await relayPipeline.process(
        userInput.trim(),
        sessionId,
        originalQuestion,
        originalResponse
      )

      // Update DB in-place
      try {
        const dbMessageId = targetMessage.id
        let existingFollowups = []
        try {
          const raw = targetMessage.relay_followups
          existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
        } catch { existingFollowups = [] }

        existingFollowups.push(userInput.trim())

        await query(
          'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
          [result.output, result.model, JSON.stringify(existingFollowups), dbMessageId]
        )
      } catch (dbErr) {
        console.error('Failed to update message in DB:', dbErr.message)
      }

      // Phase 8: Record follow-up pattern (non-blocking)
      const patternService = new UserPatternService()
      patternService.recordFeedback('follow_up', { sessionId }).catch(() => {})

      console.log(`🔄 Relay smart follow-up processed via Phase 8 pipeline for session ${sessionId}`)

      return res.json({
        success: true,
        action: 'follow_up',
        output: result.output,
        model: result.model,
        targetMessageIndex: resolvedTargetIndex,
        followUpQuestion: userInput.trim(),
        metrics: result.metrics,
        orchestration: result.orchestration
      })
    }

    // ── NEW SESSION: extract topic context and branch ──
    if (classification.intent === 'new_session' && classification.topic) {
      // Use extractTopicManual to find matching messages
      const topicResult = await relay.extractTopicManual(sessionId, classification.topic)

      if (!topicResult || !topicResult.messageIndices || topicResult.messageIndices.length === 0) {
        return res.json({
          success: true,
          action: 'new_session',
          error: 'no_matches',
          topic: classification.topic
        })
      }

      // Build smart context - extract only relevant lines, not full messages
      const smartContext = await relay.buildSmartContext(
        sessionId,
        classification.topic,
        topicResult.messageIndices
      )

      if (!smartContext) {
        return res.json({
          success: true,
          action: 'new_session',
          error: 'no_matches',
          topic: classification.topic
        })
      }

      // Create context as a single condensed block
      const contextMsgs = [{
        role: 'system',
        content: `[Context about "${classification.topic}" from previous conversation]\n\n${smartContext}`,
        model: null
      }]

      // Create the new session with context, tracking parent session and topic
      const { createSessionWithContext } = require('../data/sessions')
      const newSession = await createSessionWithContext(contextMsgs, sessionId, classification.topic)

      console.log(`🌿 Relay branched new session ${newSession.id} for topic: "${classification.topic}" (parent: ${sessionId})`)

      return res.json({
        success: true,
        action: 'new_session',
        topic: classification.topic,
        newSession: {
          id: newSession.id,
          title: newSession.title,
          context_messages: newSession.context_messages,
          parent_session_id: newSession.parent_session_id,
          relay_topic: newSession.relay_topic
        },
        messageCount: contextMsgs.length
      })
    }

    // Fallback — couldn't classify, treat as follow-up
    console.warn(`⚠️ Relay intent unclear, defaulting to follow-up`)
    // Re-run through this same handler as follow_up by overriding classification
    const memoryContext = await memoryService.buildMemoryContext(userInput)
    const userProfile = await getUserProfile()
    const memory = getConversationMemory(models)
    const persistent = getPersistentMemory(models)

    let persistentContext = ''
    let systemContext = null
    try {
      persistentContext = await persistent.buildPersistentContext(sessionId)
    } catch (err) {
      console.error('Failed to load persistent context:', err.message)
    }
    systemContext = await memory.buildContext(sessionId)

    const userContext = {
      profile: userProfile,
      sessionContext: systemContext || '',
      memoryContext: memoryContext || '',
      lastSessionSummary: persistentContext || ''
    }

    const providers = {
      mistral: mistralProvider,
      cerebras: cerebrasProvider,
      groq: groqProvider,
      cohere: cohereProvider
    }

    const relayPipeline = new RelayPipeline(providers, models, userContext)
    const result = await relayPipeline.process(
      userInput.trim(),
      sessionId,
      originalQuestion,
      originalResponse
    )

    // Update DB
    try {
      const dbMessageId = targetMessage.id
      let existingFollowups = []
      try {
        const raw = targetMessage.relay_followups
        existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
      } catch { existingFollowups = [] }

      existingFollowups.push(userInput.trim())

      await query(
        'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
        [result.output, result.model, JSON.stringify(existingFollowups), dbMessageId]
      )
    } catch (dbErr) {
      console.error('Failed to update message in DB:', dbErr.message)
    }

    return res.json({
      success: true,
      action: 'follow_up',
      output: result.output,
      model: result.model,
      targetMessageIndex: resolvedTargetIndex,
      followUpQuestion: userInput.trim(),
      metrics: result.metrics,
      orchestration: result.orchestration
    })

  } catch (error) {
    console.error('Smart relay error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
