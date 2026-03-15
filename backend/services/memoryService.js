const {searchMemories, getAllMemories}= require('../data/memory')

class MemoryService {
  /**
   * Find memories relevant to the user's message.
   * Uses keyword extraction for matching.
   * Returns formatted context string for the system prompt.
   */
  async getRelevantMemories(userMessage, limit = 5) {
    // Extract significant words (skip short/common words)
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like',
      'through', 'after', 'over', 'between', 'out', 'against', 'during',
      'without', 'before', 'under', 'around', 'among', 'it', 'its',
      'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
      'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
      'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
      'not', 'no', 'nor', 'but', 'or', 'and', 'if', 'then', 'else',
      'so', 'just', 'also', 'than', 'very', 'too', 'much', 'more'
    ])

    const keywords = userMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))

    if (keywords.length === 0) return []

    // Search for each keyword and collect unique matches
    const matchMap = new Map() // memoryId → { memory, score }

    for (const keyword of keywords) {
      const results = await searchMemories(keyword)
      for (const memory of results) {
        if (matchMap.has(memory.id)) {
          matchMap.get(memory.id).score += 1
        } else {
          matchMap.set(memory.id, { memory, score: 1 })
        }
      }
    }

    // Sort by relevance score (more keyword matches = more relevant)
    const ranked = Array.from(matchMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => entry.memory)

    return ranked
  }

  /**
   * Build a system prompt section from relevant memories.
   * Returns empty string if no relevant memories found.
   */
  async buildMemoryContext(userMessage) {
    const memories = await this.getRelevantMemories(userMessage)

    if (memories.length === 0) return ''

    const memoryBlock = memories
      .map((m, i) => `${i + 1}. ${m.content}`)
      .join('\n')

    return `\n\n[Recalled Memories — facts the user previously saved as important]\n${memoryBlock}\n\nUse these memories as context if they are relevant to the current question. Do not mention that you are using saved memories unless directly asked.`
  }
}

module.exports = new MemoryService()