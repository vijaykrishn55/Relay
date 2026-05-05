const { query } = require('../data/db')

class RelayService {
  constructor(aiProvider, routerModel) {
    this.aiProvider = aiProvider
    this.routerModel = routerModel
  }

  /**
   * Build a merged prompt that surgically updates only the relevant part of the
   * original response to address the follow-up, keeping everything else verbatim.
   */
  buildFollowUpPrompt(originalQuestion, originalResponse, followUpQuestion) {
    return `You previously gave a response. The user has a follow-up question that relates to a SPECIFIC PART of your response. Your job is to return the FULL response with ONLY the relevant section(s) updated.

ORIGINAL QUESTION:
${originalQuestion}

YOUR PREVIOUS RESPONSE (FULL TEXT — preserve this exactly except where the follow-up applies):
${originalResponse}

USER'S FOLLOW-UP QUESTION:
${followUpQuestion}

CRITICAL INSTRUCTIONS:
1. Identify which paragraph(s) or section(s) of your previous response the follow-up question is about.
2. Modify, expand, or correct ONLY those specific section(s) to address the follow-up.
3. Every paragraph, bullet point, code block, or section that is NOT related to the follow-up MUST be kept EXACTLY word-for-word as it was. Do NOT rephrase, reword, summarize, or reorganize unchanged parts.
4. Do NOT add introductions like "Here's the updated response" or meta-commentary — just output the full response with the surgical edit.
5. Do NOT remove any content from the original response unless the follow-up explicitly asks for removal.
6. Maintain the exact same formatting (markdown, headers, lists, code blocks) as the original.
7. If the follow-up asks for something new that doesn't map to an existing section, append it as a new section at the end.

OUTPUT: Return the complete response with only the targeted section(s) changed.`
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

    // Build transcript of ALL matched messages — include full content for comprehensive extraction
    const matchedContent = messageIndices
      .filter(i => i >= 0 && i < messages.length)
      .map(i => `[${messages[i].role.toUpperCase()}]:\n${messages[i].content}`)
      .join('\n\n---\n\n')

    // Also include any other messages that might tangentially reference the topic
    // (messages not in messageIndices but from the same session)
    const unmatchedRelevant = messages
      .map((m, i) => ({ ...m, idx: i }))
      .filter(m => !messageIndices.includes(m.idx))
      .filter(m => {
        // Quick keyword check — include if topic words appear in content
        const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        const content = m.content.toLowerCase()
        return topicWords.some(w => content.includes(w))
      })

    let extraContext = ''
    if (unmatchedRelevant.length > 0) {
      extraContext = '\n\n--- ADDITIONAL RELATED CONTEXT ---\n\n' +
        unmatchedRelevant
          .map(m => `[${m.role.toUpperCase()}]:\n${m.content}`)
          .join('\n\n---\n\n')
    }

    const extractPrompt = `You are extracting relevant context for a new conversation about a specific topic.

TOPIC: "${topic}"

SOURCE MESSAGES:
${matchedContent}${extraContext}

INSTRUCTIONS:
- Extract ALL sentences, paragraphs, code blocks, and explanations that are relevant to "${topic}"
- Be COMPREHENSIVE — include everything that could be useful for continuing a conversation about this topic
- Include related facts, definitions, examples, code snippets, and explanations
- Include context that helps understand the topic even if not directly about it
- Do NOT include greetings, pleasantries, or completely off-topic content
- Do NOT include meta-commentary like "as mentioned" or "in the previous message"
- Preserve important facts, explanations, code examples, and key points FULLY — do not truncate or summarize them
- Format as a clean, well-organized context block that can seed a new conversation

OUTPUT FORMAT:
Return the extracted relevant content as a comprehensive context block. No JSON, no explanations - just the distilled context.`

    try {
      const result = await this.aiProvider.callModel(this.routerModel, extractPrompt)
      return result.output.trim()
    } catch (err) {
      console.error('Smart context extraction failed:', err.message)
      // Fallback: return full matched content
      return (matchedContent + extraContext).substring(0, 4000)
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

    // Use longer content snippets for better topic matching
    const transcript = messages
      .map((m, i) => `[${i}][${m.role.toUpperCase()}]: ${m.content.substring(0, 800)}`)
      .join('\n\n')

    const matchPrompt = `The user wants to start a NEW conversation about a specific topic, using ALL relevant information from the current conversation.

USER'S TOPIC DESCRIPTION:
"${userDescription}"

CONVERSATION:
${transcript}

Find ALL messages that contain information related to the user's topic. Return ONLY this JSON:
{
  "name": "<short topic name based on user description>",
  "description": "${userDescription}",
  "messageIndices": [0, 1, 4, 5],
  "relevance": "high"
}

Rules:
- Be COMPREHENSIVE — include every message that has ANY relevant information about the topic
- Include messages that are directly, contextually, or tangentially related
- Include both user questions AND their corresponding assistant responses
- If a user asks about the topic, ALWAYS include the full assistant response
- Include messages that provide background context or definitions related to the topic
- When in doubt, INCLUDE the message — it's better to have too much context than too little
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
