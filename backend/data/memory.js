const { query } = require('./db')

// Safely parse tags - handles both JSON arrays and plain strings
function parseTags(tagsValue) {
  if (!tagsValue) return []
  if (Array.isArray(tagsValue)) return tagsValue

  try {
    const parsed = JSON.parse(tagsValue)
    return Array.isArray(parsed) ? parsed : [tagsValue]
  } catch {
    // If it's not valid JSON, treat it as a single tag string
    return tagsValue.trim() ? [tagsValue] : []
  }
}

async function createMemory({ content, source_session_id, source_message_index, tags }) {
  const id = require('uuid').v4()
  const tagsJson = JSON.stringify(tags || [])

  await query(
    'INSERT INTO memories (id, content, source_session_id, source_message_index, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [id, content, source_session_id || null, source_message_index, tagsJson]
  )

  return { id, content, source_session_id, source_message_index, tags: tags || [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
}

async function getAllMemories() {
  const rows = await query('SELECT * FROM memories ORDER BY created_at DESC')
  return rows.map(row => ({
    ...row,
    tags: parseTags(row.tags)
  }))
}

async function getMemoryById(id) {
  const rows = await query('SELECT * FROM memories WHERE id = ?', [id])
  if (rows.length === 0) return null
  return { ...rows[0], tags: parseTags(rows[0].tags) }
}

async function updateMemory(id, { content, tags }) {
  const updates = []
  const values = []

  if (content !== undefined) {
    updates.push('content = ?')
    values.push(content)
  }
  if (tags !== undefined) {
    updates.push('tags = ?')
    values.push(JSON.stringify(tags))
  }

  if (updates.length === 0) return getMemoryById(id)

  updates.push('updated_at = NOW()')
  values.push(id)

  await query(
    `UPDATE memories SET ${updates.join(', ')} WHERE id = ?`,
    values
  )

  return getMemoryById(id)
}

async function deleteMemory(id) {
  const result = await query('DELETE FROM memories WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function searchMemories(searchQuery) {
  const rows = await query(
    'SELECT * FROM memories WHERE content LIKE ? OR tags LIKE ? ORDER BY created_at DESC',
    [`%${searchQuery}%`, `%${searchQuery}%`]
  )
  return rows.map(row => ({
    ...row,
    tags: parseTags(row.tags)
  }))
}

module.exports = { createMemory, getAllMemories, getMemoryById, updateMemory, deleteMemory, searchMemories }
