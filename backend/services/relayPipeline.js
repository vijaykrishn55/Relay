/**
 * Relay Pipeline — Phase 8: User Intelligence
 *
 * Dedicated orchestration pipeline for Relay mode.
 * Only runs when the user has explicitly activated Relay.
 *
 * Pipeline steps:
 *   1. Context Builder   — Attach previous Q&A, session summary, profile
 *   2. Triage            — Simple vs Complex classification
 *   3. Sentiment Analysis — Heuristic-first, AI-fallback
 *   4. Clarification     — Context-aware ambiguity check
 *   5. Model Orchestration:
 *      - Fast: single model call with rich context (simple follow-ups)
 *      - Full: decompose → strategy → execute → assemble (complex)
 *   6. Engagement Layer  — Follow-up questions, warmth
 */

const ContextBuilder = require('./contextBuilder')
const SentimentService = require('./sentimentService')
const ClarificationService = require('./clarificationService')
const HiveOrchestrator = require('./hiveOrchestrator')
const { selectBestModel } = require('./scoreMatcher')
const { buildPersonaPrompt, buildFollowUpInstructions } = require('./systemPersona')
const rateLimiter = require('../utils/rateLimiter')

class RelayPipeline {
  /**
   * @param {object}   providers   - { mistral, cerebras, groq, cohere }
   * @param {object[]} models      - Runtime models array
   * @param {object}   userContext - { profile, sessionContext, memoryContext, lastSessionSummary }
   */
  constructor(providers, models, userContext = {}) {
    this.providers = providers
    this.models = models
    this.userContext = userContext

    this.contextBuilder = new ContextBuilder()

    // Use Compound Mini (id=9) for sentiment/clarification
    const compoundMini = models.find(m => m.id === 9 && m.status === 'active')
    const groqProvider = providers.groq

    this.sentimentService = new SentimentService(groqProvider, compoundMini)
    this.clarificationService = new ClarificationService(groqProvider, compoundMini)
  }

