/**
 * routes/ai/shared.js
 * Shared providers, lazy-init singletons, and small helper functions
 * used by every ai sub-router.
 */

const AIRouter            = require('../../services/router')
const MistralProvider     = require('../../services/mistralProvider')
const CerebrasProvider    = require('../../services/cerebrasProvider')
const GroqProvider        = require('../../services/groqProvider')
const CohereProvider      = require('../../services/cohereProvider')
const ConversationMemory  = require('../../services/conversationMemory')
const PersistentMemoryService = require('../../services/persistentMemoryService')
const RelayService        = require('../../services/relayService')
const HiveOrchestrator    = require('../../services/hiveOrchestrator')
const RelayPipeline       = require('../../services/relayPipeline')
const UserPatternService  = require('../../services/userPatternService')
const { loadModels }      = require('../../data/models')
const { addMessage, getSession, updateSession } = require('../../data/sessions')
const { query }           = require('../../data/db')
const { getUserProfile }  = require('../../data/userProfile')
const memoryService       = require('../../services/memoryService')

// ─── Provider singletons ──────────────────────────────────────────────────────
const mistralProvider  = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider     = new GroqProvider()
const cohereProvider   = new CohereProvider()

// All four providers as a map — pass into HiveOrchestrator / RelayPipeline
const providers = {
  mistral:  mistralProvider,
  cerebras: cerebrasProvider,
  groq:     groqProvider,
  cohere:   cohereProvider,
}

// ─── Lazy-init service singletons ─────────────────────────────────────────────
let conversationMemory = null
let persistentMemory   = null
let relayService       = null

function getConversationMemory(models) {
  if (!conversationMemory) {
    const routerModel = models.find(m => m.id === 9)
    conversationMemory = new ConversationMemory(groqProvider, routerModel)
  }
  return conversationMemory
}

function getPersistentMemory(models) {
  if (!persistentMemory) {
    const summarizerModel = models.find(m => m.id === 9)
    persistentMemory = new PersistentMemoryService(groqProvider, summarizerModel)
  }
  return persistentMemory
}

function getRelayService(models) {
  if (!relayService) {
    const routerModel = models.find(m => m.id === 9)
    relayService = new RelayService(groqProvider, routerModel)
  }
  return relayService
}

// ─── logOrchestration ─────────────────────────────────────────────────────────
/**
 * Persist orchestration metadata to the DB (fire-and-forget).
 */
