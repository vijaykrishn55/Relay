const fs = require('fs')
const path = require('path')

const CONVERSATIONS_DIR = path.join(__dirname, '..', 'data', 'conversations')

// Ensure the conversations directory exists
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true })
}

class ConversationMemory {
  constructor(groqProvider, routerModel) {
    this.groqProvider = groqProvider
    this.routerModel = routerModel
  }

  getFilePath(sessionId) {
    // Sanitize sessionId to prevent path traversal
    const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '')
    return path.join(CONVERSATIONS_DIR, `${safe}.json`)
  }

  load(sessionId) {
    const filePath = this.getFilePath(sessionId)
    if (!fs.existsSync(filePath)) {
      return { sessionId, entries: [], createdAt: new Date().toISOString() }
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }

  save(sessionId, data) {
    const filePath = this.getFilePath(sessionId)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Build a system context string from stored summaries.
   * Returns null if no prior conversation exists.
   */
  buildContext(sessionId) {
    const data = this.load(sessionId)
    if (!data.entries || data.entries.length === 0) return null

    const lines = data.entries.map((e, i) =>
      `[${i + 1}] User: ${e.userSummary}\n    AI (${e.model}): ${e.responseSummary}`
    ).join('\n')

    return `You are continuing an ongoing conversation. Here is a summary of what was discussed so far:\n\n${lines}\n\nUse this context to give coherent, relevant responses. Do not repeat information unless asked.`
  }

  /**
   * After an exchange, call Compound Mini to extract key points,
   * then append to the session file.
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
        // If extraction fails, create simple summaries ourselves
        parsed = {
          userSummary: userMessage.length > 120 ? userMessage.substring(0, 120) + '...' : userMessage,
          responseSummary: aiResponse.length > 200 ? aiResponse.substring(0, 200) + '...' : aiResponse
        }
      }

      const data = this.load(sessionId)
      data.entries.push({
        userSummary: parsed.userSummary,
        responseSummary: parsed.responseSummary,
        model: modelName,
        timestamp: new Date().toISOString()
      })

      // Keep only the last 50 exchanges to prevent unbounded growth
      if (data.entries.length > 50) {
        data.entries = data.entries.slice(-50)
      }

      this.save(sessionId, data)
      console.log(`💾 Saved conversation summary for session ${sessionId} (${data.entries.length} entries)`)

    } catch (error) {
      // Non-critical — log and move on, don't break the chat
      console.error('⚠️ Failed to record conversation summary:', error.message)
    }
  }
}

module.exports = ConversationMemory
