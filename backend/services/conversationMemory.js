const { query } = require('../data/db')

class ConversationMemory {
  constructor(groqProvider, routerModel) {
    this.groqProvider = groqProvider
    this.routerModel = routerModel
  }

  async load(sessionId) {
    const rows = await query(
      'SELECT user_summary, response_summary, model, timestamp FROM conversation_summaries WHERE session_id = ? ORDER BY timestamp DESC LIMIT 4',
      [sessionId]
    )
    return {
      sessionId,
      entries: rows.map(r => ({
        userSummary: r.user_summary,
        responseSummary: r.response_summary,
        model: r.model,
        timestamp: r.timestamp
      }))
    }
  }

  /**
   * Build a system context string from stored summaries.
   * Returns null if no prior conversation exists.
   */
  async buildContext(sessionId) {
    const data = await this.load(sessionId)
    if (!data.entries || data.entries.length === 0) return null

    // Reverse to chronological (loaded DESC), take only last 2 pairs
    const recent = data.entries.reverse().slice(-2)

    const lines = recent.map(e =>
      `User asked: ${e.userSummary}\nAI answered: ${e.responseSummary}`
    ).join('\n\n')

    return lines
  }

  /**
   * After an exchange, call Compound Mini to extract key points,
   * then insert into the database.
   */
  async recordExchange(sessionId, userMessage, aiResponse, modelName) {
    try {
      const extractPrompt = `Extract concise key points from this exchange. Return ONLY valid JSON, no markdown.

USER SAID: "${userMessage}"

AI RESPONDED: "${aiResponse.substring(0, 1500)}"

Return JSON:
{
  "userSummary": "<1 sentence: what the user asked/wanted>",
  "responseSummary": "<1-2 sentences: key info/answer the AI gave>"
}`

      const result = await this.groqProvider.callModel(this.routerModel, extractPrompt)

      let parsed
      try {
        let cleaned = result.output.trim()
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = {
          userSummary: userMessage.length > 120 ? userMessage.substring(0, 120) + '...' : userMessage,
          responseSummary: aiResponse.length > 200 ? aiResponse.substring(0, 200) + '...' : aiResponse
        }
      }

      await query(
        'INSERT INTO conversation_summaries (session_id, user_summary, response_summary, model) VALUES (?, ?, ?, ?)',
        [sessionId, parsed.userSummary, parsed.responseSummary, modelName]
      )

      // Keep only last 50 per session
      const countRows = await query(
        'SELECT COUNT(*) AS cnt FROM conversation_summaries WHERE session_id = ?',
        [sessionId]
      )
      if (countRows[0].cnt > 50) {
        await query(
          `DELETE FROM conversation_summaries WHERE session_id = ? AND id NOT IN (
            SELECT id FROM (SELECT id FROM conversation_summaries WHERE session_id = ? ORDER BY timestamp DESC LIMIT 50) AS keep
          )`,
          [sessionId, sessionId]
        )
      }

      const data = await this.load(sessionId)

      console.log(`💾 Saved conversation summary for session ${sessionId} (${data.entries.length} entries)`)

    } catch (error) {
      // Non-critical — log and move on, don't break the chat
      console.error('⚠️ Failed to record conversation summary:', error.message)
    }
  }
}

module.exports = ConversationMemory
