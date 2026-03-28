/**
 * Conversational Intelligence Configuration — Phase 7
 *
 * Configures the behavior of the conversational intelligence features:
 * - Sentiment analysis
 * - Clarification detection
 * - Follow-up generation
 * - Persona customization
 */

module.exports = {
  // ═══════════════════════════════════════════════
  // Feature Toggles
  // ═══════════════════════════════════════════════
  enableClarification: true,       // Ask for clarification on ambiguous questions
  enableFollowUps: true,           // Add follow-up questions to responses
  enableSentiment: true,           // Detect and adapt to user sentiment
  enablePersonalization: true,     // Use profile data for personalization

  // ═══════════════════════════════════════════════
  // Sentiment Analysis
  // ═══════════════════════════════════════════════
  sentiment: {
    enabled: true,
    heuristicThreshold: 0.8,       // Confidence threshold before AI fallback
    trendSize: 10,                 // Number of sentiments to track in trend
    persistentFrustrationThreshold: 3  // Frustration count to flag persistent issue
  },

  // ═══════════════════════════════════════════════
  // Clarification Detection
  // ═══════════════════════════════════════════════
  clarification: {
    enabled: true,
    minQuestionLength: 3,          // Minimum chars before checking
    heuristicThreshold: 0.85,      // Confidence threshold before AI fallback
    maxClarificationsPerSession: 2 // Don't annoy users with too many clarifications
  },

  // ═══════════════════════════════════════════════
  // Follow-up Questions
  // ═══════════════════════════════════════════════
  followUps: {
    enabled: true,
    maxFollowUps: 2,               // Maximum follow-up questions per response
    skipForSimpleQuestions: true,  // Don't add follow-ups for simple factual Q&A
    questionTypes: ['code', 'explanation', 'analysis', 'creative', 'general']
  },

  // ═══════════════════════════════════════════════
  // Persona Configuration
  // ═══════════════════════════════════════════════
  persona: {
    name: 'Relay',
    traits: {
      warmth: true,
      curiosity: true,
      clarity: true,
      helpfulness: true,
      adaptability: true
    }
  },

  // ═══════════════════════════════════════════════
  // User Defaults
  // ═══════════════════════════════════════════════
  defaults: {
    communicationStyle: 'friendly',  // formal, casual, friendly, technical, educational
    askClarifications: true,
    detailLevel: 'comprehensive',    // brief, standard, comprehensive
    includeExamples: true
  },

  // ═══════════════════════════════════════════════
  // Communication Styles
  // ═══════════════════════════════════════════════
  styles: {
    formal: {
      useContractions: false,
      greetingStyle: 'professional',
      closingStyle: 'formal'
    },
    casual: {
      useContractions: true,
      greetingStyle: 'relaxed',
      closingStyle: 'friendly'
    },
    friendly: {
      useContractions: true,
      greetingStyle: 'warm',
      closingStyle: 'encouraging'
    },
    technical: {
      useContractions: false,
      greetingStyle: 'minimal',
      closingStyle: 'direct'
    },
    educational: {
      useContractions: true,
      greetingStyle: 'encouraging',
      closingStyle: 'supportive'
    }
  }
}
