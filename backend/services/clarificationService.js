/**
 * Clarification Service : Conversational Intelligence
 * Detects when a question is too ambiguous to answer well
 * and builds appropriate clarifying responses.
 */

const { buildClarificationCheckPrompt, buildClarificationResponse } = require('./systemPersona')

// Minimum question length to consider for clarification checks
const MIN_LENGTH_FOR_CHECK = 3

// Patterns that indicate likely ambiguity
const AMBIGUITY_INDICATORS = {
  vague: {
    patterns: [
      /^(help|fix|do|change|make|update|look at)\s+(it|this|that)$/i,
      /^(help|fix|do|change|make|update)\s+(me|with|this)$/i,
      /^(what|how|why)\s+(about|should)$/i,
      /the thing/i,
      /that stuff/i,
      /^.{1,15}$/  // Very short questions (under 15 chars)
    ],
    weight: 0.7
  },
  missing_context: {
    patterns: [
      /\b(it|this|that)\b(?!\s+(is|was|works|means|does))/i,  // Pronouns without clear referent
      /^(debug|fix|solve|resolve)\s*$/i,  // Action without target
      /^(show|tell|explain)\s*(me)?\s*$/i  // Incomplete requests
    ],
    weight: 0.6
  },
  multi_interpretation: {
    patterns: [
      /\b(or|either|maybe)\b.*\?$/i,  // Questions with alternatives
      /what('s| is) the (best|right|correct) way/i  // No context for "best"
    ],
    weight: 0.5
  }
}

// Patterns that indicate clarity - no clarification needed
const CLARITY_INDICATORS = {
  factual: {
    patterns: [
      /^what (is|are|was|were|does|do)\s+\w+/i,  // "What is X"
      /^how (to|do you|does|can|should)\s+\w+/i,  // "How to X"
      /^why (does|do|is|are|did)\s+\w+/i,  // "Why does X"
      /^(explain|describe)\s+\w+/i,  // "Explain X"
      /^(define|definition of)\s+\w+/i  // Definitions
    ],
    weight: 0.8
  },
  specific_code: {
    patterns: [
      /```[\s\S]+```/,  // Contains code block
      /\b(function|class|const|let|var|import|export|def|public|private)\b/i,  // Code keywords
      /\.(js|ts|py|java|cpp|go|rs|rb|php|swift|kt|cs)\b/i  // File extensions
    ],
    weight: 0.9
  },
  technical_specific: {
    patterns: [
      /\b(error|exception|bug|issue|problem):\s*.+/i,  // Error messages
      /\b(version|v\d+\.\d+|npm|pip|gradle|maven)\b/i,  // Versioning/package managers
      /\b(api|endpoint|route|http|rest|graphql)\b/i  // API-specific
    ],
    weight: 0.7
  }
}

class ClarificationService {
  /**
   * @param {object} aiProvider - Provider for AI analysis (optional)
   * @param {object} model - Model for clarification detection (optional)
   */
  constructor(aiProvider = null, model = null) {
    this.aiProvider = aiProvider
    this.model = model
  }

  /**
   * Check if a question needs clarification.
   *
   * @param {string} question - User's question
   * @param {object} userProfile - User profile (for engagement preferences)
   * @returns {Promise<{needsClarification: boolean, confidence: number, reason: string, suggestedClarification: string|null}>}
   */
  async check(question, userProfile = {}) {
    if (!question || typeof question !== 'string') {
      return this._noNeedResult('empty_input')
    }

    // Skip if user preferences disable clarifications
    if (userProfile.engagement_preferences?.askClarifications === false) {
      return this._noNeedResult('clarifications_disabled_by_user')
    }

    // Skip very short questions that are clearly incomplete
    if (question.trim().length < MIN_LENGTH_FOR_CHECK) {
      return {
        needsClarification: true,
        confidence: 0.95,
        reason: 'Question is too short to understand',
        suggestedClarification: 'Could you tell me more about what you need help with?'
      }
    }

    //  Fast heuristic check
    const heuristicResult = this._heuristicCheck(question)

    // If strongly clear or strongly ambiguous, return heuristic result
    if (heuristicResult.confidence >= 0.85) {
      return heuristicResult
    }

    //  AI analysis for borderline cases
    if (this.aiProvider && this.model && heuristicResult.confidence < 0.7) {
      try {
        return await this._aiCheck(question)
      } catch (error) {
        console.error(`⚠️ Clarification AI check failed, using heuristic: ${error.message}`)
        return heuristicResult
      }
    }

    return heuristicResult
  }

  /**
   * Phase 8: Context-aware clarification check.
   * FIRST checks if the question references something in the conversation
   * history before evaluating ambiguity. This prevents false positives
   * on follow-up questions like "social feeds?" after a response that
   * mentioned social feeds.
   *
   * @param {string}   question             - User's question
   * @param {object[]} conversationHistory  - Recent messages [{role, content}]
   * @param {object}   userProfile          - User profile
   * @returns {Promise<{needsClarification: boolean, confidence: number, reason: string}>}
   */
  async checkWithContext(question, conversationHistory = [], userProfile = {}) {
    if (!question || typeof question !== 'string') {
      return this._noNeedResult('empty_input')
    }

    // Skip if user preferences disable clarifications
    if (userProfile.engagement_preferences?.askClarifications === false) {
      return this._noNeedResult('clarifications_disabled_by_user')
    }

    // ── Phase 8 SHORT-CIRCUIT: Check conversation context FIRST ──
    // If the question references something from the last AI response,
    // it's NOT ambiguous — it's a follow-up.
    if (conversationHistory && conversationHistory.length > 0) {
      const lastAssistantMsg = conversationHistory
        .filter(m => m.role === 'assistant')
        .pop()

      if (lastAssistantMsg && lastAssistantMsg.content) {
        const referenced = this._questionReferencesResponse(question, lastAssistantMsg.content)
        if (referenced) {
          console.log(`   → Phase 8 short-circuit: "${question}" references previous response`)
          return {
            needsClarification: false,
            confidence: 0.95,
            reason: `Follow-up referencing previous response: "${referenced}"`,
            suggestedClarification: null,
            method: 'context-shortcircuit'
          }
        }
      }
    }

    // Fall through to standard check if no context match
    return this.check(question, userProfile)
  }

  /**
   * Phase 8: Check if a question references something from the previous AI response.
   * Extracts key terms from the question and checks if they appear in the response.
   * @private
   */
  _questionReferencesResponse(question, responseContent) {
    if (!question || !responseContent) return null

    const lowerQ = question.toLowerCase().replace(/[?!.,]/g, '').trim()
    const lowerR = responseContent.toLowerCase()

    // Extract meaningful words from the question (skip stop words)
    const stopWords = new Set([
      'what', 'about', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
      'how', 'why', 'can', 'you', 'tell', 'me', 'more', 'do', 'does',
      'that', 'this', 'it', 'i', 'my', 'your', 'to', 'of', 'in', 'on',
      'for', 'with', 'and', 'or', 'but', 'not', 'so', 'if'
    ])

    const questionWords = lowerQ.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))

    // Check if multi-word phrases from the question appear in the response
    // (e.g., "social feeds" → check if "social feeds" appears in response)
    if (questionWords.length >= 2) {
      const phrase = questionWords.join(' ')
      if (lowerR.includes(phrase)) {
        return phrase
      }
    }

    // Check individual meaningful words
    for (const word of questionWords) {
      if (word.length >= 4 && lowerR.includes(word)) {
        return word
      }
    }

    return null
  }

  /**
   * Fast heuristic clarification check.
   * @private
   */
  _heuristicCheck(question) {
    let ambiguityScore = 0
    let clarityScore = 0
    const ambiguityReasons = []
    const clarityReasons = []

    // Check ambiguity indicators
    for (const [category, config] of Object.entries(AMBIGUITY_INDICATORS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(question)) {
          ambiguityScore += config.weight
          ambiguityReasons.push(category)
          break  // Only count each category once
        }
      }
    }

    // Check clarity indicators
    for (const [category, config] of Object.entries(CLARITY_INDICATORS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(question)) {
          clarityScore += config.weight
          clarityReasons.push(category)
          break  // Only count each category once
        }
      }
    }

    // Calculate confidence
    const netScore = clarityScore - ambiguityScore
    let needsClarification = false
    let confidence = 0.5

    if (netScore > 0.5) {
      // Clearly doesn't need clarification
      needsClarification = false
      confidence = Math.min(0.9, 0.6 + netScore * 0.2)
    } else if (netScore < -0.3) {
      // Likely needs clarification
      needsClarification = true
      confidence = Math.min(0.9, 0.6 + Math.abs(netScore) * 0.2)
    } else {
      // Borderline - lean toward not asking
      needsClarification = false
      confidence = 0.5 + Math.abs(netScore) * 0.1
    }

    const reason = needsClarification
      ? `Detected: ${ambiguityReasons.join(', ')}`
      : clarityReasons.length > 0
        ? `Question is clear: ${clarityReasons.join(', ')}`
        : 'Question appears clear enough to answer'

    return {
      needsClarification,
      confidence,
      reason,
      suggestedClarification: needsClarification
        ? this._generateHeuristicClarification(question, ambiguityReasons)
        : null,
      method: 'heuristic'
    }
  }

  /**
   * Generate a clarification question based on detected ambiguity.
   * @private
   */
  _generateHeuristicClarification(question, reasons) {
    if (reasons.includes('vague') && question.length < 20) {
      return 'Could you provide more details about what you\'re trying to accomplish?'
    }
    if (reasons.includes('missing_context')) {
      return 'Could you share more context about what "it" refers to or what you\'re working with?'
    }
    if (reasons.includes('multi_interpretation')) {
      return 'There are a few directions I could go with this. Which aspect would you like me to focus on?'
    }
    return 'Could you tell me a bit more about what you need?'
  }

  /**
   * AI-powered clarification check.
   * @private
   */
  async _aiCheck(question) {
    const prompt = buildClarificationCheckPrompt(question)
    const response = await this.aiProvider.callModel(this.model, prompt)

    try {
      let cleaned = response.output.trim()
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return {
        needsClarification: !!parsed.needsClarification,
        confidence: parsed.confidence || 0.7,
        reason: parsed.reason || 'AI analysis',
        suggestedClarification: parsed.needsClarification ? parsed.suggestedClarification : null,
        method: 'ai'
      }
    } catch (parseError) {
      console.error(`⚠️ Failed to parse clarification AI response: ${parseError.message}`)
      return this._noNeedResult('ai_parse_error')
    }
  }

  /**
   * Build the actual clarification response to send to user.
   *
   * @param {object} checkResult - Result from check()
   * @param {string} originalQuestion - Original user question
   * @returns {string} Formatted clarification message
   */
  formatClarificationMessage(checkResult, originalQuestion) {
    if (!checkResult.needsClarification) {
      return null
    }

    return buildClarificationResponse(
      originalQuestion,
      checkResult.suggestedClarification || 'Could you provide more details?'
    )
  }

  /**
   * Return no-need-for-clarification result.
   * @private
   */
  _noNeedResult(reason) {
    return {
      needsClarification: false,
      confidence: 0.9,
      reason,
      suggestedClarification: null
    }
  }
}

module.exports = ClarificationService
