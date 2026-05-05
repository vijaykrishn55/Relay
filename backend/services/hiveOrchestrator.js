/**
 * Hive Orchestrator: Hive Mind
 * Enhanced in: Conversational Intelligence
 *
 * Main entry point for multi-model question processing.
 * Coordinates the enhanced 7-phase pipeline:
 *   Phase -1: Sentiment Analysis
 *   Phase 0: Triage
 *   Phase 1: Decompose
 *   Phase 2: Strategize
 *   Phase 3: Execute
 *   Phase 4: Assemble
 *
 * Falls back to fast-path single-model routing for simple questions.
 */

const DecomposerService = require('./decomposerService')
const StrategistService = require('./strategistService')
const ExecutorService = require('./executorService')
const AssemblerService = require('./assemblerService')
const SentimentService = require('./sentimentService')
const ClarificationService = require('./clarificationService')
const { selectBestModel } = require('./scoreMatcher')
const { buildPersonaPrompt } = require('./systemPersona')
const rateLimiter = require('../utils/rateLimiter')

class HiveOrchestrator {
  /**
   * @param {object}   providers   - { mistral, cerebras, groq, cohere }
   * @param {object[]} models      - Runtime models array (from loadModels)
   * @param {object}   userContext - { profile, sessionContext, memoryContext, lastSessionSummary }
   */
  constructor(providers, models, userContext = {}) {
    this.providers = providers
    this.models = models
    this.userContext = userContext

    this.decomposer = new DecomposerService(providers, models)
    this.strategist = new StrategistService(providers, models)
    this.executor = new ExecutorService(providers, models)
    this.assembler = new AssemblerService(providers, models)

    // Initialize sentiment and clarification services
    // Use Compound Mini (id=9) for fast sentiment/clarification checks
    const compoundMini = models.find(m => m.id === 9 && m.status === 'active')
    const groqProvider = providers.groq

    this.sentimentService = new SentimentService(groqProvider, compoundMini)
    this.clarificationService = new ClarificationService(groqProvider, compoundMini)
  }

  /**
   * Process a user question through the Hive Mind pipeline.
   * Automatically decides between fast-path and full orchestration.
   * Enhanced with sentiment and clarification checks.
   *
   * @param {string} userQuestion
   * @param {string} systemContext - Combined system context from session/memory
   * @param {Array} conversationHistory - Recent in-session messages [{role, content}]
   * @param {boolean} forceHive - Force full pipeline (skip triage fast-path)
   * @returns {{ output, model, orchestration, metrics }}
   */
  async process(userQuestion, systemContext = null, conversationHistory = [], forceHive = false) {
    this._conversationHistory = conversationHistory
    const pipelineStart = Date.now()

    console.log(`\n🐝 ════════════════════════════════════════════════`)
    console.log(`🐝 HIVE MIND — Processing: "${userQuestion.substring(0, 80)}..."`)
    console.log(`🐝 ════════════════════════════════════════════════\n`)

    try {
      // ═══════════════════════════════════════════════
      // PHASE -1: SENTIMENT ANALYSIS (lightweight, ~50ms)
      // ═══════════════════════════════════════════════
      console.log(`😊 Phase -1: Sentiment Analysis...`)
      const sentiment = await this.sentimentService.analyze(userQuestion)
      this.userContext.sentiment = sentiment
      console.log(`   → Sentiment: ${sentiment.sentiment} (${sentiment.intensity}, confidence: ${(sentiment.confidence * 100).toFixed(0)}%)`)

      // Record sentiment for trend tracking (non-blocking)
      this.sentimentService.recordSentiment(sentiment).catch(err => {
        console.error(`⚠️ Failed to record sentiment: ${err.message}`)
      })

      // ═══════════════════════════════════════════════
      // PHASE 0: TRIAGE — Decide simple vs complex
      // ═══════════════════════════════════════════════
      console.log(`📋 Phase 0: Triage...`)
      const triage = await this.decomposer.triage(userQuestion)

      // Normal Mode (`!forceHive`): Always use a single model (Fast Path).
      // We still use the triage result to pick the *best* single model.
      if (!forceHive) {
        console.log(`⚡ Fast path (Normal Mode): Using best single model (${triage.reason})`)
        return await this._fastPath(userQuestion, triage, systemContext, pipelineStart, sentiment)
      }

      // Hive Mode (`forceHive`): Use Fast Path if simple, Full Pipeline if complex.
      if (!triage.isComplex) {
        console.log(`⚡ Fast path (Hive Mode): Question is simple (${triage.reason})`)
        return await this._fastPath(userQuestion, triage, systemContext, pipelineStart, sentiment)
      }

      console.log(`🧩 Complex path (Hive Mode): User requested and triage confirmed complex (${triage.reason})`)
      return await this._fullPipeline(userQuestion, triage, systemContext, pipelineStart, sentiment)

    } catch (error) {
      console.error(`❌ Hive Mind pipeline error: ${error.message}`)
      // Ultimate fallback: pick any model and call it directly
      return await this._ultimateFallback(userQuestion, systemContext, pipelineStart, error)
    }
  }