async function logOrchestration(logEntry) {
  try {
    await query(
      `INSERT INTO orchestration_logs
       (session_id, user_question, is_complex, triage_scores, decomposition, strategies, execution_results, models_used, total_latency, total_tokens, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logEntry.sessionId,
        logEntry.userQuestion,
        logEntry.isComplex,
        JSON.stringify(logEntry.triageScores),
        JSON.stringify(logEntry.decomposition),
        JSON.stringify(logEntry.strategies),
        JSON.stringify(logEntry.executionResults),
        JSON.stringify(logEntry.modelsUsed),
        logEntry.totalLatency,
        logEntry.totalTokens,
        logEntry.status,
      ]
    )
  } catch (err) {
    console.error('Failed to log orchestration:', err.message)
  }
}

// ─── autoTitleSession ─────────────────────────────────────────────────────────
/**
 * Auto-title a session if its title is still the default "New Chat".
 * Caps the title at 60 chars, breaks at a word boundary.
 */
async function autoTitleSession(sessionId, userInput) {
  try {
    const session = await getSession(sessionId)
    if (!session) return
    if (session.title && session.title !== 'New Chat') return

    let title = userInput.trim().replace(/[\r\n]+/g, ' ')
    if (title.length > 60) {
      title = title.substring(0, 60)
      const lastSpace = title.lastIndexOf(' ')
      if (lastSpace > 20) title = title.substring(0, lastSpace)
      title += '...'
    }
    title = title.charAt(0).toUpperCase() + title.slice(1)

    await updateSession(sessionId, { title })
    console.log(`📝 Auto-titled session ${sessionId}: "${title}"`)
  } catch (err) {
    console.error('Auto-title failed:', err.message)
  }
}

// ─── buildUserContext ─────────────────────────────────────────────────────────
/**
 * Loads userProfile + session summaries + memory matches and returns the
 * userContext object expected by HiveOrchestrator and RelayPipeline.
 */
async function buildUserContext(models, sessionId, input) {
  const userProfile = await getUserProfile()
  const memory      = getConversationMemory(models)
  const persistent  = getPersistentMemory(models)

  let persistentContext = ''
  let systemContext     = null

  if (sessionId) {
    try {
      persistentContext = await persistent.buildPersistentContext(sessionId)
    } catch (err) {
      console.error('Failed to load persistent context:', err.message)
    }
    systemContext = await memory.buildContext(sessionId)
  }

  const memoryContext = await memoryService.buildMemoryContext(input)

  return {
    profile:            userProfile,
    sessionContext:     systemContext   || '',
    memoryContext:      memoryContext   || '',
    lastSessionSummary: persistentContext || '',
  }
}

// ─── buildConversationHistory ─────────────────────────────────────────────────
/**
 * Load the last 10 messages for a session from the DB for in-session context.
 */
async function buildConversationHistory(sessionId) {
  if (!sessionId) return []
  try {
    const rows = await query(
      `SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 10`,
      [sessionId]
    )
    if (!rows || rows.length === 0) return []
    const history = rows.reverse().map(m => ({ role: m.role, content: m.content }))
    console.log(`💬 Loaded ${history.length} in-session messages for context`)
    return history
  } catch (err) {
    console.error('Failed to load in-session messages:', err.message)
    return []
  }
}

// ─── buildFullSystemContext ───────────────────────────────────────────────────
/**
 * Assemble all context sources (context-seeded, memory, persistent) into a
 * single string capped at MAX_CONTEXT_CHARS.
 */
async function buildFullSystemContext(models, sessionId, input) {
  const MAX_CONTEXT_CHARS = 6000
  const persistent = getPersistentMemory(models)
  const memory     = getConversationMemory(models)

  let persistentContext = ''
  let systemContext     = null

  if (sessionId) {
    try { persistentContext = await persistent.buildPersistentContext(sessionId) } catch {}
    systemContext = await memory.buildContext(sessionId)
  }

  const memoryContext = await memoryService.buildMemoryContext(input)

  let contextPrefix = ''
  if (sessionId) {
    const session = await getSession(sessionId)
    if (session?.context_messages?.length > 0) {
      const block = session.context_messages.map(m => `[${m.role}]: ${m.content}`).join('\n')
      contextPrefix = `\n\n[Context from a previous conversation — the user selected these messages as relevant]\n${block}\n`
    }
  }

  const parts = [contextPrefix, memoryContext, persistentContext].filter(Boolean)
  let full = parts.join('\n\n')
  if (full.length > MAX_CONTEXT_CHARS) full = full.substring(0, MAX_CONTEXT_CHARS)
  return full
}

// ─── updateMessageInPlace ─────────────────────────────────────────────────────
/**
 * Update an assistant message in the DB after a follow-up (relay in-place edit).
 * Appends the follow-up question to the existing relay_followups array.
 */
async function updateMessageInPlace(targetMessage, newContent, model, followUpText) {
  const dbMessageId = targetMessage.id
  let existingFollowups = []
  try {
    const raw = targetMessage.relay_followups
    existingFollowups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
  } catch { existingFollowups = [] }

  existingFollowups.push(followUpText)

  await query(
    'UPDATE messages SET content = ?, model = ?, relay_followups = ? WHERE id = ?',
    [newContent, model, JSON.stringify(existingFollowups), dbMessageId]
  )
}

module.exports = {
  // providers
  mistralProvider, cerebrasProvider, groqProvider, cohereProvider, providers,
  // lazy services
  getConversationMemory, getPersistentMemory, getRelayService,
  // shared data access
  loadModels, addMessage, getSession, query,
  // classes (some sub-routers need to instantiate these)
  AIRouter, HiveOrchestrator, RelayPipeline, UserPatternService,
  // helpers
  logOrchestration, autoTitleSession,
  buildUserContext, buildConversationHistory, buildFullSystemContext,
  updateMessageInPlace,
}
