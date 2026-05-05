/**
 * routes/ai/process.js
 * POST /api/ai/process
 *
 * Main AI request handler.  Routes to one of two paths:
 *   1. Hive Orchestrator  — default, AI-powered, multi-model pipeline
 *   2. Legacy AIRouter    — used only when an explicit non-hive strategy is passed
 *
 * Both paths load full conversational context before calling any model.
 */

const express = require('express')
const router  = express.Router()

const {
  providers,
  getConversationMemory,
  loadModels, addMessage,
  AIRouter, HiveOrchestrator,
  logOrchestration, autoTitleSession,
  buildConversationHistory, buildFullSystemContext, buildUserContext,
  mistralProvider, cerebrasProvider, groqProvider, cohereProvider,
} = require('./shared')

// POST /api/ai/process
router.post('/', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities, sessionId, mode, modelId } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    const models              = await loadModels()
    const conversationHistory = await buildConversationHistory(sessionId)
    const fullSystemContext   = await buildFullSystemContext(models, sessionId, input)
    const userContext         = await buildUserContext(models, sessionId, input)
    const memory              = getConversationMemory(models)

    // ── Direct model call (user picked a specific model) ─────────────────
    if (modelId) {
      const chosenModel = models.find(m => m.id === Number(modelId))

      if (chosenModel) {
        const providerMap = { mistral: mistralProvider, cerebras: cerebrasProvider, groq: groqProvider, cohere: cohereProvider }
        const provider    = providerMap[chosenModel.apiProvider]

        if (provider) {
          console.log(`🎯 Direct model call: ${chosenModel.name} (user-selected)`)
          const response = await provider.callModel(chosenModel, input, fullSystemContext, conversationHistory)

          if (sessionId) {
            await addMessage(sessionId, { role: 'user', content: input })
            await addMessage(sessionId, { role: 'assistant', content: response.output, model: chosenModel.name })
            memory.recordExchange(sessionId, input, response.output, chosenModel.name)
            autoTitleSession(sessionId, input).catch(() => {})
          }

          return res.json({
            success:  true,
            input,
            output:   response.output,
            model:    chosenModel.name,
            provider: chosenModel.provider,
            decision: {
              model:  chosenModel.name,
              reason: 'User selected this model directly',
              mode:   'direct',
            },
            metrics: {
              latency:    response.latency,
              cost:       response.cost,
              tokensUsed: response.tokensUsed,
            },
          })
        }
      }
      // If model/provider not found, fall through to auto-routing
      console.warn(`⚠️ Model id=${modelId} not found or provider unavailable, falling back to auto-routing`)
    }

    // ── Hive Orchestrator (default) ───────────────────────────────────────
    const useHive = !strategy || strategy === 'ai-powered' || strategy === 'orchestrated'

    if (useHive) {
      const hive   = new HiveOrchestrator(providers, models, userContext)
      const result = await hive.process(input, fullSystemContext, conversationHistory, mode === 'hive')

      if (sessionId) {
        await addMessage(sessionId, { role: 'user',      content: input })
        await addMessage(sessionId, {
          role: 'assistant', content: result.output, model: result.model,
          orchestration: result.orchestration || null,
          metrics:       result.metrics       || null,
        })
        memory.recordExchange(sessionId, input, result.output, result.model)
        autoTitleSession(sessionId, input).catch(() => {})
        logOrchestration(hive.buildLogEntry(sessionId, input, result)).catch(() => {})
      }

      return res.json({
        success: true,
        input,
        output:        result.output,
        model:         result.model,
        provider:      result.provider,
        decision:      result.decision,
        metrics:       result.metrics,
        orchestration: result.orchestration,
      })
    }

    // ── Legacy AIRouter (explicit strategy) ───────────────────────────────
    const aiRouter     = new AIRouter(models)
    const selectedModel = await aiRouter.selectModel({
      strategy:             strategy || 'balanced',
      requiredCapabilities: requiredCapabilities || ['text-generation'],
      input,
    })

    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    const decision  = aiRouter.explainDecision(selectedModel, strategy || 'balanced')
    decision.mode   = 'legacy'
    console.log(`🎯 Legacy selected: ${selectedModel.name}`)

    const providerMap = { mistral: mistralProvider, cerebras: cerebrasProvider, groq: groqProvider, cohere: cohereProvider }
    const provider    = providerMap[selectedModel.apiProvider]
    if (!provider) throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)

    const response = await provider.callModel(selectedModel, input, fullSystemContext, conversationHistory)

    if (sessionId) {
      await addMessage(sessionId, { role: 'user',      content: input })
      await addMessage(sessionId, { role: 'assistant', content: response.output, model: selectedModel.name })
      memory.recordExchange(sessionId, input, response.output, selectedModel.name)
      autoTitleSession(sessionId, input).catch(() => {})
    }

    res.json({
      success:  true,
      input,
      output:   response.output,
      model:    selectedModel.name,
      provider: selectedModel.provider,
      decision,
      metrics: {
        latency:    response.latency,
        cost:       response.cost,
        tokensUsed: response.tokensUsed,
      },
    })

  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