  /**
   * Fast path: Single model call based on score matching.
   * Used for simple, single-intent questions.
   * Enhanced with persona injection.
   * @private
   */
  async _fastPath(userQuestion, triage, systemContext, pipelineStart, sentiment = null) {
    // Score-match to find the best specialist (never Compound Mini for answers)
    const match = selectBestModel(triage.questionScores, this.models, 'specialist')
    if (!match) {
      return this._ultimateFallback(userQuestion, systemContext, pipelineStart, new Error('No models available'))
    }

    const model = match.model
    const provider = this._getProvider(model)

    console.log(`🎯 Fast path selected: ${model.name} (${(match.score * 100).toFixed(0)}% match)`)

    // Build persona-enhanced system context
    // NOTE: Do NOT inject buildFollowUpInstructions here.
    // Follow-up question prompting is a Relay-only feature.
    // Normal mode should just answer the question cleanly.
    const personaPrompt = buildPersonaPrompt(this.userContext.profile || {}, sentiment || {})

    const enhancedContext = `${personaPrompt}

${systemContext || ''}`

    rateLimiter.record(model.id)
    const response = await provider.callModel(model, userQuestion, enhancedContext, this._conversationHistory || [])

    // Validate response has content
    if (!response.output || response.output.trim() === '') {
      console.error(`⚠️ Fast path: ${model.name} returned empty response, trying fallback`)
      return this._ultimateFallback(userQuestion, systemContext, pipelineStart, new Error('Model returned empty response'))
    }

    const totalLatency = Date.now() - pipelineStart

    return {
      output: response.output,
      model: model.name,
      provider: model.provider,
      decision: {
        model: model.name,
        reason: `Score-matched: ${match.reason}`,
        mode: 'hive-fast'
      },
      metrics: {
        latency: response.latency,
        pipelineLatency: totalLatency,
        cost: response.cost,
        tokensUsed: response.tokensUsed
      },
      orchestration: {
        mode: 'fast-path',
        isComplex: false,
        triageReason: triage.reason,
        questionScores: triage.questionScores,
        primaryType: triage.primaryType,
        sentiment: sentiment,
        modelsUsed: [model.name],
        phases: ['sentiment', 'clarification', 'triage', 'fast-path']
      }
    }
  }

