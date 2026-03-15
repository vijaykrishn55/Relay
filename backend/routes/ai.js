const express = require('express')
const router = express.Router()
const AIRouter = require('../services/router')
const MistralProvider = require('../services/mistralProvider')
const CerebrasProvider = require('../services/cerebrasProvider')
const GroqProvider = require('../services/groqProvider')
const CohereProvider = require('../services/cohereProvider')
const ConversationMemory = require('../services/conversationMemory')
const { getModelsSync, loadModels } = require('../data/models')
const { addMessage, getSession } = require('../data/sessions')
const memoryService = require('../services/memoryService')

const mistralProvider = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider = new GroqProvider()
const cohereProvider = new CohereProvider()

// Lazy-init: routerModel resolved at first request
let conversationMemory = null

function getConversationMemory(models) {
  if (!conversationMemory) {
    const routerModel = models.find(m => m.id === 9)
    conversationMemory = new ConversationMemory(groqProvider, routerModel)
  }
  return conversationMemory
}

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities, sessionId } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    const models = await loadModels()
    const memory = getConversationMemory(models)

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

    // Combine all context sources
    const fullSystemContext = (systemContext || '') + contextPrefix + memoryContext

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

module.exports = router
