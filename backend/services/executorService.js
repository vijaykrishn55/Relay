/**
 * Executor Service : Hive Mind 
 * 
 * Executes sub-tasks on specialist models in parallel (respecting dependencies).
 * Handles retries, fallbacks, and rate-limit-aware model switching.
 */

const { selectTopModels } = require('./scoreMatcher')
const rateLimiter = require('../utils/rateLimiter')

class ExecutorService {
  /**
   * @param {object} providers - Map of provider name → provider instance
   * @param {object[]} models   - Runtime models array
   */
  constructor(providers, models) {
    this.providers = providers
    this.models = models
  }

  /**
   * Execute all sub-tasks according to the strategy, respecting dependencies.
   * 
   * @param {Array}  strategies    -  output (model + prompt per sub-task)
   * @param {object} decomposition -  output (sub-task definitions)
   * @param {string} systemContext - Combined system context for all calls
   * @returns {{ results: object, modelsUsed: string[], totalLatency: number, failedSubtasks: string[] }}
   */
  async execute(strategies, decomposition, systemContext = null) {
    const startTime = Date.now()
    const results = {}         // subtaskId → { output, model, latency, tokensUsed, status }
    const failedSubtasks = []
    const modelsUsed = new Set()

    // Build dependency graph and get execution order
    const batches = this._buildExecutionBatches(decomposition.subtasks)

    console.log(`🚀 Executor: ${decomposition.subtasks.length} subtasks in ${batches.length} batches`)

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      console.log(`📦 Batch ${batchIdx + 1}/${batches.length}: [${batch.join(', ')}]`)

      // Execute batch in parallel
      const batchPromises = batch.map(async (subtaskId) => {
        const strategy = strategies.find(s => s.subtaskId === subtaskId)
        const subtask = decomposition.subtasks.find(s => s.id === subtaskId)

        if (!strategy || !subtask) {
          console.error(`❌ No strategy found for subtask ${subtaskId}`)
          failedSubtasks.push(subtaskId)
          return
        }

        // Inject dependency outputs into the prompt
        let finalPrompt = strategy.prompt
        if (subtask.dependencies && subtask.dependencies.length > 0) {
          const depContext = subtask.dependencies
            .filter(depId => results[depId] && results[depId].status === 'success')
            .map(depId => `[Context from previous part "${depId}"]:\n${results[depId].output}`)
            .join('\n\n---\n\n')

          if (depContext) {
            finalPrompt = `${finalPrompt}\n\n${depContext}`
          }
        }

        // Execute with retry and fallback
        const result = await this._executeWithFallback(
          strategy.selectedModelId,
          subtask,
          finalPrompt,
          systemContext
        )

        results[subtaskId] = result
        modelsUsed.add(result.model)

        if (result.status === 'failed') {
          failedSubtasks.push(subtaskId)
        }
      })

      await Promise.all(batchPromises)
    }

    const totalLatency = Date.now() - startTime
    console.log(`✅ Execution complete: ${Object.keys(results).length} results, ${failedSubtasks.length} failures, ${totalLatency}ms total`)

