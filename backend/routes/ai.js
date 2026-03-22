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
const { getModelsSync, loadModels } = require('../data/models')
const { addMessage, getSession } = require('../data/sessions')
const { query } = require('../data/db')
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

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities, sessionId } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    const models = await loadModels()
    const memory = getConversationMemory(models)
    const persistent = getPersistentMemory(models)

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

    // Combine all context sources (persistent context goes first)
    const fullSystemContext = persistentContext + (systemContext || '') + contextPrefix + memoryContext

    const aiRouter = new AIRouter(models)

    const selectedModel = await aiRouter.selectModel({
      strategy: strategy || 'ai-powered',
      requiredCapabilities: requiredCapabilities || ['text-generation'],
      input
    })

    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    const decision = aiRouter.explainDecision(selectedModel, strategy || 'ai-powered')
    decision.mode = 'auto'
    console.log(`🎯 Selected: ${selectedModel.name}`)

    let response

    switch (selectedModel.apiProvider) {
      case 'mistral':
        response = await mistralProvider.callModel(selectedModel, input, fullSystemContext)
        break
      case 'cerebras':
        response = await cerebrasProvider.callModel(selectedModel, input, fullSystemContext)
        break
      case 'groq':
        response = await groqProvider.callModel(selectedModel, input, fullSystemContext)
        break
      case 'cohere':
        response = await cohereProvider.callModel(selectedModel, input, fullSystemContext)
        break
      default:
        throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)
    }

    // Record messages to DB (non-blocking)
    if (sessionId) {
      await addMessage(sessionId, {role: 'user', content: input})
      await addMessage(sessionId, {role: 'assistant', content: response.output, model: selectedModel.name})
      memory.recordExchange(sessionId, input, response.output, selectedModel.name)
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

// ── Relay: Follow-Up — regenerate a response with follow-up context ──
router.post('/relay-followup', async (req, res) => {
  try {
    const {
      sessionId,
      targetMessageIndex,
      originalQuestion,
      originalResponse,
      followUpQuestion
    } = req.body

    if (!followUpQuestion || !followUpQuestion.trim()) {
      return res.status(400).json({ error: 'Follow-up question is required' })
    }
    if (!originalResponse || !originalQuestion) {
      return res.status(400).json({ error: 'Original question and response are required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)

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
    let contextPrefix = ''

    if (sessionId) {
      try {
        persistentContext = await persistent.buildPersistentContext(sessionId)
      } catch (err) {
        console.error('Failed to load persistent context:', err.message)
      }
      systemContext = await memory.buildContext(sessionId)

      const session = await getSession(sessionId)
      if (session && session.context_messages && session.context_messages.length > 0) {
        const contextBlock = session.context_messages
          .map(m => `[${m.role}]: ${m.content}`)
          .join('\n')
        contextPrefix = `\n\n[Context from a previous conversation]\n${contextBlock}\n`
      }
    }

    const memoryContext = await memoryService.buildMemoryContext(followUpQuestion)
    const fullSystemContext = persistentContext + (systemContext || '') + contextPrefix + memoryContext

    // Route to a model and call
    const aiRouter = new AIRouter(models)
    const selectedModel = await aiRouter.selectModel({
      strategy: 'ai-powered',
      requiredCapabilities: ['text-generation'],
      input: mergedInput
    })

    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    let response
    switch (selectedModel.apiProvider) {
      case 'mistral':
        response = await mistralProvider.callModel(selectedModel, mergedInput, fullSystemContext)
        break
      case 'cerebras':
        response = await cerebrasProvider.callModel(selectedModel, mergedInput, fullSystemContext)
        break
      case 'groq':
        response = await groqProvider.callModel(selectedModel, mergedInput, fullSystemContext)
        break
      case 'cohere':
        response = await cohereProvider.callModel(selectedModel, mergedInput, fullSystemContext)
        break
      default:
        throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)
    }

    // Update the original AI message in the database in-place
    if (sessionId) {
      try {
        const allMessages = await query(
          'SELECT id, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
          [sessionId]
        )

        if (allMessages[targetMessageIndex]) {
          const dbMessageId = allMessages[targetMessageIndex].id
          let existingFollowups = []
          try {
            const raw = allMessages[targetMessageIndex].relay_followups
            existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
          } catch { existingFollowups = [] }

          existingFollowups.push(followUpQuestion.trim())

          await query(
            'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
            [response.output, selectedModel.name, JSON.stringify(existingFollowups), dbMessageId]
          )
        }
      } catch (dbErr) {
        console.error('Failed to update message in DB:', dbErr.message)
      }
    }

    console.log(`🔄 Relay follow-up processed for session ${sessionId}, message index ${targetMessageIndex}`)

    res.json({
      success: true,
      output: response.output,
      model: selectedModel.name,
      targetMessageIndex,
      metrics: {
        latency: response.latency,
        cost: response.cost,
        tokensUsed: response.tokensUsed
      }
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
      originalQuestion,
      originalResponse,
      userInput
    } = req.body

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: 'User input is required' })
    }
    if (!originalResponse || !originalQuestion) {
      return res.status(400).json({ error: 'Original question and response are required' })
    }

    const models = await loadModels()
    const relay = getRelayService(models)

    // Step 1: Classify intent
    const classification = await relay.classifyIntent(
      userInput.trim(),
      originalQuestion,
      originalResponse
    )

    console.log(`🧠 Relay intent classified as: ${classification.intent}`, classification.topic || '')

    // ── FOLLOW-UP: regenerate in-place ──
    if (classification.intent === 'follow_up') {
      const mergedInput = relay.buildFollowUpPrompt(
        originalQuestion,
        originalResponse,
        userInput.trim()
      )

      const persistent = getPersistentMemory(models)
      const memory = getConversationMemory(models)

      let persistentContext = ''
      let systemContext = null
      let contextPrefix = ''

      if (sessionId) {
        try {
          persistentContext = await persistent.buildPersistentContext(sessionId)
        } catch (err) {
          console.error('Failed to load persistent context:', err.message)
        }
        systemContext = await memory.buildContext(sessionId)

        const session = await getSession(sessionId)
        if (session && session.context_messages && session.context_messages.length > 0) {
          const contextBlock = session.context_messages
            .map(m => `[${m.role}]: ${m.content}`)
            .join('\n')
          contextPrefix = `\n\n[Context from a previous conversation]\n${contextBlock}\n`
        }
      }

      const memoryContext = await memoryService.buildMemoryContext(userInput)
      const fullSystemContext = persistentContext + (systemContext || '') + contextPrefix + memoryContext

      const aiRouter = new AIRouter(models)
      const selectedModel = await aiRouter.selectModel({
        strategy: 'ai-powered',
        requiredCapabilities: ['text-generation'],
        input: mergedInput
      })

      if (!selectedModel) {
        return res.status(503).json({ error: 'No suitable model available' })
      }

      let response
      switch (selectedModel.apiProvider) {
        case 'mistral':
          response = await mistralProvider.callModel(selectedModel, mergedInput, fullSystemContext)
          break
        case 'cerebras':
          response = await cerebrasProvider.callModel(selectedModel, mergedInput, fullSystemContext)
          break
        case 'groq':
          response = await groqProvider.callModel(selectedModel, mergedInput, fullSystemContext)
          break
        case 'cohere':
          response = await cohereProvider.callModel(selectedModel, mergedInput, fullSystemContext)
          break
        default:
          throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)
      }

      // Update DB in-place
      if (sessionId) {
        try {
          const allMessages = await query(
            'SELECT id, relay_followups FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
            [sessionId]
          )

          if (allMessages[targetMessageIndex]) {
            const dbMessageId = allMessages[targetMessageIndex].id
            let existingFollowups = []
            try {
              const raw = allMessages[targetMessageIndex].relay_followups
              existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
            } catch { existingFollowups = [] }

            existingFollowups.push(userInput.trim())

            await query(
              'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
              [response.output, selectedModel.name, JSON.stringify(existingFollowups), dbMessageId]
            )
          }
        } catch (dbErr) {
          console.error('Failed to update message in DB:', dbErr.message)
        }
      }

      console.log(`🔄 Relay follow-up processed for session ${sessionId}`)

      return res.json({
        success: true,
        action: 'follow_up',
        output: response.output,
        model: selectedModel.name,
        targetMessageIndex
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

    // Fallback — treat as follow-up
    return res.status(400).json({ error: 'Could not determine intent' })

  } catch (error) {
    console.error('Smart relay error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
