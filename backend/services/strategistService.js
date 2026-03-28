/**
 * Strategist Service — Phase 6: Hive Mind (Phase 2)
 * Enhanced in Phase 7: Conversational Intelligence
 *
 * Uses 2 models in conversation to craft optimal prompts for each sub-task,
 * select best-fit models using score matching, and incorporate full user context.
 * Now includes persona injection and sentiment awareness.
 */

const ModelConversation = require('./modelConversation')
const { selectModelPair, selectBestModel, selectTopModels } = require('./scoreMatcher')
const { getModelScore, SCORE_DIMENSIONS } = require('../data/modelScores')
const rateLimiter = require('../utils/rateLimiter')
const { buildPersonaPrompt } = require('./systemPersona')

class StrategistService {
  /**
   * @param {object} providers - Map of provider name → provider instance
   * @param {object[]} models   - Runtime models array
   */
  constructor(providers, models) {
    this.providers = providers
    this.models = models
  }

  /**
   * Plan strategies for all sub-tasks: select models and craft prompts.
   * 
   * @param {object}   decomposition  - Output from DecomposerService.decompose()
   * @param {string}   userQuestion   - Original user question
   * @param {object}   userContext     - { profile, sessionContext, memoryContext, lastSessionSummary }
   * @returns {{ strategies: Array, modelsUsed: string[], totalLatency: number }}
   */
  async planStrategies(decomposition, userQuestion, userContext) {
    const pair = selectModelPair(this.models, 'strategist')
    if (!pair) {
      console.log('⚠️ No strategist models, using direct score matching')
      return this._directStrategy(decomposition, userQuestion, userContext)
    }

    const providerA = this._getProvider(pair.modelA)
    const providerB = this._getProvider(pair.modelB)

    const conversation = new ModelConversation(pair.modelA, pair.modelB, providerA, providerB, {
      maxTurns: 2, // Strategy only needs 2 turns (generate + review)
      convergenceCheck: true,
      timeoutMs: 25000
    })

    // Build formatted model info for the prompt
    const modelInfo = this._formatModelsForPrompt()
    const userContextStr = this._formatUserContext(userContext)
    const rateLimitInfo = this._formatRateLimits()

    // Turn 1 prompt for Model A
    const initialPrompt = `You are Strategy Alpha. For each sub-task, you must: (1) select the best AI model and (2) craft a specific prompt.

CRITICAL: You are a STRATEGIST — do NOT answer the user's question. Only select models and write prompts.

USER QUESTION: "${userQuestion}"

SUB-TASKS TO ASSIGN:
${JSON.stringify(decomposition.subtasks, null, 2)}

USER CONTEXT:
${userContextStr}

AVAILABLE MODELS (with capability scores 0.0–1.0):
${modelInfo}

CURRENT RATE LIMITS:
${rateLimitInfo}

INSTRUCTIONS:
For each sub-task:
1. MATCH: Find the model whose scores best match the sub-task's need scores
   - A model with code:0.95 is ideal for a sub-task with code:0.9
   - Avoid models that are rate-limited (check limits above)
2. PROMPT: Craft a detailed, specific prompt incorporating:
   - The exact task description
   - User's communication preferences (from context)
   - Relevant session/memory context
   - The expected output format
   - Do NOT include the original question — only the specific sub-task
3. NEVER assign Compound Mini (id=9) as a specialist — it can only route, not answer

Return ONLY this JSON:
{
  "strategies": [
    {
      "subtaskId": "st1",
      "selectedModelId": 11,
      "selectedModelName": "Command A Reasoning",
      "matchScore": 0.87,
      "prompt": "<the specific prompt for this model to answer this sub-task>",
      "reason": "<why this model>"
    }
  ]
}`

    // Turn 2 review template
    const reviewTemplate = `You are Strategy Beta. Review these model assignments and prompts critically.
Do NOT answer the user's question. Only verify the strategy.

USER QUESTION: "${userQuestion}"

PROPOSED STRATEGIES:
\${modelA_output}

AVAILABLE MODELS:
${modelInfo}

RATE LIMITS:
${rateLimitInfo}

CHECK:
1. Are model selections optimal? (Does each model's strength match the sub-task need?)
2. Will any model hit rate limits? (Don't assign a model with 0 remaining capacity)
3. Are prompts specific enough? (Vague prompts = bad answers)
4. Is Compound Mini (id=9) assigned as specialist? (FORBIDDEN — fix immediately)
5. Do prompts include user context where relevant?

Return the CORRECTED strategies JSON in the same format. If perfect, return unchanged.`

    try {
      rateLimiter.record(pair.modelA.id)
      rateLimiter.record(pair.modelB.id)

      const result = await conversation.converse(initialPrompt, reviewTemplate)
      const parsed = this._parseJson(result.finalOutput)

      // Validate and fix strategies
      const strategies = this._validateStrategies(parsed.strategies || [], decomposition.subtasks)

      console.log(`✅ Strategy complete: ${strategies.length} assignments in ${result.turns} turns`)

      return {
        strategies,
        modelsUsed: conversation.getModelsUsed(),
        turns: result.turns,
        converged: result.converged,
        totalLatency: conversation.getTotalLatency()
      }
    } catch (error) {
      console.error(`❌ Strategy conversation failed: ${error.message}`)
      return this._directStrategy(decomposition, userQuestion, userContext)
    }
  }