  /**
   * Process a user message through the Relay pipeline.
   *
   * @param {string} userQuestion     - The user's message
   * @param {string} sessionId        - Session ID for context lookup
   * @param {string} originalQuestion - (For follow-ups) The original question
   * @param {string} originalResponse - (For follow-ups) The original AI response
   * @returns {{ output, model, orchestration, metrics }}
   */
  async process(userQuestion, sessionId, originalQuestion = null, originalResponse = null) {
    const pipelineStart = Date.now()

    console.log(`\n🔀 ════════════════════════════════════════════════`)
    console.log(`🔀 RELAY PIPELINE — Processing: "${userQuestion.substring(0, 80)}..."`)
    console.log(`🔀 ════════════════════════════════════════════════\n`)

    try {
      // ═══════════════════════════════════════════════
      // STEP 1: CONTEXT BUILDER — Attach rich context
      // ═══════════════════════════════════════════════
      console.log(`📦 Step 1: Context Builder...`)
      const contextResult = await this.contextBuilder.build(
        sessionId,
        this.userContext.profile,
        this.userContext.memoryContext || ''
      )

      // Merge with original Q&A if this is a follow-up
      let fullContext = contextResult.contextString
      if (originalQuestion && originalResponse) {
        const followUpContext = `\nIMMEDIATE PREVIOUS EXCHANGE:\nUser asked: "${originalQuestion}"\nAI responded: ${originalResponse.substring(0, 3000)}\n`
        fullContext = followUpContext + '\n' + fullContext
      }

      console.log(`   → Context built: ${fullContext.length} chars across ${Object.values(contextResult.layers).filter(l => l).length} layers`)

      // ═══════════════════════════════════════════════
      // STEP 2: SENTIMENT ANALYSIS (heuristic-first)
      // ═══════════════════════════════════════════════
      console.log(`😊 Step 2: Sentiment Analysis...`)
      const sentiment = await this.sentimentService.analyze(userQuestion)
      this.userContext.sentiment = sentiment
      console.log(`   → Sentiment: ${sentiment.sentiment} (${sentiment.intensity}, ${sentiment.method})`)

      // Record sentiment (non-blocking)
      this.sentimentService.recordSentiment(sentiment).catch(err => {
        console.error(`⚠️ Failed to record sentiment: ${err.message}`)
      })

      // ═══════════════════════════════════════════════
      // STEP 3: CLARIFICATION CHECK (context-aware)
      // ═══════════════════════════════════════════════
      console.log(`❓ Step 3: Context-Aware Clarification Check...`)

      // Build conversation history for context-aware checking
      const conversationHistory = originalResponse
        ? [{ role: 'assistant', content: originalResponse }]
        : []

      const clarification = await this.clarificationService.checkWithContext
        ? await this.clarificationService.checkWithContext(userQuestion, conversationHistory, this.userContext.profile)
        : await this.clarificationService.check(userQuestion, this.userContext.profile)

      if (clarification.needsClarification && clarification.confidence >= 0.80) {
        console.log(`   → Needs clarification: ${clarification.reason}`)
        const clarificationMessage = this.clarificationService.formatClarificationMessage(
          clarification, userQuestion
        )
        return {
          output: clarificationMessage,
          model: 'clarification-check',
          provider: 'system',
          decision: { model: 'clarification-check', reason: clarification.reason, mode: 'relay-clarification' },
          metrics: { latency: Date.now() - pipelineStart, pipelineLatency: Date.now() - pipelineStart, cost: '0.0000', tokensUsed: 0 },
          orchestration: { mode: 'relay-clarification', sentiment, clarification, phases: ['context', 'sentiment', 'clarification'] }
        }
      }
      console.log(`   → Question clear (confidence: ${(clarification.confidence * 100).toFixed(0)}%)`)

      // ═══════════════════════════════════════════════
      // STEP 4: TRIAGE — Fast path or Full pipeline?
      // ═══════════════════════════════════════════════
      const isSimpleFollowUp = this._isSimpleFollowUp(userQuestion, originalResponse)

      if (isSimpleFollowUp) {
        console.log(`⚡ Step 4: Simple follow-up → Fast path`)
        return await this._fastPath(userQuestion, fullContext, sentiment, pipelineStart)
      }

      console.log(`🧩 Step 4: Complex question → Full Hive Mind pipeline`)
      return await this._fullPipeline(userQuestion, fullContext, sentiment, pipelineStart)

    } catch (error) {
      console.error(`❌ Relay pipeline error: ${error.message}`)
      return await this._fallback(userQuestion, pipelineStart, error)
    }
  }

  /**
   * Determine if a question is a simple follow-up.
   * Simple = short, references previous response, no multi-part complexity.
   * @private
   */
  _isSimpleFollowUp(question, previousResponse) {
    if (!previousResponse) return false

    const wordCount = question.trim().split(/\s+/).length

    // If very short (≤10 words), likely a follow-up
    if (wordCount <= 10) return true

    // If it contains "and" or "compare" or "vs" → complex
    if (/\b(compare|vs|versus|analyze|breakdown)\b/i.test(question)) return false

    // If medium length (≤25 words) and doesn't ask for multiple things → simple
    if (wordCount <= 25 && !question.includes(' and ')) return true

    return false
  }

