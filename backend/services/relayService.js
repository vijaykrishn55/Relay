const { query } = require('../data/db')

class RelayService {
  constructor(aiProvider, routerModel) {
    this.aiProvider = aiProvider
    this.routerModel = routerModel
  }

  /**
   * Build a merged prompt that combines the original question with a follow-up.
   * The AI should produce a single comprehensive response that addresses both.
   */
  buildFollowUpPrompt(originalQuestion, originalResponse, followUpQuestion) {
    return `You previously answered a question. The user now has a follow-up that should be incorporated into a revised, comprehensive answer.

ORIGINAL QUESTION:
${originalQuestion}

YOUR PREVIOUS ANSWER:
${originalResponse}

USER'S FOLLOW-UP:
${followUpQuestion}

INSTRUCTIONS:
- Produce a single, comprehensive response that answers BOTH the original question AND the follow-up.
- Do NOT say "as I mentioned before" or reference the previous answer — write as if this is a fresh, complete response.
- Incorporate insights from the follow-up naturally into the response.
- The response should be self-contained — someone reading it should not need to see the follow-up question separately.
- Maintain the same level of detail and formatting as the original response.`
  }

  /**
   * Classify whether the user's input is a follow-up refinement or a new-session request.
   * Returns { intent: 'follow_up' | 'new_session', topic?: string }
   */
  async classifyIntent(userInput, originalQuestion, originalResponse) {
    const classifyPrompt = `You are an intent classifier for a chat relay system 

The user clicked "Relay" on an AI response and typed something in the input.
You must determine: is the user asking a FOLLOW-UP question to refine that response, or requesting to START A NEW SESSION on a specific topic from the conversation?

ORIGINAL QUESTION the user asked:
"${originalQuestion}"

AI RESPONSE they are relaying on:
"${originalResponse.substring(0, 500)}"

USER'S NEW INPUT:
"${userInput}"

Rules:
- "follow_up": The user wants more detail, clarification, a different angle, or wants to refine/expand the current response. Examples: "what about edge cases?", "explain #3 in detail", "can you also cover X?"
- "new_session": The user explicitly wants to START a new session, branch off, or focus on a specific sub-topic FROM the conversation. They mention a specific topic name/subject. Examples: "start new session on React hooks", "branch into ASEAN cooperation", "new chat about database indexing"

Return ONLY this JSON:
{ "intent": "follow_up" }
OR
{ "intent": "new_session", "topic": "<the specific topic they want>" }

No other text, ONLY the JSON.`

    try {
      const result = await this.aiProvider.callModel(this.routerModel, classifyPrompt)
      let jsonStr = result.output
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) jsonStr = jsonMatch[0]
      return JSON.parse(jsonStr)
    } catch (err) {
      console.error('Intent classification failed:', err.message)
      // Default to follow_up on failure
      return { intent: 'follow_up' }
    }
  }

  /**
   * Extract topic clusters from a session's messages using AI classification.
   * Returns an array of topics, each with matched message indices.
   */
  async extractTopics(sessionId) {
    const messages = await query(
      'SELECT id, role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    if (messages.length < 2) return []

    // Build a numbered transcript for the AI to reference
    const transcript = messages
      .map((m, i) => `[${i}][${m.role.toUpperCase()}]: ${m.content.substring(0, 300)}`)
      .join('\n\n')

    const classificationPrompt = `Analyze this conversation and identify distinct topics discussed. For each topic, list which message indices belong to it.

CONVERSATION:
${transcript}

Respond in this exact JSON format:
{
  "topics": [
    {
      "name": "<short topic name>",
      "description": "<1-sentence description>",
      "messageIndices": [0, 1, 4, 5],
      "relevance": "high"
    }
  ]
}

Rules:
- A message can belong to multiple topics
- Include ALL messages in at least one topic
- Order topics by relevance (most discussed first)
- Topic names should be concise (2-4 words)
- relevance must be one of: "high", "medium", "low"
- Return ONLY the JSON, no other text`

    try {
      const result = await this.aiProvider.callModel(this.routerModel, classificationPrompt)

      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = result.output
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const parsed = JSON.parse(jsonStr)
      return parsed.topics || []
    } catch (err) {
      console.error('Topic extraction failed:', err.message)
      return []
    }
  }

  /**
   * Build smart context by extracting ONLY relevant lines/paragraphs from matched messages.
   * Returns a condensed context string, not full message content.
   */
  async buildSmartContext(sessionId, topic, messageIndices) {
    const messages = await query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    if (messages.length === 0 || messageIndices.length === 0) return null

    // Build transcript of only the matched messages
    const matchedContent = messageIndices
      .filter(i => i >= 0 && i < messages.length)
      .map(i => `[${messages[i].role.toUpperCase()}]:\n${messages[i].content}`)
      .join('\n\n---\n\n')

    const extractPrompt = `You are extracting relevant context for a new conversation about a specific topic.

TOPIC: "${topic}"

SOURCE MESSAGES:
${matchedContent}

INSTRUCTIONS:
- Extract ONLY the sentences, paragraphs, or code blocks that are directly relevant to "${topic}"
- Combine the extracted content into a single coherent context block
- Do NOT include greetings, pleasantries, or off-topic content
- Do NOT include meta-commentary like "as mentioned" or "in the previous message"
- Preserve important facts, explanations, code examples, and key points
- Keep the context concise but complete - aim for the essential information only
- Format as a clean summary that can seed a new conversation

OUTPUT FORMAT:
Return ONLY the extracted relevant content as a context block. No JSON, no explanations - just the distilled context.`

    try {
      const result = await this.aiProvider.callModel(this.routerModel, extractPrompt)
      return result.output.trim()
    } catch (err) {
      console.error('Smart context extraction failed:', err.message)
      // Fallback: return first 500 chars of each matched message
      return matchedContent.substring(0, 2000)
    }
  }

  /**
   * Given a user-described topic, find which messages in the session relate to it.
   * Returns a single topic object with matched message indices.
   */
  async extractTopicManual(sessionId, userDescription) {
    const messages = await query(
      'SELECT id, role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )

    if (messages.length < 2) return null

    const transcript = messages
      .map((m, i) => `[${i}][${m.role.toUpperCase()}]: ${m.content.substring(0, 300)}`)
      .join('\n\n')

    const matchPrompt = `The user wants to extract messages about a specific topic from this conversation.

USER'S TOPIC DESCRIPTION:
"${userDescription}"

CONVERSATION:
${transcript}

Find ALL messages related to the user's topic. Return ONLY this JSON:
{
  "name": "<short topic name based on user description>",
  "description": "${userDescription}",
  "messageIndices": [0, 1, 4, 5],
  "relevance": "high"
}

Rules:
- Include messages that are directly or contextually related to the topic
- Include both user and assistant messages in the topic
- If a user asks about the topic, include the assistant's response too
- Return ONLY the JSON, no other text`

    try {
      const result = await this.aiProvider.callModel(this.routerModel, matchPrompt)

      let jsonStr = result.output
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      return JSON.parse(jsonStr)
    } catch (err) {
      console.error('Manual topic extraction failed:', err.message)
      return null
    }
  }
}

module.exports = RelayService