  /**
   * Full pipeline: Multi-model orchestration for complex questions.
   * Enhanced with sentiment awareness.
   * @private
   */
  async _fullPipeline(userQuestion, triage, systemContext, pipelineStart, sentiment = null) {
    const phaseSummaries = {}
    const allModelsUsed = new Set()
    allModelsUsed.add(triage.triageModel)

    // ═══════════════════════════════════════════════
    // PHASE 1: DECOMPOSITION — Break into sub-tasks
    // ═══════════════════════════════════════════════
    console.log(`\n🔨 Phase 1: Decomposition...`)
    const decomposition = await this.decomposer.decompose(userQuestion, triage)
    phaseSummaries.decomposition = this.decomposer.buildPhaseSummary(decomposition)
    decomposition.modelsUsed.forEach(m => allModelsUsed.add(m))

    console.log(`   → ${decomposition.subtasks.length} subtasks: ${decomposition.subtasks.map(s => s.type).join(', ')}`)

    // If decomposition produced only 1 subtask, use fast path instead
    if (decomposition.subtasks.length <= 1) {
      console.log(`   → Only 1 subtask, redirecting to fast path`)
      return await this._fastPath(userQuestion, triage, systemContext, pipelineStart, sentiment)
    }

    // ═══════════════════════════════════════════════
    // PHASE 2: STRATEGY — Assign models + craft prompts
    // ═══════════════════════════════════════════════
    console.log(`\n📊 Phase 2: Strategy...`)
    const strategyResult = await this.strategist.planStrategies(decomposition, userQuestion, this.userContext)
    phaseSummaries.strategy = this.strategist.buildPhaseSummary(strategyResult)
    strategyResult.modelsUsed.forEach(m => allModelsUsed.add(m))

    console.log(`   → Assignments: ${strategyResult.strategies.map(s => `${s.subtaskId}→${s.selectedModelName}`).join(', ')}`)

    // ═══════════════════════════════════════════════
    // PHASE 3: EXECUTION — Call specialist models
    // ═══════════════════════════════════════════════
    console.log(`\n🚀 Phase 3: Execution...`)
    const executionResult = await this.executor.execute(strategyResult.strategies, decomposition, systemContext)
    phaseSummaries.execution = this.executor.buildPhaseSummary(executionResult)
    executionResult.modelsUsed.forEach(m => allModelsUsed.add(m))

    const successCount = Object.values(executionResult.results).filter(r => r.status === 'success').length
    console.log(`   → ${successCount}/${decomposition.subtasks.length} succeeded, ${executionResult.failedSubtasks.length} failed`)

    // ═══════════════════════════════════════════════
    // PHASE 4: ASSEMBLY — Model F combines everything
    // ═══════════════════════════════════════════════
    console.log(`\n🎨 Phase 4: Assembly...`)
    const assemblyResult = await this.assembler.assemble(
      userQuestion, decomposition, strategyResult, executionResult, this.userContext, phaseSummaries
    )

    // Validate assembly result has content
    if (!assemblyResult.output || assemblyResult.output.trim() === '') {
      console.error(`⚠️ Assembly returned empty output, using concatenation fallback`)
      // Build a fallback response from execution results
      const fallbackParts = decomposition.subtasks.map(st => {
        const result = executionResult.results[st.id]
        if (!result || result.status === 'failed' || !result.output) {
          return `## ${st.description}\n\n*This section could not be generated.*`
        }
        return result.output
      }).filter(p => p && p.trim())

      if (fallbackParts.length > 0) {
        assemblyResult.output = fallbackParts.join('\n\n---\n\n')
        assemblyResult.model = 'concatenation-fallback'
      } else {
        // Even concatenation failed — use ultimate fallback
        return this._ultimateFallback(userQuestion, systemContext, pipelineStart, new Error('Assembly produced empty output'))
      }
    }

    allModelsUsed.add(assemblyResult.model)

    const totalLatency = Date.now() - pipelineStart

    // Calculate total tokens
    let totalTokens = 0
    for (const result of Object.values(executionResult.results)) {
      totalTokens += result.tokensUsed || 0
    }
    totalTokens += assemblyResult.tokensUsed || 0

    console.log(`\n🐝 ════════════════════════════════════════════════`)
    console.log(`🐝 HIVE MIND COMPLETE — ${totalLatency}ms, ${allModelsUsed.size} models`)
    console.log(`🐝 ════════════════════════════════════════════════\n`)

    return {
      output: assemblyResult.output,
      model: assemblyResult.model,
      provider: this.models.find(m => m.name === assemblyResult.model)?.provider || 'unknown',
      decision: {
        model: assemblyResult.model,
        reason: `Hive Mind orchestration: ${decomposition.subtasks.length} subtasks across ${allModelsUsed.size} models`,
        mode: 'hive-full'
      },
      metrics: {
        latency: assemblyResult.latency,
        pipelineLatency: totalLatency,
        cost: '0.0000',
        tokensUsed: totalTokens
      },
      orchestration: {
        mode: 'full-pipeline',
        isComplex: true,
        triageReason: triage.reason,
        questionScores: triage.questionScores,
        primaryType: triage.primaryType,
        sentiment: sentiment,
        subtasks: decomposition.subtasks.map(st => ({
          id: st.id,
          type: st.type,
          description: st.description,
          model: strategyResult.strategies.find(s => s.subtaskId === st.id)?.selectedModelName,
          status: executionResult.results[st.id]?.status || 'unknown'
        })),
        modelsUsed: [...allModelsUsed],
        phases: ['sentiment', 'clarification', 'triage', 'decomposition', 'strategy', 'execution', 'assembly'],
        phaseSummaries,
        decompositionTurns: decomposition.turns,
        strategyTurns: strategyResult.turns,
        executionBatches: Object.keys(executionResult.results).length,
        failedSubtasks: executionResult.failedSubtasks,
        assemblerModel: assemblyResult.model
      }
    }
  }

