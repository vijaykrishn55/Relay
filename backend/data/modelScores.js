/**
 * Model Score Registry — Phase 6: Hive Mind
 * 
 * Every model gets a 0.0–1.0 score on 8 dimensions.
 * These scores are used for quantitative model selection (dot-product matching).
 */

const SCORE_DIMENSIONS = [
  'reasoning',    // Logical deduction, step-by-step thinking
  'code',         // Code generation, debugging, refactoring
  'creativity',   // Creative writing, brainstorming
  'speed',        // Response time, throughput
  'multilingual', // Non-English language quality
  'analysis',     // Data analysis, comparison, evaluation
  'instruction',  // Following structured output instructions
  'knowledge'     // Factual knowledge depth
]

const MODEL_SCORES = {
  2: {
    name: 'Codestral',
    provider: 'Mistral',
    scores: {
      reasoning: 0.7,
      code: 0.95,
      creativity: 0.4,
      speed: 0.6,
      multilingual: 0.5,
      analysis: 0.6,
      instruction: 0.8,
      knowledge: 0.6
    },
    roles: ['specialist'],
    bestFor: 'Code generation, debugging, technical documentation'
  },

  3: {
    name: 'Qwen 3 32B',
    provider: 'Cerebras',
    scores: {
      reasoning: 0.75,
      code: 0.85,
      creativity: 0.5,
      speed: 0.7,
      multilingual: 0.4,
      analysis: 0.7,
      instruction: 0.7,
      knowledge: 0.65
    },
    roles: ['specialist'],
    bestFor: 'Coding with advanced reasoning, tool use'
  },

  4: {
    name: 'Llama 3.3 70B',
    provider: 'Cerebras',
    scores: {
      reasoning: 0.8,
      code: 0.8,
      creativity: 0.65,
      speed: 0.65,
      multilingual: 0.6,
      analysis: 0.8,
      instruction: 0.75,
      knowledge: 0.8
    },
    roles: ['specialist', 'assembler'],
    bestFor: 'Real-time coding, Q&A, research, large documents'
  },

  5: {
    name: 'Llama 3.1 8B',
    provider: 'Cerebras',
    scores: {
      reasoning: 0.5,
      code: 0.6,
      creativity: 0.5,
      speed: 0.9,
      multilingual: 0.3,
      analysis: 0.45,
      instruction: 0.6,
      knowledge: 0.5
    },
    roles: ['decomposer', 'strategist'],
    bestFor: 'Speed-critical tasks, batch processing, quick routing'
  },

  6: {
    name: 'Allam 2 7B',
    provider: 'Groq',
    scores: {
      reasoning: 0.4,
      code: 0.2,
      creativity: 0.5,
      speed: 0.7,
      multilingual: 0.9,
      analysis: 0.3,
      instruction: 0.5,
      knowledge: 0.4
    },
    roles: ['specialist'],
    bestFor: 'Multilingual tasks, Arabic content, international text'
  },

  7: {
    name: 'Llama 3.1 8B Instant',
    provider: 'Groq',
    scores: {
      reasoning: 0.45,
      code: 0.55,
      creativity: 0.45,
      speed: 0.95,
      multilingual: 0.3,
      analysis: 0.4,
      instruction: 0.6,
      knowledge: 0.45
    },
    roles: ['decomposer', 'strategist'],
    bestFor: 'Ultra-fast routing, simple tasks, quick responses'
  },

  8: {
    name: 'Llama 4 Scout 17B',
    provider: 'Groq',
    scores: {
      reasoning: 0.85,
      code: 0.6,
      creativity: 0.7,
      speed: 0.7,
      multilingual: 0.5,
      analysis: 0.8,
      instruction: 0.75,
      knowledge: 0.75
    },
    roles: ['specialist', 'assembler', 'strategist'],
    bestFor: 'Reasoning, analysis, research tasks'
  },

  9: {
    name: 'Compound Mini',
    provider: 'Groq',
    scores: {
      reasoning: 0.4,
      code: 0.3,
      creativity: 0.3,
      speed: 0.9,
      multilingual: 0.2,
      analysis: 0.35,
      instruction: 0.8,
      knowledge: 0.5
    },
    roles: ['decomposer'], // ONLY decomposer — NEVER answers user questions
    bestFor: 'Fast structured JSON output, routing decisions'
  },

  10: {
    name: 'Compound',
    provider: 'Groq',
    scores: {
      reasoning: 0.6,
      code: 0.4,
      creativity: 0.4,
      speed: 0.8,
      multilingual: 0.3,
      analysis: 0.55,
      instruction: 0.75,
      knowledge: 0.6
    },
    roles: ['decomposer', 'strategist'],
    bestFor: 'Balanced routing and reasoning'
  },

  11: {
    name: 'Command A Reasoning',
    provider: 'Cohere',
    scores: {
      reasoning: 0.95,
      code: 0.65,
      creativity: 0.6,
      speed: 0.3,
      multilingual: 0.7,
      analysis: 0.9,
      instruction: 0.8,
      knowledge: 0.85
    },
    roles: ['specialist', 'assembler'],
    bestFor: 'Deep reasoning, complex analysis, structured outputs'
  },

  12: {
    name: 'Command R Plus',
    provider: 'Cohere',
    scores: {
      reasoning: 0.7,
      code: 0.45,
      creativity: 0.6,
      speed: 0.35,
      multilingual: 0.8,
      analysis: 0.65,
      instruction: 0.7,
      knowledge: 0.7
    },
    roles: ['specialist'],
    bestFor: 'Multilingual, citations, structured output'
  }
}

/**
 * Get the score entry for a model by its ID.
 * Returns null if no scores are registered for that model.
 */
function getModelScore(modelId) {
  return MODEL_SCORES[modelId] || null
}

/**
 * Get all model IDs that can fulfill a given role.
 * @param {'decomposer'|'strategist'|'specialist'|'assembler'} role
 * @returns {number[]} Array of model IDs
 */
function getModelsForRole(role) {
  return Object.entries(MODEL_SCORES)
    .filter(([, entry]) => entry.roles.includes(role))
    .map(([id]) => parseInt(id))
}

/**
 * Merge runtime model list with static scores.
 * Returns models augmented with their score data.
 */
function getModelsWithScores(runtimeModels) {
  return runtimeModels
    .filter(m => m.status === 'active')
    .map(m => {
      const scoreEntry = MODEL_SCORES[m.id]
      return {
        ...m,
        scores: scoreEntry ? scoreEntry.scores : null,
        roles: scoreEntry ? scoreEntry.roles : [],
        bestFor: scoreEntry ? scoreEntry.bestFor : 'general-purpose'
      }
    })
}

module.exports = {
  SCORE_DIMENSIONS,
  MODEL_SCORES,
  getModelScore,
  getModelsForRole,
  getModelsWithScores
}
