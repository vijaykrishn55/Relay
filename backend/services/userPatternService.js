/**
 * User Pattern Service —User Intelligence
 *
 * Tracks user behavior patterns in the background
 * to personalize future responses.
 *
 * Pattern types:
 *   - topic_engagement: What topics the user engages with deeply
 *   - response_feedback: Signals from regeneration, follow-ups
 *   - session_timing: When the user is active
 *   - query_style: How the user asks questions
 *
 * IMPORTANT: All pattern recording runs as background tasks.
 * They never block the user's response.
 */

const { query } = require('../data/db')

class UserPatternService {
  constructor() {
    this.userId = 1 // Single-user assumption
  }

  /**
   * Record a topic engagement pattern.
   * Called after a successful response when the user engages
   * with a topic (follow-ups, deep-dives).
   *
   * @param {string} topic     - The topic being engaged with
   * @param {number} depth     - How deep into the topic (follow-up count)
   * @param {number} sessionDepth - How many messages deep in the session
   */
  async recordTopicEngagement(topic, depth = 1, sessionDepth = 1) {
    if (!topic) return

    try {
      const patternValue = JSON.stringify({
        lastDepth: depth,
        lastSessionDepth: sessionDepth,
        lastEngaged: new Date().toISOString()
      })

      await query(
        `INSERT INTO user_patterns (user_id, pattern_type, pattern_key, pattern_value, occurrence_count, last_occurrence)
         VALUES (?, 'topic_engagement', ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           pattern_value = ?,
           occurrence_count = occurrence_count + 1,
           last_occurrence = NOW()`,
        [this.userId, topic.toLowerCase(), patternValue, patternValue]
      )
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to record topic engagement: ${error.message}`)
    }
  }

  /**
   * Record a response feedback signal.
   * Called when user regenerates, gives feedback, or asks follow-ups.
   *
   * @param {string} signalType - 'regenerate' | 'follow_up' | 'too_long' | 'too_short'
   * @param {object} metadata   - Additional context (topic, response length, etc.)
   */
  async recordFeedback(signalType, metadata = {}) {
    try {
      const patternValue = JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString()
      })

      await query(
        `INSERT INTO user_patterns (user_id, pattern_type, pattern_key, pattern_value, occurrence_count, last_occurrence)
         VALUES (?, 'response_feedback', ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           pattern_value = ?,
           occurrence_count = occurrence_count + 1,
           last_occurrence = NOW()`,
        [this.userId, signalType, patternValue, patternValue]
      )
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to record feedback: ${error.message}`)
    }
  }

  /**
   * Record query style pattern.
   * Tracks how the user asks questions (short, long, technical, casual).
   *
   * @param {string} question - The user's question
   */
  async recordQueryStyle(question) {
    if (!question) return

    try {
      const wordCount = question.trim().split(/\s+/).length
      const style = this._classifyQueryStyle(question)

      const patternValue = JSON.stringify({
        avgWordCount: wordCount,
        style,
        timestamp: new Date().toISOString()
      })

      await query(
        `INSERT INTO user_patterns (user_id, pattern_type, pattern_key, pattern_value, occurrence_count, last_occurrence)
         VALUES (?, 'query_style', ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           pattern_value = ?,
           occurrence_count = occurrence_count + 1,
           last_occurrence = NOW()`,
        [this.userId, style, patternValue, patternValue]
      )
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to record query style: ${error.message}`)
    }
  }

  /**
   * Get the user's top engaged topics.
   * Used to personalize suggestions and follow-ups.
   *
   * @param {number} limit - Max topics to return
   * @returns {Promise<Array<{topic: string, count: number}>>}
   */
  async getTopTopics(limit = 5) {
    try {
      const rows = await query(
        `SELECT pattern_key AS topic, occurrence_count AS count, pattern_value
         FROM user_patterns
         WHERE user_id = ? AND pattern_type = 'topic_engagement'
         ORDER BY occurrence_count DESC, last_occurrence DESC
         LIMIT ?`,
        [this.userId, limit]
      )
      return rows.map(r => ({
        topic: r.topic,
        count: r.count,
        value: typeof r.pattern_value === 'string' ? JSON.parse(r.pattern_value) : r.pattern_value
      }))
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to get top topics: ${error.message}`)
      return []
    }
  }

  /**
   * Get the user's dominant query style.
   *
   * @returns {Promise<string>} - 'technical' | 'casual' | 'formal' | 'brief'
   */
  async getDominantStyle() {
    try {
      const rows = await query(
        `SELECT pattern_key AS style, occurrence_count AS count
         FROM user_patterns
         WHERE user_id = ? AND pattern_type = 'query_style'
         ORDER BY occurrence_count DESC
         LIMIT 1`,
        [this.userId]
      )
      return rows.length > 0 ? rows[0].style : 'casual'
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to get dominant style: ${error.message}`)
      return 'casual'
    }
  }

  /**
   * Record a feedback signal to the feedback_signals table.
   *
   * @param {string} sessionId  - Session ID
   * @param {number} messageId  - Message ID (nullable)
   * @param {string} signalType - 'like' | 'dislike' | 'correction' | 'regenerate' | 'follow_up'
   * @param {object} signalData - Additional data
   */
  async recordFeedbackSignal(sessionId, messageId, signalType, signalData = {}) {
    try {
      await query(
        `INSERT INTO feedback_signals (session_id, message_id, signal_type, signal_data)
         VALUES (?, ?, ?, ?)`,
        [sessionId, messageId || null, signalType, JSON.stringify(signalData)]
      )
    } catch (error) {
      console.error(`⚠️ UserPattern: Failed to record feedback signal: ${error.message}`)
    }
  }

  /**
   * Classify the style of a user's question.
   * @private
   */
  _classifyQueryStyle(question) {
    const lower = question.toLowerCase()
    const wordCount = question.trim().split(/\s+/).length

    // Check for technical markers
    if (/\b(function|class|const|let|var|import|export|api|endpoint|async|await)\b/.test(question)) {
      return 'technical'
    }

    // Check for very informal markers
    if (/\b(yo|hey|sup|lol|btw|tbh|nah)\b/.test(lower) || wordCount <= 5) {
      return 'brief'
    }

    // Check for formal markers
    if (/\b(regarding|pertaining|furthermore|additionally|kindly)\b/.test(lower)) {
      return 'formal'
    }

    return 'casual'
  }
}

module.exports = UserPatternService