  /**
   * Ultimate fallback: Direct call to any available model.
   * Used when the entire pipeline fails.
   * @private
   */
  async _ultimateFallback(userQuestion, systemContext, pipelineStart, error) {
    console.error(`🆘 Ultimate fallback triggered: ${error.message}`)

    // Try models in order of quality
    const preferredOrder = [8, 11, 4, 3, 2, 10, 12, 7, 5, 6]

    for (const modelId of preferredOrder) {
      const model = this.models.find(m => m.id === modelId && m.status === 'active')
      if (!model) continue

      const provider = this._getProvider(model)
      if (!provider) continue

      try {
        rateLimiter.record(model.id)
        const response = await provider.callModel(model, userQuestion, systemContext, this._conversationHistory || [])

        return {
          output: response.output,
          model: model.name,
          provider: model.provider,
          decision: {
            model: model.name,
            reason: `Emergency fallback due to pipeline error: ${error.message}`,
            mode: 'hive-fallback'
          },
          metrics: {
            latency: response.latency,
            pipelineLatency: Date.now() - pipelineStart,
            cost: response.cost,
            tokensUsed: response.tokensUsed
          },
          orchestration: {
            mode: 'fallback',
            isComplex: false,
            modelsUsed: [model.name],
            phases: ['fallback'],
            error: error.message
          }
        }
      } catch (modelError) {
        console.error(`❌ Fallback model ${model.name} also failed: ${modelError.message}`)
        continue
      }
    }

    throw new Error('All models failed — no response could be generated')
  }

  /**
   * Build the orchestration log entry for database storage.
   */
  buildLogEntry(sessionId, userQuestion, result) {
    return {
      sessionId,
      userQuestion,
      isComplex: result.orchestration?.isComplex || false,
      triageScores: result.orchestration?.questionScores || null,
      decomposition: result.orchestration?.subtasks || null,
      strategies: result.orchestration?.phaseSummaries?.strategy || null,
      executionResults: result.orchestration?.phaseSummaries?.execution || null,
      modelsUsed: result.orchestration?.modelsUsed || [result.model],
      totalLatency: result.metrics?.pipelineLatency || 0,
      totalTokens: result.metrics?.tokensUsed || 0,
      status: result.orchestration?.failedSubtasks?.length > 0 ? 'partial'
        : result.orchestration?.mode === 'fallback' ? 'fallback'
        : 'success'
    }
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

module.exports = HiveOrchestrator
