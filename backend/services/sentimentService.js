/**
 * Sentiment Service : Conversational Intelligence
 *
 * Detects user emotional state to adapt response tone.
 * Uses a fast heuristic-first approach with AI fallback for accuracy.
 */

const { query } = require('../data/db')

// Sentiment keyword patterns for heuristic analysis
const SENTIMENT_PATTERNS = {
  frustrated: {
    keywords: [
      'frustrat', 'annoying', 'annoyed', 'ugh', 'argh', 'broken', 'doesn\'t work',
      'not working', 'fail', 'error', 'stuck', 'confused', 'don\'t understand',
      'help!', '!!!', 'why won\'t', 'can\'t get', 'keep getting', 'still not'
    ],
    intensity: {
      high: ['!!!', 'so frustrating', 'extremely', 'really annoyed'],
      medium: ['frustrating', 'annoying', 'broken'],
      low: ['not working', 'unclear']
    }
  },
  enthusiastic: {
    keywords: [
      'awesome', 'amazing', 'love', 'great', 'excellent', 'fantastic', 'wonderful',
      'excited', 'cool', 'nice', 'brilliant', 'perfect', '!!!', 'wow', 'incredible'
    ],
    intensity: {
      high: ['love it', 'amazing', 'incredible', '!!!'],
      medium: ['awesome', 'great', 'excellent'],
      low: ['nice', 'cool', 'good']
    }
  },
  confused: {
    keywords: [
      'confused', 'don\'t understand', 'unclear', 'not sure', 'what does',
      'how does', 'can you explain', '???', 'don\'t get', 'lost',
      'don\'t follow', 'what is', 'what\'s the difference'
    ],
    intensity: {
      high: ['completely confused', 'totally lost', '???'],
      medium: ['confused', 'unclear', 'don\'t understand'],
      low: ['not sure', 'what does']
    }
  },
  curious: {
    keywords: [
      'curious', 'interested', 'wondering', 'how does', 'why does',
      'what if', 'tell me more', 'can you explain', 'learn more',
      'interested in', 'what about', 'how about'
    ],
    intensity: {
      high: ['really curious', 'very interested', 'tell me everything'],
      medium: ['curious', 'interested', 'wondering'],
      low: ['what if', 'what about']
    }
  },
  skeptical: {
    keywords: [
      'really?', 'are you sure', 'doubt', 'but', 'however', 'not convinced',
      'skeptical', 'questionable', 'doesn\'t seem', 'why would'
    ],
    intensity: {
      high: ['really doubt', 'definitely not', 'no way'],
      medium: ['skeptical', 'not convinced', 'are you sure'],
      low: ['but', 'however', 'really?']
    }
  }
}

class SentimentService {
  /**
   * @param {object} aiProvider - Provider for AI fallback (e.g., groq)
   * @param {object} model - Compound Mini model for quick sentiment classification
   */
  constructor(aiProvider = null, model = null) {
    this.aiProvider = aiProvider
    this.model = model
  }

  /**
   * Analyze the sentiment of a user question.
   * Uses fast heuristics first, falls back to AI if confidence is low.
   *
   * @param {string} question - User's question/message
   * @returns {Promise<{sentiment: string, intensity: string, confidence: number, method: string}>}
   */
  async analyze(question) {
    if (!question || typeof question !== 'string') {
      return this._neutralSentiment('empty_input')
    }

    // Phase 1: Fast heuristic analysis (~5ms)
    const heuristicResult = this._heuristicAnalysis(question)

    // If confidence is high enough, use heuristic result
    if (heuristicResult.confidence >= 0.8) {
      return heuristicResult
    }

    // Phase 2: AI fallback for low-confidence cases
    if (this.aiProvider && this.model) {
      try {
        const aiResult = await this._aiAnalysis(question)
        // Merge AI result with higher confidence
        return {
          ...aiResult,
          method: 'ai',
          fallbackReason: `Heuristic confidence was ${heuristicResult.confidence.toFixed(2)}`
        }
      } catch (error) {
        console.error(`⚠️ Sentiment AI analysis failed, using heuristic: ${error.message}`)
        return heuristicResult
      }
    }

    // No AI available, return heuristic result
    return heuristicResult
  }

  /**
   * Fast keyword-based heuristic sentiment detection.
   * @private
   */
  _heuristicAnalysis(question) {
    const lowerQ = question.toLowerCase()
    const scores = {}
    const intensities = {}

    // Score each sentiment based on keyword matches
    for (const [sentiment, config] of Object.entries(SENTIMENT_PATTERNS)) {
      let score = 0
      let intensity = 'low'

      // Check keyword matches
      for (const keyword of config.keywords) {
        if (lowerQ.includes(keyword)) {
          score += 1
        }
      }

      // Determine intensity
      for (const [level, intensityKeywords] of Object.entries(config.intensity)) {
        for (const kw of intensityKeywords) {
          if (lowerQ.includes(kw)) {
            intensity = level
            score += level === 'high' ? 2 : level === 'medium' ? 1 : 0.5
          }
        }
      }

      scores[sentiment] = score
      intensities[sentiment] = intensity
    }

    // Find dominant sentiment
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const topSentiment = entries[0]
    const secondSentiment = entries[1]

    // Calculate confidence based on score gap
    let confidence = 0.5
    if (topSentiment[1] === 0) {
      // No keywords matched — neutral with medium confidence
      return this._neutralSentiment('heuristic')
    } else if (topSentiment[1] > secondSentiment[1] * 2) {
      // Strong dominance
      confidence = 0.9
    } else if (topSentiment[1] > secondSentiment[1] * 1.5) {
      // Moderate dominance
      confidence = 0.75
    } else {
      // Weak dominance
      confidence = 0.6
    }

    return {
      sentiment: topSentiment[0],
      intensity: intensities[topSentiment[0]],
      confidence,
      method: 'heuristic'
    }
  }