  /**
   * Fast path: Single model call with rich context.
   * For simple follow-ups in Relay mode.
   * @private
   */
  async _fastPath(userQuestion, context, sentiment, pipelineStart) {
    // Score-match for best specialist
    const defaultScores = {
      reasoning: 0.7, code: 0.5, creativity: 0.5,
      speed: 0.6, multilingual: 0.3, analysis: 0.6,
      instruction: 0.8, knowledge: 0.7
    }
    const match = selectBestModel(defaultScores, this.models, 'specialist')

    if (!match) {
      return this._fallback(userQuestion, pipelineStart, new Error('No models available'))
    }

    const model = match.model
    const provider = this._getProvider(model)

    console.log(`🎯 Relay fast path: ${model.name}`)

    // Build persona-enhanced prompt with engagement guidelines
    const personaPrompt = buildPersonaPrompt(this.userContext.profile || {}, sentiment || {})
    const followUpGuide = buildFollowUpInstructions('general')

    const enhancedContext = `${personaPrompt}

ENGAGEMENT GUIDELINES:
- End with 1-2 natural follow-up questions when appropriate
- Frame questions conversationally: "Would you like me to..." not "Options:"
- Skip follow-ups if the answer is already complete and self-contained
- Match the user's communication style

${followUpGuide}

${context}`

    rateLimiter.record(model.id)
    const response = await provider.callModel(model, userQuestion, enhancedContext)

    if (!response.output || response.output.trim() === '') {
      return this._fallback(userQuestion, pipelineStart, new Error('Model returned empty'))
    }

    const totalLatency = Date.now() - pipelineStart

    return {
      output: response.output,
      model: model.name,
      provider: model.provider,
      decision: { model: model.name, reason: `Relay fast-path: ${match.reason}`, mode: 'relay-fast' },
      metrics: { latency: response.latency, pipelineLatency: totalLatency, cost: response.cost, tokensUsed: response.tokensUsed },
      orchestration: {
        mode: 'relay-fast',
        isComplex: false,
        sentiment,
        modelsUsed: [model.name],
        phases: ['context', 'sentiment', 'clarification', 'fast-path'],
        contextLayers: { chars: context.length }
      }
    }
  }

  /**
   * Full pipeline: Route through HiveOrchestrator for complex Relay questions.
   * @private
   */
  async _fullPipeline(userQuestion, context, sentiment, pipelineStart) {
    // Create a HiveOrchestrator with the enriched user context
    const enrichedContext = { ...this.userContext, sentiment }

    const hive = new HiveOrchestrator(this.providers, this.models, enrichedContext)
    const result = await hive.process(userQuestion, context)

    // Enhance orchestration metadata
    result.orchestration = {
      ...result.orchestration,
      mode: 'relay-full',
      phases: ['context', 'sentiment', 'clarification', ...( result.orchestration?.phases || [] )],
      contextLayers: { chars: context.length }
    }
    result.decision.mode = 'relay-full'
    result.metrics.pipelineLatency = Date.now() - pipelineStart

    return result
  }

  /**
   * Fallback: Direct model call when pipeline fails.
   * @private
   */
  async _fallback(userQuestion, pipelineStart, error) {
    console.error(`🆘 Relay fallback triggered: ${error.message}`)

    const preferredOrder = [8, 11, 4, 3, 2, 10, 12, 7, 5, 6]

    for (const modelId of preferredOrder) {
      const model = this.models.find(m => m.id === modelId && m.status === 'active')
      if (!model) continue

      const provider = this._getProvider(model)
      if (!provider) continue

      try {
        rateLimiter.record(model.id)
        const response = await provider.callModel(model, userQuestion)

        return {
          output: response.output,
          model: model.name,
          provider: model.provider,
          decision: { model: model.name, reason: `Relay fallback: ${error.message}`, mode: 'relay-fallback' },
          metrics: { latency: response.latency, pipelineLatency: Date.now() - pipelineStart, cost: response.cost, tokensUsed: response.tokensUsed },
          orchestration: { mode: 'relay-fallback', modelsUsed: [model.name], phases: ['fallback'], error: error.message }
        }
      } catch (modelError) {
        console.error(`❌ Relay fallback model ${model.name} failed: ${modelError.message}`)
        continue
      }
    }

    throw new Error('All models failed in Relay pipeline — no response could be generated')
  }

  // ── Private helpers ──
  _getProvider(model) {
    const providerMap = {
      mistral: this.providers.mistral,
      cerebras: this.providers.cerebras,
      groq: this.providers.groq,
      cohere: this.providers.cohere
    }
    return providerMap[model.apiProvider]
  }
}

module.exports = RelayPipeline
