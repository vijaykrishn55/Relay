/**
 * Score Matcher — Phase 6: Hive Mind
 * 
 * Computes cosine similarity between question-need scores and model-ability scores.
 * Used to find the best model for a given task.
 */

const { SCORE_DIMENSIONS, getModelScore, getModelsForRole } = require('../data/modelScores')
const rateLimiter = require('../utils/rateLimiter')

/**
 * Compute cosine similarity between two score vectors.
 * Returns a value between 0 and 1.
 * 
 * @param {object} questionScores - { reasoning: 0.8, code: 0.9, ... }
 * @param {object} modelScores    - { reasoning: 0.7, code: 0.95, ... }
 * @returns {number} Similarity score 0–1
 */
function matchScore(questionScores, modelScores) {
  let dotProduct = 0
  let questionMagnitude = 0
  let modelMagnitude = 0

  for (const dim of SCORE_DIMENSIONS) {
    const q = questionScores[dim] || 0
    const m = modelScores[dim] || 0
    dotProduct += q * m
    questionMagnitude += q * q
    modelMagnitude += m * m
  }

  const magnitude = Math.sqrt(questionMagnitude) * Math.sqrt(modelMagnitude)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Compute weighted dot product (not normalized).
 * Gives more weight to dimensions where the question scores high.
 * Useful as a secondary ranking signal.
 * 
 * @param {object} questionScores
 * @param {object} modelScores
 * @returns {number}
 */
function weightedDotProduct(questionScores, modelScores) {
  let sum = 0
  for (const dim of SCORE_DIMENSIONS) {
    const q = questionScores[dim] || 0
    const m = modelScores[dim] || 0
    sum += q * m
  }
  return sum
}

/**
 * Select the best model for a given task based on score matching.
 * 
 * @param {object}  questionScores  - Score vector for the question/sub-task
 * @param {object[]} availableModels - Array of runtime model objects (from loadModels)
 * @param {string|null} roleFilter  - 'decomposer'|'strategist'|'specialist'|'assembler'|null
 * @param {number[]} excludeIds     - Model IDs to exclude (e.g., already assigned)
 * @returns {{ model: object, score: number, reason: string } | null}
 */
function selectBestModel(questionScores, availableModels, roleFilter = null, excludeIds = []) {
  // Get model IDs allowed for this role
  const roleModelIds = roleFilter ? getModelsForRole(roleFilter) : null

  const candidates = availableModels
    .filter(m => {
      // Must be active
      if (m.status !== 'active') return false
      // Must not be excluded
      if (excludeIds.includes(m.id)) return false
      // Must have role (if filter specified)
      if (roleModelIds && !roleModelIds.includes(m.id)) return false
      // Must have scores registered
      if (!getModelScore(m.id)) return false
      // Must not be rate-limited
      if (!rateLimiter.canUse(m.id, m.rateLimit)) return false
      return true
    })

  if (candidates.length === 0) {
    // Relax constraints: ignore role filter and rate limits
    const relaxed = availableModels.filter(m => {
      if (m.status !== 'active') return false
      if (excludeIds.includes(m.id)) return false
      if (!getModelScore(m.id)) return false
      return true
    })

    if (relaxed.length === 0) return null

    console.log(`⚠️ ScoreMatcher: No candidates with role=${roleFilter}, relaxing constraints`)
    return _rankAndSelect(questionScores, relaxed)
  }

  return _rankAndSelect(questionScores, candidates)
}

/**
 * Select the top N models for a task (for fallback chains).
 * 
 * @param {object}  questionScores
 * @param {object[]} availableModels
 * @param {string|null} roleFilter
 * @param {number}  topN
 * @returns {Array<{ model: object, score: number }>}
 */
function selectTopModels(questionScores, availableModels, roleFilter = null, topN = 3) {
  const roleModelIds = roleFilter ? getModelsForRole(roleFilter) : null

  const candidates = availableModels.filter(m => {
    if (m.status !== 'active') return false
    if (roleModelIds && !roleModelIds.includes(m.id)) return false
    if (!getModelScore(m.id)) return false
    return true
  })

  const scored = candidates.map(model => {
    const scoreEntry = getModelScore(model.id)
    const similarity = matchScore(questionScores, scoreEntry.scores)
    const weighted = weightedDotProduct(questionScores, scoreEntry.scores)
    return {
      model,
      score: similarity,
      weightedScore: weighted
    }
  })

  // Sort by cosine similarity, break ties with weighted dot product
  scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score
    return b.weightedScore - a.weightedScore
  })

  return scored.slice(0, topN)
}

/**
 * Pick a pair of models for a 2-model conversation.
 * Returns two different models suited for the given role.
 * Tries to pick from different providers for diversity.
 * 
 * @param {object[]} availableModels
 * @param {string} role - 'decomposer' or 'strategist'
 * @returns {{ modelA: object, modelB: object } | null}
 */
function selectModelPair(availableModels, role) {
  const roleModelIds = getModelsForRole(role)

  const candidates = availableModels.filter(m =>
    m.status === 'active' &&
    roleModelIds.includes(m.id) &&
    rateLimiter.canUse(m.id, m.rateLimit)
  )

  if (candidates.length < 2) {
    // If only 1 candidate, use it for both roles (self-review)
    if (candidates.length === 1) {
      console.log(`⚠️ ScoreMatcher: Only 1 model for role=${role}, using self-review`)
      return { modelA: candidates[0], modelB: candidates[0] }
    }
    return null
  }

  // Sort by speed score (faster models first for routing tasks)
  const sorted = candidates
    .map(m => {
      const scoreEntry = getModelScore(m.id)
      return { model: m, speedScore: scoreEntry.scores.speed }
    })
    .sort((a, b) => b.speedScore - a.speedScore)

  // Try to pick from different providers for diversity
  const modelA = sorted[0].model
  const modelB = sorted.find(s => s.model.provider !== modelA.provider)?.model || sorted[1].model

  return { modelA, modelB }
}

/**
 * @private
 */
function _rankAndSelect(questionScores, candidates) {
  let bestMatch = null
  let bestScore = -1

  for (const model of candidates) {
    const scoreEntry = getModelScore(model.id)
    const similarity = matchScore(questionScores, scoreEntry.scores)

    if (similarity > bestScore) {
      bestScore = similarity
      bestMatch = model
    } else if (Math.abs(similarity - bestScore) < 0.01 && bestMatch) {
      // Tie-break: prefer lower latency
      if (model.avgLatency < bestMatch.avgLatency) {
        bestScore = similarity
        bestMatch = model
      }
    }
  }

  if (!bestMatch) return null

  const scoreEntry = getModelScore(bestMatch.id)
  return {
    model: bestMatch,
    score: bestScore,
    reason: `Best match (${(bestScore * 100).toFixed(0)}% similarity) — ${scoreEntry.bestFor}`
  }
}

module.exports = {
  matchScore,
  weightedDotProduct,
  selectBestModel,
  selectTopModels,
  selectModelPair
}