  /**
   * AI-powered sentiment analysis using Compound Mini.
   * Only called when heuristic confidence is low.
   * @private
   */
  async _aiAnalysis(question) {
    const prompt = `Analyze the sentiment of this question. Return ONLY valid JSON, no markdown.

QUESTION: "${question}"

Return this exact JSON structure:
{
  "sentiment": "frustrated|enthusiastic|confused|curious|skeptical|neutral",
  "intensity": "low|medium|high",
  "confidence": 0.0-1.0,
  "reason": "<brief explanation>"
}

Choose the sentiment that best matches the user's emotional state:
- frustrated: User is annoyed, stuck, or experiencing problems
- enthusiastic: User is excited, positive, eager
- confused: User doesn't understand something
- curious: User wants to learn more, exploring
- skeptical: User doubts or questions something
- neutral: Standard, matter-of-fact tone

Be conservative — only mark as non-neutral if there's clear emotional content.`

    const response = await this.aiProvider.callModel(this.model, prompt)

    try {
      let cleaned = response.output.trim()
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return {
        sentiment: parsed.sentiment || 'neutral',
        intensity: parsed.intensity || 'medium',
        confidence: parsed.confidence || 0.7,
        method: 'ai',
        reason: parsed.reason
      }
    } catch (parseError) {
      console.error(`⚠️ Failed to parse AI sentiment response: ${parseError.message}`)
      return this._neutralSentiment('ai_parse_error')
    }
  }

  /**
   * Return neutral sentiment default.
   * @private
   */
  _neutralSentiment(method) {
    return {
      sentiment: 'neutral',
      intensity: 'medium',
      confidence: 0.6,
      method
    }
  }

  /**
   * Store sentiment in user profile's trend history.
   * Maintains the last 10 sentiment readings.
   *
   * @param {object} sentiment - Result from analyze()
   */
  async recordSentiment(sentiment) {
    try {
      // Fetch current trend
      const rows = await query('SELECT sentiment_trend FROM user_profiles WHERE id = 1')
      let trend = rows[0]?.sentiment_trend || []

      // Parse if string
      if (typeof trend === 'string') {
        trend = JSON.parse(trend)
      }
      if (!Array.isArray(trend)) {
        trend = []
      }

      // Add new sentiment
      trend.push({
        sentiment: sentiment.sentiment,
        intensity: sentiment.intensity,
        confidence: sentiment.confidence,
        timestamp: new Date().toISOString()
      })

      // Keep only last 10
      if (trend.length > 10) {
        trend = trend.slice(-10)
      }

      // Update profile
      await query(
        'UPDATE user_profiles SET sentiment_trend = ? WHERE id = 1',
        [JSON.stringify(trend)]
      )
    } catch (error) {
      console.error(`⚠️ Failed to record sentiment: ${error.message}`)
    }
  }

  /**
   * Get the user's sentiment trend analysis.
   * @returns {Promise<{predominantSentiment: string, averageIntensity: string, recentPattern: string}>}
   */
  async getTrendAnalysis() {
    try {
      const rows = await query('SELECT sentiment_trend FROM user_profiles WHERE id = 1')
      let trend = rows[0]?.sentiment_trend || []

      if (typeof trend === 'string') {
        trend = JSON.parse(trend)
      }
      if (!Array.isArray(trend) || trend.length === 0) {
        return {
          predominantSentiment: 'neutral',
          averageIntensity: 'medium',
          recentPattern: 'No sentiment history available'
        }
      }

      // Count sentiment occurrences
      const counts = {}
      let totalIntensity = 0
      const intensityMap = { low: 1, medium: 2, high: 3 }

      for (const entry of trend) {
        counts[entry.sentiment] = (counts[entry.sentiment] || 0) + 1
        totalIntensity += intensityMap[entry.intensity] || 2
      }

      // Find predominant sentiment
      const predominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

      // Calculate average intensity
      const avgIntensityValue = totalIntensity / trend.length
      const avgIntensity = avgIntensityValue <= 1.5 ? 'low' : avgIntensityValue <= 2.5 ? 'medium' : 'high'

      // Recent pattern (last 3)
      const recent = trend.slice(-3).map(e => e.sentiment)
      const recentPattern = recent.length > 0 ? recent.join(' → ') : 'neutral'

      return {
        predominantSentiment: predominant,
        averageIntensity: avgIntensity,
        recentPattern,
        dataPoints: trend.length
      }
    } catch (error) {
      console.error(`⚠️ Failed to get trend analysis: ${error.message}`)
      return {
        predominantSentiment: 'neutral',
        averageIntensity: 'medium',
        recentPattern: 'Error retrieving trend'
      }
    }
  }
}

module.exports = SentimentService
