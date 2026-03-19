const { query } = require('../data/db')
const { getUserProfile, mergeIntoProfile, buildProfileContext } = require('../data/userProfile')
const {
  createSessionSummary,
  hasSessionSummary,
  getLastSessionSummary,
  buildSummaryContext
} = require('../data/sessionSummary')

/**
 * PersistentMemoryService
 *
 * This service handles:
 * 1. Session Summarization - When a session ends, summarize it comprehensively
 * 2. User Profile Extraction - Extract user info from session and merge into profile
 * 3. Context Building - Combine profile + last session summary for new chats
 */
class PersistentMemoryService {
  constructor(aiProvider, summarizerModel) {
    this.aiProvider = aiProvider
    this.summarizerModel = summarizerModel
  }

  /**
   * Summarize a completed session and extract user information.
   * Called when a new session is created (to summarize the previous one).
   *
   * @param {string} sessionId - The session ID to summarize
   * @returns {Object|null} The created summary, or null if no summarization needed
   */
  async summarizeSession(sessionId) {
    try {
      // Check if already summarized
      if (await hasSessionSummary(sessionId)) {
        console.log(`📋 Session ${sessionId} already summarized, skipping`)
        return null
      }

      // Fetch all messages for the session
      const messages = await query(
        'SELECT role, content, model, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
        [sessionId]
      )

      // Don't summarize if no messages or only 1 message
      if (!messages || messages.length < 2) {
        console.log(`📋 Session ${sessionId} has insufficient messages (${messages?.length || 0}), skipping summarization`)
        return null
      }

      // Build conversation transcript
      const transcript = messages
        .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n\n')

      // Create the summarization prompt
      const summarizationPrompt = `Analyze this conversation and create a structured summary. Return ONLY valid JSON, no markdown.

CONVERSATION:
${transcript.substring(0, 8000)}

Return this exact JSON structure:
{
  "summary": "<2-4 sentence comprehensive summary of what was discussed and accomplished>",
  "topics": ["<topic1>", "<topic2>"],
  "outcomes": ["<decision or result 1>", "<result 2>"],
  "user_info": {
    "name": "<user's name if explicitly stated, or null>",
    "preferences": ["<communication preference>"],
    "interests": ["<topic they're interested in>"],
    "personal_facts": ["<fact about the user they mentioned>"]
  }
}

Guidelines:
- summary: Capture the essence of the entire conversation
- topics: List 2-5 main subjects discussed
- outcomes: List any decisions made, solutions found, or conclusions reached
- user_info: ONLY include information the user explicitly stated about themselves
- For user_info arrays, use empty arrays [] if nothing was mentioned
- Do not infer or assume - only include what was directly stated`

      console.log(`🔄 Generating summary for session ${sessionId}...`)

      const result = await this.aiProvider.callModel(this.summarizerModel, summarizationPrompt)

      // Parse the AI response
      let parsed
      try {
        let cleaned = result.output.trim()
        // Remove markdown code blocks if present
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (parseError) {
        console.error(`⚠️ Failed to parse summary JSON for session ${sessionId}:`, parseError.message)
        // Create a basic summary from the conversation
        const userMessages = messages.filter(m => m.role === 'user')
        const firstUserMessage = userMessages[0]?.content || 'conversation'

        parsed = {
          summary: `Discussion about: ${firstUserMessage.substring(0, 200)}${firstUserMessage.length > 200 ? '...' : ''}`,
          topics: [],
          outcomes: [],
          user_info: {}
        }
      }

      // Create the session summary in database
      const sessionSummary = await createSessionSummary({
        session_id: sessionId,
        summary: parsed.summary || 'Session recorded',
        topics: parsed.topics || [],
        outcomes: parsed.outcomes || [],
        user_info_extracted: parsed.user_info || {}
      })

      console.log(`✅ Created summary for session ${sessionId}`)

      // Merge extracted user info into profile (non-blocking)
      if (parsed.user_info && Object.keys(parsed.user_info).length > 0) {
        try {
          await mergeIntoProfile(parsed.user_info)
          console.log(`👤 Updated user profile with extracted info`)
        } catch (profileError) {
          console.error(`⚠️ Failed to merge user info:`, profileError.message)
        }
      }

      return sessionSummary

    } catch (error) {
      console.error(`❌ Error summarizing session ${sessionId}:`, error.message)
      return null
    }
  }

  /**
   * Find the most recent session that needs summarization.
   * Called when a new session is created.
   *
   * @param {string} excludeSessionId - The new session ID to exclude
   * @returns {string|null} Session ID that needs summarization, or null
   */
  async findSessionToSummarize(excludeSessionId) {
    try {
      // Find the most recent session (other than the new one) that:
      // 1. Has messages
      // 2. Doesn't already have a summary
      const rows = await query(`
        SELECT s.id, COUNT(m.id) as message_count
        FROM sessions s
        LEFT JOIN messages m ON m.session_id = s.id
        LEFT JOIN session_summaries ss ON ss.session_id = s.id
        WHERE s.id != ? AND ss.id IS NULL
        GROUP BY s.id
        HAVING message_count >= 2
        ORDER BY s.updated_at DESC
        LIMIT 1
      `, [excludeSessionId])

      return rows.length > 0 ? rows[0].id : null
    } catch (error) {
      console.error('Error finding session to summarize:', error.message)
      return null
    }
  }

  /**
   * Build the full persistent context for a new conversation.
   * Combines: User Profile + Last Session Summary
   *
   * @param {string} currentSessionId - The current session (to exclude from last session lookup)
   * @returns {string} Combined context string for the AI system prompt
   */
  async buildPersistentContext(currentSessionId = null) {
    const parts = []

    try {
      // 1. Load User Profile (always)
      const profile = await getUserProfile()
      const profileContext = buildProfileContext(profile)
      if (profileContext) {
        parts.push(profileContext)
      }

      // 2. Load Last Session Summary (if exists)
      const lastSummary = await getLastSessionSummary(currentSessionId)
      const summaryContext = buildSummaryContext(lastSummary)
      if (summaryContext) {
        parts.push(summaryContext)
      }

    } catch (error) {
      console.error('Error building persistent context:', error.message)
    }

    if (parts.length === 0) return ''

    return `${parts.join('\n\n')}

Use this context to provide personalized, continuous responses.
Do not mention this context unless directly asked about previous conversations or user preferences.`
  }

  /**
   * Process a new session creation:
   * 1. Find the previous session
   * 2. Summarize it if needed
   * 3. Return context for the new session
   *
   * @param {string} newSessionId - The newly created session ID
   * @returns {Object} { context: string, summarizedSessionId: string|null }
   */
  async onNewSessionCreated(newSessionId) {
    // Find and summarize the previous session (non-blocking to user experience)
    const sessionToSummarize = await this.findSessionToSummarize(newSessionId)

    let summarizedSessionId = null
    if (sessionToSummarize) {
      // Run summarization in background (don't await fully to keep session creation fast)
      this.summarizeSession(sessionToSummarize)
        .then(summary => {
          if (summary) {
            console.log(`📝 Background summarization complete for session ${sessionToSummarize}`)
          }
        })
        .catch(err => {
          console.error(`⚠️ Background summarization failed:`, err.message)
        })
      summarizedSessionId = sessionToSummarize
    }

    // Build context for the new session
    const context = await this.buildPersistentContext(newSessionId)

    return {
      context,
      summarizedSessionId
    }
  }

  /**
   * Force summarize a specific session (for manual triggering)
   */
  async forceSummarizeSession(sessionId) {
    // Remove existing summary if present
    await query('DELETE FROM session_summaries WHERE session_id = ?', [sessionId])
    return this.summarizeSession(sessionId)
  }
}

module.exports = PersistentMemoryService
