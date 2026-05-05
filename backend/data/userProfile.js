const { query } = require('./db')

// Helper to safely parse JSON fields
function parseJsonField(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Get the user profile (single user assumption - id=1)
 * Includes: communication_style, sentiment_trend, expertise_levels, engagement_preferences
 */
async function getUserProfile() {
  const rows = await query('SELECT * FROM user_profiles WHERE id = 1')
  if (rows.length === 0) {
    // Create default profile if not exists
    await query('INSERT IGNORE INTO user_profiles (id) VALUES (1)')
    return {
      id: 1,
      name: null,
      preferences: [],
      interests: [],
      behavior_patterns: [],
      personal_facts: [],
      // 
      communication_style: 'friendly',
      sentiment_trend: [],
      expertise_levels: {},
      engagement_preferences: {
        askClarifications: true,
        detailLevel: 'comprehensive',
        includeExamples: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  const profile = rows[0]
  return {
    id: profile.id,
    name: profile.name,
    preferences: parseJsonField(profile.preferences) || [],
    interests: parseJsonField(profile.interests) || [],
    behavior_patterns: parseJsonField(profile.behavior_patterns) || [],
    personal_facts: parseJsonField(profile.personal_facts) || [],
    // 
    communication_style: profile.communication_style || 'friendly',
    sentiment_trend: parseJsonField(profile.sentiment_trend) || [],
    expertise_levels: parseJsonField(profile.expertise_levels) || {},
    engagement_preferences: parseJsonField(profile.engagement_preferences) || {
      askClarifications: true,
      detailLevel: 'comprehensive',
      includeExamples: true
    },
    // Phase 8
    response_preferences: parseJsonField(profile.response_preferences) || {},
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
}

/**
 * Update the user profile with new information
 * Includes : communication_style, sentiment_trend, expertise_levels, engagement_preferences
 */
async function updateUserProfile(updates) {
  const fields = []
  const values = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.preferences !== undefined) {
    fields.push('preferences = ?')
    values.push(JSON.stringify(updates.preferences))
  }
  if (updates.interests !== undefined) {
    fields.push('interests = ?')
    values.push(JSON.stringify(updates.interests))
  }
  if (updates.behavior_patterns !== undefined) {
    fields.push('behavior_patterns = ?')
    values.push(JSON.stringify(updates.behavior_patterns))
  }
  if (updates.personal_facts !== undefined) {
    fields.push('personal_facts = ?')
    values.push(JSON.stringify(updates.personal_facts))
  }
  // 
  if (updates.communication_style !== undefined) {
    fields.push('communication_style = ?')
    values.push(updates.communication_style)
  }
  if (updates.sentiment_trend !== undefined) {
    fields.push('sentiment_trend = ?')
    values.push(JSON.stringify(updates.sentiment_trend))
  }
  if (updates.expertise_levels !== undefined) {
    fields.push('expertise_levels = ?')
    values.push(JSON.stringify(updates.expertise_levels))
  }
  if (updates.engagement_preferences !== undefined) {
    fields.push('engagement_preferences = ?')
    values.push(JSON.stringify(updates.engagement_preferences))
  }
  // Phase 8
  if (updates.response_preferences !== undefined) {
    fields.push('response_preferences = ?')
    values.push(JSON.stringify(updates.response_preferences))
  }

  if (fields.length === 0) return getUserProfile()

  fields.push('updated_at = NOW()')
  values.push(1) // id = 1
  await query(
    `UPDATE user_profiles SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  return getUserProfile()
}

/**
 * Merge extracted user info into the existing profile.
 * This function is additive - it adds new information without overwriting existing data.
 *
 * @param {Object} extractedInfo - New info extracted from a session:
 *   - name: string (only updates if explicitly stated and no existing name)
 *   - preferences: string[] (new preferences to add)
 *   - interests: string[] (new interests to add)
 *   - personal_facts: string[] (new facts to add)
 */
async function mergeIntoProfile(extractedInfo) {
  if (!extractedInfo || typeof extractedInfo !== 'object') {
    return getUserProfile()
  }

  const currentProfile = await getUserProfile()

  // Helper to merge arrays without duplicates (case-insensitive comparison)
  const mergeArrays = (existing, newItems) => {
    if (!newItems || !Array.isArray(newItems)) return existing || []
    const existingLower = (existing || []).map(item =>
      typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item).toLowerCase()
    )
    const merged = [...(existing || [])]
    for (const item of newItems) {
      const itemLower = typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item).toLowerCase()
      if (!existingLower.includes(itemLower)) {
        merged.push(item)
      }
    }
    return merged
  }

  const updates = {}

  // Update name only if new name is provided and no existing name
  if (extractedInfo.name && !currentProfile.name) {
    updates.name = extractedInfo.name
  }

  // Merge preferences (additive)
  if (extractedInfo.preferences && Array.isArray(extractedInfo.preferences)) {
    updates.preferences = mergeArrays(currentProfile.preferences, extractedInfo.preferences)
  }

  // Merge interests (additive)
  if (extractedInfo.interests && Array.isArray(extractedInfo.interests)) {
    updates.interests = mergeArrays(currentProfile.interests, extractedInfo.interests)
  }

  // Merge personal facts (additive)
  if (extractedInfo.personal_facts && Array.isArray(extractedInfo.personal_facts)) {
    updates.personal_facts = mergeArrays(currentProfile.personal_facts, extractedInfo.personal_facts)
  }

  // Merge behavior patterns (additive)
  if (extractedInfo.behavior_patterns && Array.isArray(extractedInfo.behavior_patterns)) {
    updates.behavior_patterns = mergeArrays(currentProfile.behavior_patterns, extractedInfo.behavior_patterns)
  }

  if (Object.keys(updates).length === 0) {
    return currentProfile
  }

  return updateUserProfile(updates)
}

/**
 * Build a human-readable summary of the user profile for AI context
 * Includes enhanced personalization
 */
function buildProfileContext(profile) {
  if (!profile) return ''

  const parts = []

  // NOTE: Name is intentionally excluded from context.
  // Sending the name causes models to name-drop in responses
  // despite persona instructions saying not to.

  // Only include communication style and expertise — the minimum needed to calibrate responses
  if (profile.communication_style && profile.communication_style !== 'friendly') {
    parts.push(`Tone: ${profile.communication_style}`)
  }

  if (profile.expertise_levels && Object.keys(profile.expertise_levels).length > 0) {
    const expertiseStr = Object.entries(profile.expertise_levels)
      .map(([topic, level]) => `${topic}: ${level}`)
      .join(', ')
    parts.push(`Expertise: ${expertiseStr}`)
  }

  // NOTE: interests and personal_facts are intentionally EXCLUDED.
  // Even with "DO NOT MENTION" headers, models echo them in responses.
  // These fields are stored for profile/memory page only, never sent to models.

  if (parts.length === 0) {
    return ''
  }

  return `[User Calibration — DO NOT MENTION]\n${parts.join('\n')}`
}

/**
 * Clear the user profile (reset to empty)
 * Resets all fields 
 */
async function clearUserProfile() {
  await query(
    `UPDATE user_profiles SET
      name = NULL,
      preferences = NULL,
      interests = NULL,
      behavior_patterns = NULL,
      personal_facts = NULL,
      communication_style = 'friendly',
      sentiment_trend = NULL,
      expertise_levels = NULL,
      engagement_preferences = NULL,
      response_preferences = NULL,
      updated_at = NOW()
    WHERE id = 1`
  )
  return getUserProfile()
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  mergeIntoProfile,
  buildProfileContext,
  clearUserProfile
}
