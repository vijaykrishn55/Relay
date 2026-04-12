/**
 * Context Builder Service — Phase 8: User Intelligence
 *
 * Constructs the context window sent to AI models using
 * a priority-based budget allocation system.
 *
 * Priority 1: Immediate conversation (last 3 Q&A pairs) — 4000 chars
 * Priority 2: Session summary (compressed history)       — 2000 chars
 * Priority 3: User profile (style + expertise, NO name)  — 500 chars
 * Priority 4: Relevant memories (keyword-matched)        — 1500 chars
 *
 * Total budget: ~8000 chars (~2000 tokens)
 */

const { query } = require('../data/db')

const CONTEXT_BUDGET = {
  immediateConversation: 2000,
  sessionSummary: 1000,
  userProfile: 500,
  memories: 1000
}

class ContextBuilder {
  /**
   * Build full context for a model call.
   *
   * @param {string}  sessionId    - Current session ID
   * @param {object}  userProfile  - Parsed user profile (from getUserProfile)
   * @param {string}  memoryContext - Pre-built memory context from memoryService
   * @returns {Promise<{ contextString: string, layers: object }>}
   */
  async build(sessionId, userProfile = {}, memoryContext = '') {
    const layers = {}

    // ── Priority 1: Last 3 Q&A pairs from current session ──
    layers.immediateConversation = await this._getRecentQAPairs(sessionId)

    // ── Priority 2: Session summary (older exchanges, compressed) ──
    layers.sessionSummary = await this._getSessionSummary(sessionId)

    // ── Priority 3: User profile (NO name — key fix) ──
    layers.userProfile = this._buildProfileContext(userProfile)

    // ── Priority 4: Relevant memories ──
    layers.memories = this._truncate(memoryContext, CONTEXT_BUDGET.memories)

    // Assemble all layers into a single context string
    const contextString = this._assembleContext(layers)

    return { contextString, layers }
  }

  /**
   * Get the last 3 Q&A pairs from a session (verbatim).
   * This is Priority 1 — the most important context layer.
   * @private
   */
  async _getRecentQAPairs(sessionId) {
    if (!sessionId) return ''

    try {
      const rows = await query(
        `SELECT role, content FROM messages 
         WHERE session_id = ? AND role IN ('user', 'assistant')
         ORDER BY timestamp DESC LIMIT 6`,
        [sessionId]
      )

      if (!rows || rows.length === 0) return ''

      // Reverse to chronological order
      rows.reverse()

      // Group into Q&A pairs
      const pairs = []
      for (let i = 0; i < rows.length; i += 2) {
        const userMsg = rows[i]
        const assistantMsg = rows[i + 1]

        if (userMsg && userMsg.role === 'user') {
          let pair = `User: ${userMsg.content}`
          if (assistantMsg && assistantMsg.role === 'assistant') {
            pair += `\nAssistant: ${assistantMsg.content}`
          }
          pairs.push(pair)
        }
      }

      const joined = pairs.join('\n\n')
      return this._truncate(joined, CONTEXT_BUDGET.immediateConversation)
    } catch (error) {
      console.error(`⚠️ ContextBuilder: Failed to get recent Q&A: ${error.message}`)
      return ''
    }
  }

  /**
   * Get compressed session summary (for long conversations).
   * @private
   */
  async _getSessionSummary(sessionId) {
    if (!sessionId) return ''

    try {
      const rows = await query(
        `SELECT summary FROM session_summaries WHERE session_id = ?`,
        [sessionId]
      )

      if (!rows || rows.length === 0) return ''

      return this._truncate(rows[0].summary || '', CONTEXT_BUDGET.sessionSummary)
    } catch (error) {
      console.error(`⚠️ ContextBuilder: Failed to get session summary: ${error.message}`)
      return ''
    }
  }

  /**
   * Build the profile context WITHOUT the user's name.
   * Key Phase 8 fix: name is never sent to the model.
   * @private
   */
  _buildProfileContext(profile) {
    if (!profile) return ''

    const parts = []

    // Communication style
    if (profile.communication_style) {
      parts.push(`Communication style: ${profile.communication_style}`)
    }

    // Expertise levels
    if (profile.expertise_levels && typeof profile.expertise_levels === 'object') {
      const entries = Object.entries(profile.expertise_levels)
      if (entries.length > 0) {
        parts.push(`Expertise: ${entries.map(([t, l]) => `${t}:${l}`).join(', ')}`)
      }
    }

    // Interests (topics, not name)
    if (profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) {
      parts.push(`Interests: ${profile.interests.join(', ')}`)
    }

    // Engagement preferences
    if (profile.engagement_preferences && typeof profile.engagement_preferences === 'object') {
      if (profile.engagement_preferences.detailLevel) {
        parts.push(`Detail level: ${profile.engagement_preferences.detailLevel}`)
      }
    }

    // Response preferences
    if (profile.response_preferences && typeof profile.response_preferences === 'object') {
      const rp = profile.response_preferences
      if (rp.preferredLength) parts.push(`Preferred length: ${rp.preferredLength}`)
      if (rp.codeExamplesFirst) parts.push(`Prefers code examples first`)
    }

    if (parts.length === 0) return ''

    const joined = parts.join('\n')
    return this._truncate(joined, CONTEXT_BUDGET.userProfile)
  }

  /**
   * Assemble all context layers into a single string.
   * @private
   */
  _assembleContext(layers) {
    const sections = []

    // No explicit headers — prevents models from echoing them back
    if (layers.immediateConversation) {
      sections.push(layers.immediateConversation)
    }

    if (layers.sessionSummary) {
      sections.push(layers.sessionSummary)
    }

    if (layers.userProfile) {
      sections.push(layers.userProfile)
    }

    if (layers.memories) {
      sections.push(layers.memories)
    }

    return sections.join('\n\n')
  }

  /**
   * Truncate text to a maximum length, cutting at the last complete sentence.
   * @private
   */
  _truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text || ''

    const truncated = text.substring(0, maxLength)
    // Try to cut at the last sentence boundary
    const lastPeriod = truncated.lastIndexOf('.')
    const lastNewline = truncated.lastIndexOf('\n')
    const cutPoint = Math.max(lastPeriod, lastNewline)

    if (cutPoint > maxLength * 0.8) {
      return truncated.substring(0, cutPoint + 1)
    }
    return truncated
  }
}

module.exports = ContextBuilder
