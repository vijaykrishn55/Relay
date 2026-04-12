/**
 * Decomposer Service : Hive Mind 
 * 
 * Uses 2 models in conversation to break down a user question into
 * scored sub-tasks with dependency tracking.
 */

const ModelConversation = require('./modelConversation')
const { selectModelPair } = require('./scoreMatcher')
const { SCORE_DIMENSIONS } = require('../data/modelScores')
const rateLimiter = require('../utils/rateLimiter')

class DecomposerService {
  /**
   * @param {object} providers - Map of provider name → provider instance
   * @param {object[]} models   - Runtime models array
   */
  constructor(providers, models) {
    this.providers = providers
    this.models = models
  }

  /**
   * Triage a question: determine if it's complex or simple, and score it.
   * Uses a single fast model call (Compound Mini or fastest decomposer).
   * 
   * @param {string} userQuestion
   * @returns {{ isComplex: boolean, questionScores: object, primaryType: string, reason: string }}
   */
  async triage(userQuestion) {
    const pair = selectModelPair(this.models, 'decomposer')
    if (!pair) throw new Error('No decomposer models available')

    // Use the fastest model for triage (Model B is typically faster)
    const triageModel = pair.modelB.avgLatency <= pair.modelA.avgLatency ? pair.modelB : pair.modelA
    const provider = this._getProvider(triageModel)

    const prompt = `You are a question triage system. Analyze this question and determine if it requires multi-model orchestration.

QUESTION: "${userQuestion}"

A question is COMPLEX if ANY of these are true:
- It asks for MULTIPLE DISTINCT things (e.g., "explain X AND write code for Y")
- It requires expertise in 2+ different domains (e.g., code + creative writing)
- It needs both deep reasoning AND factual knowledge with detailed output
- It explicitly asks for diagrams/code/analysis in the same question
- The expected answer would be >500 words with distinct sections

A question is SIMPLE if:
- It has ONE clear intent (e.g., "What is recursion?")
- It needs only one type of skill (e.g., just code, or just explanation)
- It can be fully answered in <300 words

SCORING: Rate each dimension 0.0–1.0 based on how much the question NEEDS that skill:
- reasoning: logical deduction, step-by-step thinking needed
- code: code generation, debugging, programming needed
- creativity: creative writing, brainstorming needed
- speed: 1.0 if user wants quick answer, 0.0 if quality matters more
- multilingual: non-English language needed
- analysis: data comparison, structured evaluation needed
- instruction: structured/formatted output needed (tables, lists, specific format)
- knowledge: deep factual knowledge needed

CRITICAL: You are a CLASSIFIER ONLY. Do NOT answer the user's question. Return ONLY this JSON:
{
  "isComplex": true,
  "questionScores": {
    "reasoning": 0.0,
    "code": 0.0,
    "creativity": 0.0,
    "speed": 0.0,
    "multilingual": 0.0,
    "analysis": 0.0,
    "instruction": 0.0,
    "knowledge": 0.0
  },
  "primaryType": "<one of: explanation, code, analysis, creative, diagram, translation, factual, deep_reasoning, current_data>",
  "reason": "<1 sentence why complex or simple>"
}`

    try {
      rateLimiter.record(triageModel.id)
      const response = await provider.callModel(triageModel, prompt)
      const parsed = this._parseJson(response.output)

      // Validate scores
      if (parsed.questionScores) {
        for (const dim of SCORE_DIMENSIONS) {
          const val = parsed.questionScores[dim]
          if (typeof val !== 'number' || val < 0 || val > 1) {
            parsed.questionScores[dim] = 0.5
          }
        }
      }

      console.log(`🔍 Triage: isComplex=${parsed.isComplex}, type=${parsed.primaryType}`)
      return {
        isComplex: parsed.isComplex === true,
        questionScores: parsed.questionScores || this._defaultScores(),
        primaryType: parsed.primaryType || 'explanation',
        reason: parsed.reason || 'No reason provided',
        triageModel: triageModel.name,
        triageLatency: response.latency
      }
    } catch (error) {
      console.error(`❌ Triage failed: ${error.message}`)
      // Default to simple with balanced scores
      return {
        isComplex: false,
        questionScores: this._defaultScores(),
        primaryType: 'explanation',
        reason: 'Triage failed, defaulting to simple',
        triageModel: triageModel.name,
        triageLatency: 0
      }
    }
  }