  /**
   * Fallback: Direct score-based strategy without model conversation.
   * Used when strategist models are unavailable or conversation fails.
   */
  _directStrategy(decomposition, userQuestion, userContext) {
    console.log('📊 Using direct score-matching strategy (no conversation)')

    const strategies = decomposition.subtasks.map(subtask => {
      const match = selectBestModel(subtask.scores, this.models, 'specialist', [9])
      if (!match) {
        // Last resort: use any active model except Compound Mini
        const fallback = this.models.find(m => m.status === 'active' && m.id !== 9)
        return {
          subtaskId: subtask.id,
          selectedModelId: fallback?.id || 8,
          selectedModelName: fallback?.name || 'Llama 4 Scout 17B',
          matchScore: 0,
          prompt: this._buildDefaultPrompt(subtask, userQuestion, userContext),
          reason: 'Fallback — no optimal match found'
        }
      }

      return {
        subtaskId: subtask.id,
        selectedModelId: match.model.id,
        selectedModelName: match.model.name,
        matchScore: match.score,
        prompt: this._buildDefaultPrompt(subtask, userQuestion, userContext),
        reason: match.reason
      }
    })

    return {
      strategies,
      modelsUsed: ['Direct Score Matcher'],
      turns: 0,
      converged: true,
      totalLatency: 0
    }
  }

  /**
   * Build a default prompt for a sub-task (used in fallback path).
   */
  _buildDefaultPrompt(subtask, userQuestion, userContext) {
    let prompt = `You are answering a specific part of a larger question. Focus ONLY on this sub-task.

SUB-TASK: ${subtask.description}

CONTEXT (original question): "${userQuestion}"
`

    if (userContext.profile) {
      const pref = userContext.profile.preferences
      if (pref) {
        prompt += `\nUSER PREFERENCES: ${typeof pref === 'string' ? pref : JSON.stringify(pref)}`
      }
    }

    if (userContext.memoryContext) {
      prompt += `\n${userContext.memoryContext}`
    }

    if (subtask.outputFormat === 'code_block') {
      prompt += `\n\nProvide well-commented code with clear explanations.`
    } else if (subtask.outputFormat === 'mermaid') {
      prompt += `\n\nProvide a valid Mermaid diagram wrapped in a mermaid code block.
IMPORTANT - Use ONLY valid Mermaid syntax:
- For flowcharts: flowchart TD or flowchart LR, then A[Node] --> B[Node]
- For sequence: sequenceDiagram, then Actor->>Actor: Message
- For state: stateDiagram-v2, then [*] --> State1
- DO NOT mix syntax from different diagram types
- DO NOT use "participant" in timeline diagrams
- DO NOT use fill: or other CSS styling
- Keep it simple and syntactically correct`
    }

    prompt += `\n\nRespond directly with the answer. Do not reference that this is a sub-task or part of a larger system.`
    return prompt
  }

