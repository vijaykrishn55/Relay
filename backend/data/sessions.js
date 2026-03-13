const { v4: uuidv4 } = require('uuid')
const { query } = require('./db')

async function createSession() {
  const id = uuidv4()
  await query(
    'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
    [id, 'New Chat']
  )
  return getSession(id)
}

async function getSession(id) {
  const rows = await query('SELECT * FROM sessions WHERE id = ?', [id])
  if (rows.length === 0) return null

  const session = rows[0]
  const messages = await query(
    'SELECT role, content, model, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
    [id]
  )

  return {
    id: session.id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messages
  }
}

async function getAllSessions() {
  const rows = await query(
    `SELECT s.id, s.title, s.created_at, s.updated_at,
            (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS messageCount
     FROM sessions s
     ORDER BY s.updated_at DESC`
  )
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.messageCount
  }))
}

async function updateSession(id, changes) {
  const session = await getSession(id)
  if (!session) return null

  if (changes.title !== undefined) {
    await query('UPDATE sessions SET title = ? WHERE id = ?', [changes.title, id])
  }
  return getSession(id)
}

async function deleteSession(id) {
  const result = await query('DELETE FROM sessions WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function addMessage(sessionId, message) {
  const session = await getSession(sessionId)
  if (!session) return null

  await query(
    'INSERT INTO messages (session_id, role, content, model, timestamp) VALUES (?, ?, ?, ?, NOW())',
    [sessionId, message.role, message.content, message.model || null]
  )

  // auto-title: use first user message
  if (session.title === 'New Chat' && message.role === 'user') {
    const title = message.content.length > 40
      ? message.content.substring(0, 40) + '...'
      : message.content
    await query('UPDATE sessions SET title = ? WHERE id = ?', [title, sessionId])
  }

  return getSession(sessionId)
}

module.exports = { createSession, getSession, getAllSessions, updateSession, deleteSession, addMessage }
