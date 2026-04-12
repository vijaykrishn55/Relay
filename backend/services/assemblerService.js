/**
 * Model F — the Finalizer. Combines all sub-task outputs into a single,
 * polished, cohesive response using user context for styling.
 * Now includes persona injection and engagement guidelines.
 */

const { selectBestModel } = require('./scoreMatcher')
const rateLimiter = require('../utils/rateLimiter')
const { buildPersonaPrompt, buildFollowUpInstructions, SENTIMENT_ADAPTATIONS } = require('./systemPersona')

class AssemblerService {
  /**
   * @param {object} providers - Map of provider name → provider instance
   * @param {object[]} models   - Runtime models array
   */
  constructor(providers, models) {
    this.providers = providers
    this.models = models
  }

  /**
   * Assemble all sub-task outputs into a final response.
   * @param {string} userQuestion    - Original user question
   * @param {object} decomposition   - phase 1 output
   * @param {object} strategyResult  - phase 2 output
   * @param {object} executionResult - phase 3 output
   * @param {object} userContext      - { profile, sessionContext, memoryContext }
   * @param {object} optSummaries   - { decomposition, strategy, execution }
   * @returns {{ output: string, model: string, latency: number }}
   */
  async assemble(userQuestion, decomposition, strategyResult, executionResult, userContext, optSummaries) {
    // Select Model F — prefer assemblers, need high quality
    const assemblerScores = {
      reasoning: 0.7,
      code: 0.5,
      creativity: 0.6,
      speed: 0.3,
      multilingual: 0.3,
      analysis: 0.7,
      instruction: 0.9,
      knowledge: 0.7
    }

    const match = selectBestModel(assemblerScores, this.models, 'assembler')
    if (!match) {
      // Direct concatenation fallback
      console.log('⚠️ No assembler model available, concatenating outputs')
      return this._concatenateFallback(decomposition, executionResult)
    }

    const modelF = match.model
    const provider = this._getProvider(modelF)

    console.log(`🎨 Assembler: Using ${modelF.name} as Model F`)

    // Build the assembly prompt
    const assemblyPrompt = this._buildAssemblyPrompt(
      userQuestion, decomposition, strategyResult, executionResult, userContext, optSummaries
    )

    try {
      rateLimiter.record(modelF.id)
      const response = await provider.callModel(modelF, assemblyPrompt)

      // Validate response has content
      if (!response.output || response.output.trim() === '') {
        console.error(`⚠️ Assembly: ${modelF.name} returned empty output`)
        throw new Error('Assembler model returned empty output')
      }

      console.log(`✅ Assembly complete: ${response.output.length} chars by ${modelF.name}`)

      return {
        output: response.output,
        model: modelF.name,
        modelId: modelF.id,
        latency: response.latency,
        tokensUsed: response.tokensUsed || 0
      }
    } catch (error) {
      console.error(`❌ Assembly failed with ${modelF.name}: ${error.message}`)

      // Try fallback assembler
      const fallback = selectBestModel(assemblerScores, this.models, 'assembler', [modelF.id])
      if (fallback) {
        try {
          const fallbackProvider = this._getProvider(fallback.model)
          rateLimiter.record(fallback.model.id)
          const response = await fallbackProvider.callModel(fallback.model, assemblyPrompt)

          // Validate fallback response
          if (!response.output || response.output.trim() === '') {
            console.error(`⚠️ Fallback assembler ${fallback.model.name} also returned empty output`)
            throw new Error('Fallback assembler returned empty output')
          }

          console.log(`✅ Assembly recovered with ${fallback.model.name}`)
          return {
            output: response.output,
            model: fallback.model.name,
            modelId: fallback.model.id,
            latency: response.latency,
            tokensUsed: response.tokensUsed || 0
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback assembler also failed: ${fallbackError.message}`)
        }
      }

      // Last resort: concatenate
      return this._concatenateFallback(decomposition, executionResult)
    }
  }

  /**
   * Build the comprehensive assembly prompt for Model F.
   * Enhanced with opt 7 persona and engagement guidelines.
   * @private
   */
  _buildAssemblyPrompt(userQuestion, decomposition, strategyResult, executionResult, userContext, optSummaries) {
    // Build sub-task outputs section
    const subtaskOutputs = decomposition.subtasks.map(st => {
      const result = executionResult.results[st.id]
      if (!result || result.status === 'failed') {
        return `=== Sub-task: "${st.description}" ===\n[FAILED — This section could not be generated]`
      }
      return `=== Sub-task: "${st.description}" (by ${result.model}) ===\n${result.output}`
    }).join('\n\n')

    // Build user style guidelines (enhanced)
    const styleGuidelines = this._buildStyleGuidelines(userContext)

    // Build phase summary overview
    const summaryOverview = `phase 1 (Decomposition): ${decomposition.subtasks.length} sub-tasks identified, types: ${decomposition.subtasks.map(s => s.type).join(', ')}
phase 2 (Strategy): Models assigned — ${strategyResult.strategies.map(s => `${s.subtaskId}→${s.selectedModelName}`).join(', ')}
phase 3 (Execution): ${Object.values(executionResult.results).filter(r => r.status === 'success').length}/${decomposition.subtasks.length} succeeded`

    //  Build persona prompt
    const personaPrompt = buildPersonaPrompt(userContext.profile || {}, userContext.sentiment || {})

    // Determine primary question type for follow-up guidance
    const primaryType = decomposition.subtasks[0]?.type || 'general'
    const followUpGuide = buildFollowUpInstructions(primaryType)

    // Sentiment-specific guidance
    const sentimentGuidance = this._buildSentimentGuidance(userContext.sentiment)

    return `${personaPrompt}

You are the Final Assembler. Multiple AI models have worked together to answer a user's question.
Your job is to combine their outputs into ONE seamless, polished, ENGAGING response.

ORIGINAL USER QUESTION:
"${userQuestion}"

PIPELINE SUMMARY:
${summaryOverview}

SUB-TASK OUTPUTS (in order):
${subtaskOutputs}

ASSEMBLY INSTRUCTIONS — FOLLOW THESE EXACTLY:
1. Combine all sub-task outputs into a SINGLE coherent response
2. DO NOT mention sub-tasks, opts, models, or that multiple AIs were used — the user should see ONE clean answer
3. Arrange sections in the most LOGICAL order for a reader (may differ from sub-task order)
4. Fix INCONSISTENCIES between outputs (e.g., variable names in code should match explanations)
5. Add SMOOTH TRANSITIONS between sections — no abrupt topic jumps
6. Remove REDUNDANCY — if two sections explain the same concept, keep the better version
7. Ensure proper FORMATTING:
   - Use markdown headers (##, ###) for major sections
   - Code must be in properly fenced code blocks with language tags
   - Lists should be consistent (all bullets or all numbers)
8. MERMAID DIAGRAMS — Use ONLY valid syntax:
   - flowchart TD/LR: flowchart TD\\n  A[Start] --> B[End]
   - sequenceDiagram: sequenceDiagram\\n  Alice->>Bob: Hello
   - DO NOT mix diagram types (no "participant" in timeline, no "fill:" styling)
   - Keep diagrams simple and syntactically correct
9. If any sub-task FAILED, gracefully note what's missing without blame
10. Add a brief INTRODUCTION if the answer covers multiple topics
11. Maintain DEPTH — do not summarize or shorten the specialist outputs unless redundant

${styleGuidelines}

${sentimentGuidance}

${followUpGuide}

## CRITICAL: RESPONSE PROPORTIONALITY
Match your response length to the user's question:
- If the question is casual/simple (greeting, short question) → keep the answer SHORT (1-4 sentences)
- NEVER list the user's interests, past topics, or personal facts
- NEVER reference that you "remember" things or that context was provided
- When in doubt, be more concise

OUTPUT: Write the final response directly. No JSON, no meta-commentary, no wrapping — just the polished, engaging answer.`
  }

  /**
   * Build sentiment-specific guidance for the assembler.
   * @private
   */
  _buildSentimentGuidance(sentiment) {
    if (!sentiment || sentiment.sentiment === 'neutral') {
      return ''
    }

    const adapt = SENTIMENT_ADAPTATIONS[sentiment.sentiment]
    if (!adapt) return ''

    return `## SENTIMENT ADAPTATION
The user appears ${sentiment.sentiment} (${sentiment.intensity || 'medium'} intensity).
Adapt your tone: ${adapt.tone}
${adapt.guidelines.map(g => `- ${g}`).join('\n')}`
  }

  /**
   * Build user-specific style guidelines for the assembly prompt.
   * Enhanced communication style and expertise levels.
   * @private
   */
  _buildStyleGuidelines(userContext) {
    const guidelines = ['USER STYLE PREFERENCES:']

    if (userContext.profile) {
      const p = userContext.profile

      // Communication style
      if (p.communication_style) {
        const styleDescriptions = {
          formal: 'Use professional language, complete sentences, structured responses',
          casual: 'Use conversational language, contractions allowed, relaxed structure',
          friendly: 'Be warm and personable, use encouraging language, show personality',
          technical: 'Use precise terminology, focus on code, minimize pleasantries',
          educational: 'Use patient explanations, include analogies, break things down step-by-step'
        }
        guidelines.push(`- Communication style: ${p.communication_style} — ${styleDescriptions[p.communication_style] || ''}`)
      }

      // Expertise levels
      if (p.expertise_levels) {
        const levels = typeof p.expertise_levels === 'string' ? JSON.parse(p.expertise_levels) : p.expertise_levels
        if (typeof levels === 'object' && Object.keys(levels).length > 0) {
          const expertiseStr = Object.entries(levels)
            .map(([topic, level]) => `${topic}:${level}`)
            .join(', ')
          guidelines.push(`- User expertise: ${expertiseStr}`)
        }
      }

      // Engagement preferences
      if (p.engagement_preferences) {
        const prefs = typeof p.engagement_preferences === 'string' ? JSON.parse(p.engagement_preferences) : p.engagement_preferences
        if (prefs.detailLevel) {
          guidelines.push(`- Detail preference: ${prefs.detailLevel}`)
        }
        if (prefs.includeExamples === true) {
          guidelines.push(`- User appreciates examples`)
        }
      }

      // Existing profile fields
      if (p.preferences) {
        const pref = typeof p.preferences === 'string' ? p.preferences : JSON.stringify(p.preferences)
        guidelines.push(`- General preferences: ${pref}`)
      }
      if (p.behavior_patterns) {
        const bp = typeof p.behavior_patterns === 'string' ? p.behavior_patterns : JSON.stringify(p.behavior_patterns)
        guidelines.push(`- Behavior patterns: ${bp}`)
      }
      // Name intentionally omitted — see systemPersona.js for rationale (Phase 8)
    }

    if (guidelines.length === 1) {
      guidelines.push('- No specific preferences known — use clear, well-structured markdown with a friendly tone')
    }

    return guidelines.join('\n')
  }

  /**
   * Fallback: Direct concatenation when no assembler model is available.
   * @private
   */
  _concatenateFallback(decomposition, executionResult) {
    console.log('📋 Using direct concatenation fallback')

    const parts = decomposition.subtasks.map(st => {
      const result = executionResult.results[st.id]
      if (!result || result.status === 'failed' || !result.output) {
        return `## ${st.description}\n\n*This section could not be generated.*`
      }
      return result.output
    }).filter(p => p && p.trim())

    const concatenatedOutput = parts.join('\n\n---\n\n')

    // Ensure we have at least some output
    if (!concatenatedOutput || concatenatedOutput.trim() === '') {
      console.error('⚠️ Concatenation fallback: All subtask outputs were empty')
      return {
        output: '*Unable to generate a response. Please try again.*',
        model: 'concatenation-fallback',
        modelId: 0,
        latency: 0,
        tokensUsed: 0
      }
    }

    return {
      output: concatenatedOutput,
      model: 'concatenation-fallback',
      modelId: 0,
      latency: 0,
      tokensUsed: 0
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

module.exports = AssemblerService