  /**
   * Generate the phase summary for Model F.
   */
  buildPhaseSummary(strategyResult) {
    return {
      phase: 'strategy',
      modelAssignments: strategyResult.strategies.map(s => ({
        subtask: s.subtaskId,
        model: s.selectedModelName,
        matchScore: s.matchScore
      })),
      modelsUsed: strategyResult.modelsUsed,
      turns: strategyResult.turns,
      converged: strategyResult.converged
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

  _parseJson(raw) {
    let cleaned = raw.trim()
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleaned = jsonMatch[0]
    return JSON.parse(cleaned)
  }

  _formatModelsForPrompt() {
    return this.models
      .filter(m => m.status === 'active')
      .map(m => {
        const scoreEntry = getModelScore(m.id)
        if (!scoreEntry) return `${m.id}. ${m.name} (${m.provider}) — no scores available`

        const scoreStr = SCORE_DIMENSIONS
          .map(d => `${d}:${scoreEntry.scores[d]}`)
          .join(', ')

        const roles = scoreEntry.roles.join(', ')
        return `${m.id}. ${m.name} (${m.provider}) [roles: ${roles}]
   Scores: ${scoreStr}
   Best for: ${scoreEntry.bestFor}`
      })
      .join('\n\n')
  }

  _formatUserContext(userContext) {
    const parts = []

    if (userContext.profile) {
      const p = userContext.profile
      if (p.name) parts.push(`User name: ${p.name}`)
      if (p.preferences) parts.push(`Preferences: ${typeof p.preferences === 'string' ? p.preferences : JSON.stringify(p.preferences)}`)
      if (p.interests) parts.push(`Interests: ${typeof p.interests === 'string' ? p.interests : JSON.stringify(p.interests)}`)
      if (p.behavior_patterns) parts.push(`Behavior patterns: ${typeof p.behavior_patterns === 'string' ? p.behavior_patterns : JSON.stringify(p.behavior_patterns)}`)

      // Phase 7: Enhanced profile fields
      if (p.communication_style) {
        parts.push(`Communication style: ${p.communication_style}`)
      }
      if (p.expertise_levels) {
        const levels = typeof p.expertise_levels === 'string' ? JSON.parse(p.expertise_levels) : p.expertise_levels
        if (typeof levels === 'object' && Object.keys(levels).length > 0) {
          parts.push(`Expertise levels: ${JSON.stringify(levels)}`)
        }
      }
      if (p.engagement_preferences) {
        const prefs = typeof p.engagement_preferences === 'string' ? JSON.parse(p.engagement_preferences) : p.engagement_preferences
        if (typeof prefs === 'object' && Object.keys(prefs).length > 0) {
          parts.push(`Engagement preferences: ${JSON.stringify(prefs)}`)
        }
      }
    }

    // Phase 7: Include sentiment data
    if (userContext.sentiment) {
      const s = userContext.sentiment
      parts.push(`Current sentiment: ${s.sentiment} (${s.intensity || 'medium'} intensity)`)
    }

    // Full session context (no truncation per Phase 7)
    if (userContext.sessionContext) {
      parts.push(`Session context: ${userContext.sessionContext}`)
    }

    // Full memory context (no truncation per Phase 7)
    if (userContext.memoryContext) {
      parts.push(`Memories: ${userContext.memoryContext}`)
    }

    return parts.length > 0 ? parts.join('\n') : 'No user context available'
  }

  _formatRateLimits() {
    return this.models
      .filter(m => m.status === 'active')
      .map(m => {
        const remaining = rateLimiter.getRemaining(m.id, m.rateLimit)
        const status = remaining.rpm <= 0 || remaining.rpd <= 0 ? '❌ EXHAUSTED' : '✅ Available'
        return `${m.name}: RPM=${remaining.rpm}, RPD=${remaining.rpd} ${status}`
      })
      .join('\n')
  }

  _validateStrategies(strategies, subtasks) {
    if (!Array.isArray(strategies)) return []

    const subtaskIds = subtasks.map(s => s.id)

    // Ensure every subtask has a strategy
    const strategized = new Set(strategies.map(s => s.subtaskId))
    const missing = subtaskIds.filter(id => !strategized.has(id))

    // Fill in missing strategies with direct score matching
    for (const missingId of missing) {
      const subtask = subtasks.find(s => s.id === missingId)
      if (!subtask) continue

      const match = selectBestModel(subtask.scores, this.models, 'specialist', [9])
      strategies.push({
        subtaskId: missingId,
        selectedModelId: match ? match.model.id : 8,
        selectedModelName: match ? match.model.name : 'Llama 4 Scout 17B',
        matchScore: match ? match.score : 0,
        prompt: subtask.description,
        reason: 'Auto-filled by validator'
      })
    }

    // Enforce: Compound Mini (id=9) can NEVER be a specialist
    return strategies.map(s => {
      if (s.selectedModelId === 9) {
        console.log(`⚠️ Strategy tried to assign Compound Mini as specialist — redirecting`)
        const subtask = subtasks.find(st => st.id === s.subtaskId)
        const match = selectBestModel(subtask?.scores || {}, this.models, 'specialist', [9])
        if (match) {
          s.selectedModelId = match.model.id
          s.selectedModelName = match.model.name
          s.matchScore = match.score
          s.reason = `Redirected from Compound Mini: ${match.reason}`
        }
      }
      return s
    })
  }
}

module.exports = StrategistService
