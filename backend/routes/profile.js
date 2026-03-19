const express = require('express')
const router = express.Router()
const {
  getUserProfile,
  updateUserProfile,
  clearUserProfile
} = require('../data/userProfile')
const {
  getAllSessionSummaries,
  getSessionSummary
} = require('../data/sessionSummary')
const { loadModels } = require('../data/models')
const GroqProvider = require('../services/groqProvider')
const PersistentMemoryService = require('../services/persistentMemoryService')

// Lazy-init for manual summarization
let persistentMemory = null
const groqProvider = new GroqProvider()

async function getPersistentMemory() {
  if (!persistentMemory) {
    const models = await loadModels()
    const summarizerModel = models.find(m => m.id === 9)
    persistentMemory = new PersistentMemoryService(groqProvider, summarizerModel)
  }
  return persistentMemory
}

// =====================================================
// USER PROFILE ENDPOINTS
// =====================================================

/**
 * GET /api/profile
 * Get the current user profile
 */
router.get('/', async (req, res) => {
  try {
    const profile = await getUserProfile()
    res.json(profile)
  } catch (error) {
    console.error('Failed to get user profile:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/profile
 * Update the user profile
 * Body: { name?, preferences?, interests?, personal_facts?, behavior_patterns? }
 */
router.put('/', async (req, res) => {
  try {
    const { name, preferences, interests, personal_facts, behavior_patterns } = req.body
    const updates = {}

    if (name !== undefined) updates.name = name
    if (preferences !== undefined) updates.preferences = preferences
    if (interests !== undefined) updates.interests = interests
    if (personal_facts !== undefined) updates.personal_facts = personal_facts
    if (behavior_patterns !== undefined) updates.behavior_patterns = behavior_patterns

    const profile = await updateUserProfile(updates)
    res.json(profile)
  } catch (error) {
    console.error('Failed to update user profile:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/profile
 * Clear/reset the user profile
 */
router.delete('/', async (req, res) => {
  try {
    const profile = await clearUserProfile()
    res.json({ success: true, profile })
  } catch (error) {
    console.error('Failed to clear user profile:', error)
    res.status(500).json({ error: error.message })
  }
})

// =====================================================
// SESSION SUMMARIES ENDPOINTS
// =====================================================

/**
 * GET /api/profile/summaries
 * Get all session summaries
 */
router.get('/summaries', async (req, res) => {
  try {
    const summaries = await getAllSessionSummaries()
    res.json(summaries)
  } catch (error) {
    console.error('Failed to get session summaries:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/profile/summaries/:sessionId
 * Get a specific session summary
 */
router.get('/summaries/:sessionId', async (req, res) => {
  try {
    const summary = await getSessionSummary(req.params.sessionId)
    if (!summary) {
      return res.status(404).json({ error: 'Session summary not found' })
    }
    res.json(summary)
  } catch (error) {
    console.error('Failed to get session summary:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/profile/summaries/:sessionId
 * Force generate a summary for a specific session
 */
router.post('/summaries/:sessionId', async (req, res) => {
  try {
    const memory = await getPersistentMemory()
    const summary = await memory.forceSummarizeSession(req.params.sessionId)

    if (!summary) {
      return res.status(400).json({
        error: 'Could not generate summary. Session may have insufficient messages.'
      })
    }

    res.json(summary)
  } catch (error) {
    console.error('Failed to generate session summary:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