  /**
   * Full decomposition: 2 models collaborate to break down a complex question.
   * 
   * @param {string} userQuestion
   * @param {object} triageResult - Output from triage()
   * @returns {{ subtasks: Array, overallComplexity: string, modelsUsed: string[] }}
   */
  async decompose(userQuestion, triageResult) {
    const pair = selectModelPair(this.models, 'decomposer')
    if (!pair) throw new Error('No decomposer models available')

    const providerA = this._getProvider(pair.modelA)
    const providerB = this._getProvider(pair.modelB)

    const conversation = new ModelConversation(pair.modelA, pair.modelB, providerA, providerB, {
      maxTurns: 3,
      convergenceCheck: true,
      timeoutMs: 25000
    })

    const scoreDimList = SCORE_DIMENSIONS.map(d => `"${d}": 0.0`).join(', ')

    // Turn 1 prompt for Model A
    const initialPrompt = `You are Decomposer Alpha. Your ONLY job is to break down the user's question into sub-tasks. You are a CLASSIFIER — do NOT answer the question.

USER QUESTION: "${userQuestion}"

INITIAL ANALYSIS:
- Overall question type: ${triageResult.primaryType}
- Overall scores: ${JSON.stringify(triageResult.questionScores)}

Break this into distinct sub-tasks. For each sub-task:
1. Describe what needs to be done
2. Classify its type  
3. Score each dimension 0.0–1.0 for what skills are needed
4. List dependencies (which sub-tasks must finish first)
5. Specify output format

Sub-task types: explanation, code, analysis, creative, diagram, translation, factual, deep_reasoning, current_data

CRITICAL RULES:
- Do NOT answer the user's question
- Each sub-task should be independently answerable by a specialist model
- Diagrams/mermaid should be their own sub-task
- Code should be its own sub-task  
- Sub-tasks with no dependencies can run in parallel

Return ONLY this JSON:
{
  "subtasks": [
    {
      "id": "st1",
      "description": "<what needs to be answered/done>",
      "type": "<type>",
      "scores": { ${scoreDimList} },
      "dependencies": [],
      "outputFormat": "<markdown|code_block|mermaid|json|plain>"
    }
  ],
  "overallComplexity": "<low|medium|high>"
}`

    // Turn 2 prompt template for Model B
    const reviewTemplate = `You are Decomposer Beta. Another AI decomposed a user question into sub-tasks. Review it critically. You are a REVIEWER — do NOT answer the user's question.

USER QUESTION: "${userQuestion}"

PROPOSED DECOMPOSITION:
\${modelA_output}

CHECK FOR:
1. Are any sub-tasks MISSING? (e.g., user asked for diagram but no diagram sub-task?)
2. Are the SCORES accurate? (e.g., a "write Python code" sub-task should have code >= 0.8)
3. Are DEPENDENCIES correct? (e.g., diagram of code should depend on the code sub-task)
4. Should any sub-tasks be MERGED (too granular) or SPLIT (too broad)?
5. Are sub-task TYPES correct?

Return the CORRECTED full decomposition JSON in the exact same format.
If the decomposition is already perfect, return it unchanged.
CRITICAL: Return ONLY the JSON, do NOT answer the user's question.`

    try {
      rateLimiter.record(pair.modelA.id)
      rateLimiter.record(pair.modelB.id)

      const result = await conversation.converse(initialPrompt, reviewTemplate)
      const parsed = this._parseJson(result.finalOutput)

      // Validate and sanitize subtasks
      const subtasks = this._validateSubtasks(parsed.subtasks || [])

      if (subtasks.length === 0) {
        // Decomposition produced nothing — create a single fallback subtask
        console.log(`⚠️ Decomposition produced no subtasks, creating fallback`)
        subtasks.push({
          id: 'st1',
          description: userQuestion,
          type: triageResult.primaryType,
          scores: triageResult.questionScores,
          dependencies: [],
          outputFormat: 'markdown'
        })
      }

      console.log(`✅ Decomposition complete: ${subtasks.length} subtasks in ${result.turns} turns`)

      return {
        subtasks,
        overallComplexity: parsed.overallComplexity || 'medium',
        modelsUsed: conversation.getModelsUsed(),
        turns: result.turns,
        converged: result.converged,
        totalLatency: conversation.getTotalLatency()
      }
    } catch (error) {
      console.error(`❌ Decomposition failed: ${error.message}`)
      // Return single-subtask fallback
      return {
        subtasks: [{
          id: 'st1',
          description: userQuestion,
          type: triageResult.primaryType,
          scores: triageResult.questionScores,
          dependencies: [],
          outputFormat: 'markdown'
        }],
        overallComplexity: 'medium',
        modelsUsed: [],
        turns: 0,
        converged: false,
        totalLatency: 0,
        error: error.message
      }
    }
  }

  /**
   * Generate the phase summary for Model F.
   */
  buildPhaseSummary(decomposition) {
    return {
      phase: 'decomposition',
      subtaskCount: decomposition.subtasks.length,
      subtaskTypes: decomposition.subtasks.map(s => s.type),
      subtaskIds: decomposition.subtasks.map(s => s.id),
      overallComplexity: decomposition.overallComplexity,
      modelsUsed: decomposition.modelsUsed,
      turns: decomposition.turns,
      converged: decomposition.converged
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

  _defaultScores() {
    const scores = {}
    for (const dim of SCORE_DIMENSIONS) {
      scores[dim] = 0.5
    }
    return scores
  }

  _validateSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) return []

    return subtasks.map((st, i) => {
      // Ensure required fields
      const validated = {
        id: st.id || `st${i + 1}`,
        description: st.description || 'Unknown task',
        type: st.type || 'explanation',
        scores: {},
        dependencies: Array.isArray(st.dependencies) ? st.dependencies : [],
        outputFormat: st.outputFormat || 'markdown'
      }

      // Validate scores
      for (const dim of SCORE_DIMENSIONS) {
        const val = st.scores?.[dim]
        validated.scores[dim] = (typeof val === 'number' && val >= 0 && val <= 1) ? val : 0.5
      }

      return validated
    })
  }
}

module.exports = DecomposerService
