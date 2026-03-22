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
 * Create a new session summary
 */
async function createSessionSummary({ session_id, summary, topics, outcomes, user_info_extracted }) {
  await query(
    `INSERT INTO session_summaries (session_id, summary, topics, outcomes, user_info_extracted, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      session_id,
      summary,
      topics ? JSON.stringify(topics) : null,
      outcomes ? JSON.stringify(outcomes) : null,
      user_info_extracted ? JSON.stringify(user_info_extracted) : null
    ]
  )

  return getSessionSummary(session_id)
}

/**
 * Get a session summary by session ID
 */
async function getSessionSummary(session_id) {
  const rows = await query(
    'SELECT * FROM session_summaries WHERE session_id = ?',
    [session_id]
  )

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    session_id: row.session_id,
    summary: row.summary,
    topics: parseJsonField(row.topics) || [],
    outcomes: parseJsonField(row.outcomes) || [],
    user_info_extracted: parseJsonField(row.user_info_extracted) || {},
    created_at: row.created_at
  }
}

/**
 * Check if a session already has a summary
 */
async function hasSessionSummary(session_id) {
  const rows = await query(
    'SELECT 1 FROM session_summaries WHERE session_id = ? LIMIT 1',
    [session_id]
  )
  return rows.length > 0
}

/**
 * Get the most recent session summary (excluding a given session ID)
 * Used to load context for new sessions
 */
async function getLastSessionSummary(excludeSessionId = null) {
  let sql = `
    SELECT ss.*, s.title as session_title
    FROM session_summaries ss
    JOIN sessions s ON ss.session_id = s.id
  `
  const params = []

  if (excludeSessionId) {
    sql += ' WHERE ss.session_id != ?'
    params.push(excludeSessionId)
  }

  sql += ' ORDER BY ss.created_at DESC LIMIT 1'

  const rows = await query(sql, params)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    session_id: row.session_id,
    session_title: row.session_title,
    summary: row.summary,
    topics: parseJsonField(row.topics) || [],
    outcomes: parseJsonField(row.outcomes) || [],
    user_info_extracted: parseJsonField(row.user_info_extracted) || {},
    created_at: row.created_at
  }
}

/**
 * Get the parent session's summary (for relay-created sessions)
 * Falls back to last session summary if parent has no summary
 */
async function getParentOrLastSessionSummary(currentSessionId) {
  if (!currentSessionId) return getLastSessionSummary()

  // First check if current session has a parent
  const sessionRows = await query(
    'SELECT parent_session_id FROM sessions WHERE id = ?',
    [currentSessionId]
  )

  if (sessionRows.length > 0 && sessionRows[0].parent_session_id) {
    const parentId = sessionRows[0].parent_session_id

    // Try to get the parent session's summary
    const parentSummary = await getSessionSummary(parentId)
    if (parentSummary) {
      // Enrich with session title
      const titleRows = await query('SELECT title FROM sessions WHERE id = ?', [parentId])
      parentSummary.session_title = titleRows.length > 0 ? titleRows[0].title : 'Previous Chat'
      return parentSummary
    }
  }

  // Fallback to most recent summary
  return getLastSessionSummary(currentSessionId)
}

/**
 * Get all session summaries (for admin/debugging)
 */
async function getAllSessionSummaries() {
  const rows = await query(`
    SELECT ss.*, s.title as session_title
    FROM session_summaries ss
    JOIN sessions s ON ss.session_id = s.id
    ORDER BY ss.created_at DESC
  `)

  return rows.map(row => ({
    id: row.id,
    session_id: row.session_id,
    session_title: row.session_title,
    summary: row.summary,
    topics: parseJsonField(row.topics) || [],
    outcomes: parseJsonField(row.outcomes) || [],
    user_info_extracted: parseJsonField(row.user_info_extracted) || {},
    created_at: row.created_at
  }))
}

/**
 * Delete a session summary
 */
async function deleteSessionSummary(session_id) {
  const result = await query(
    'DELETE FROM session_summaries WHERE session_id = ?',
    [session_id]
  )
  return result.affectedRows > 0
}

/**
 * Build a readable context string from a session summary
 */
function buildSummaryContext(sessionSummary) {
  if (!sessionSummary) return ''

  const parts = []

  if (sessionSummary.session_title && sessionSummary.session_title !== 'New Chat') {
    parts.push(`Topic: ${sessionSummary.session_title}`)
  }

  parts.push(`Summary: ${sessionSummary.summary}`)

  if (sessionSummary.topics && sessionSummary.topics.length > 0) {
    parts.push(`Topics covered: ${sessionSummary.topics.join(', ')}`)
  }

  if (sessionSummary.outcomes && sessionSummary.outcomes.length > 0) {
    parts.push(`Key outcomes: ${sessionSummary.outcomes.join('; ')}`)
  }

  return `[Previous Conversation]\n${parts.join('\n')}`
}

module.exports = {
  createSessionSummary,
  getSessionSummary,
  hasSessionSummary,
  getLastSessionSummary,
  getParentOrLastSessionSummary,
  getAllSessionSummaries,
  deleteSessionSummary,
  buildSummaryContext
}