    return {
      results,
      modelsUsed: [...modelsUsed],
      totalLatency,
      failedSubtasks
    }
  }

  /**
   * Execute a sub-task with retry and model fallback.
   * @private
   */
  async _executeWithFallback(primaryModelId, subtask, prompt, systemContext) {
    // Try primary model
    const primaryResult = await this._tryModel(primaryModelId, prompt, systemContext)
    if (primaryResult.status === 'success') return primaryResult

    console.log(`⚠️ Primary model (id=${primaryModelId}) failed for ${subtask.id}, trying fallback...`)

    // Get fallback models (top 3 by score, excluding primary and Compound Mini)
    const fallbacks = selectTopModels(subtask.scores, this.models, 'specialist', 3)
      .filter(f => f.model.id !== primaryModelId && f.model.id !== 9)

    for (const fallback of fallbacks) {
      console.log(`🔄 Fallback: trying ${fallback.model.name} for ${subtask.id}`)
      const result = await this._tryModel(fallback.model.id, prompt, systemContext)
      if (result.status === 'success') return result
    }

    // All models failed — return error result
    console.error(`❌ All models failed for subtask ${subtask.id}`)
    return {
      output: `[This section could not be generated due to a temporary error. The question was: ${subtask.description}]`,
      model: 'none',
      modelId: 0,
      latency: 0,
      tokensUsed: 0,
      status: 'failed',
      error: 'All models failed'
    }
  }

  /**
   * Try calling a specific model. Returns result with status.
   * @private
   */
  async _tryModel(modelId, prompt, systemContext) {
    const model = this.models.find(m => m.id === modelId)
    if (!model) {
      return { status: 'failed', error: `Model id=${modelId} not found` }
    }

    const provider = this._getProvider(model)
    if (!provider) {
      return { status: 'failed', error: `No provider for ${model.apiProvider}` }
    }

    // Check rate limit
    if (!rateLimiter.canUse(model.id, model.rateLimit)) {
      return { status: 'failed', error: `Rate limited: ${model.name}` }
    }

    try {
      rateLimiter.record(model.id)
      const response = await provider.callModel(model, prompt, systemContext)

      // Validate response has content
      if (!response.output || response.output.trim() === '') {
        console.error(`⚠️ Model ${model.name} returned empty output`)
        return { status: 'failed', error: `${model.name} returned empty output`, model: model.name, modelId: model.id }
      }

      return {
        output: response.output,
        model: model.name,
        modelId: model.id,
        latency: response.latency,
        tokensUsed: response.tokensUsed || 0,
        status: 'success'
      }
    } catch (error) {
      console.error(`❌ Model ${model.name} error: ${error.message}`)

      // Retry once
      try {
        console.log(`🔄 Retrying ${model.name}...`)
        rateLimiter.record(model.id)
        const retryResponse = await provider.callModel(model, prompt, systemContext)

        // Validate retry response has content
        if (!retryResponse.output || retryResponse.output.trim() === '') {
          console.error(`⚠️ Model ${model.name} retry also returned empty output`)
          return { status: 'failed', error: `${model.name} returned empty output on retry`, model: model.name, modelId: model.id }
        }

        return {
          output: retryResponse.output,
          model: model.name,
          modelId: model.id,
          latency: retryResponse.latency,
          tokensUsed: retryResponse.tokensUsed || 0,
          status: 'success',
          retried: true
        }
      } catch (retryError) {
        return {
          status: 'failed',
          error: `${model.name}: ${retryError.message}`,
          model: model.name,
          modelId: model.id
        }
      }
    }
  }

  /**
   * Build execution batches from sub-task dependencies.
   * Returns an array of arrays, where each inner array is a batch of
   * independent sub-tasks that can run in parallel.
   * Uses topological sort.
   * @private
   */
  _buildExecutionBatches(subtasks) {
    const taskMap = new Map()
    for (const st of subtasks) {
      taskMap.set(st.id, st)
    }

    // Calculate in-degree for each task
    const inDegree = new Map()
    const dependents = new Map() // id → [ids that depend on it]

    for (const st of subtasks) {
      if (!inDegree.has(st.id)) inDegree.set(st.id, 0)
      if (!dependents.has(st.id)) dependents.set(st.id, [])

      for (const dep of (st.dependencies || [])) {
        // Only count dependencies that exist
        if (taskMap.has(dep)) {
          inDegree.set(st.id, (inDegree.get(st.id) || 0) + 1)
          if (!dependents.has(dep)) dependents.set(dep, [])
          dependents.get(dep).push(st.id)
        }
      }
    }

    const batches = []
    const remaining = new Set(subtasks.map(s => s.id))

    while (remaining.size > 0) {
      // Find all tasks with 0 in-degree (ready to execute)
      const batch = []
      for (const id of remaining) {
        if ((inDegree.get(id) || 0) <= 0) {
          batch.push(id)
        }
      }

      if (batch.length === 0) {
        // Circular dependency — force-execute remaining
        console.warn('⚠️ Circular dependency detected, force-executing remaining subtasks')
        batches.push([...remaining])
        break
      }

      batches.push(batch)

      // Remove executed tasks and update in-degrees
      for (const id of batch) {
        remaining.delete(id)
        for (const dependent of (dependents.get(id) || [])) {
          inDegree.set(dependent, (inDegree.get(dependent) || 0) - 1)
        }
      }
    }

    return batches
  }

  /**
   * Generate the phase summary for Model F.
   */
  buildPhaseSummary(executionResult) {
    return {
      phase: 'execution',
      results: Object.entries(executionResult.results).map(([id, r]) => ({
        subtask: id,
        model: r.model,
        status: r.status,
        outputLength: r.output ? r.output.length : 0,
        latency: r.latency || 0
      })),
      totalLatency: executionResult.totalLatency,
      failedSubtasks: executionResult.failedSubtasks,
      modelsUsed: executionResult.modelsUsed
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

module.exports = ExecutorService
