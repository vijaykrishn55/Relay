const express = require('express')
const router = express.Router()
const{
        createSession,
        createSessionWithContext,
        getSession,
        getAllSessions,
        updateSession,
        deleteSession,
        addMessage
}= require('../data/sessions')
const { loadModels } = require('../data/models')
const GroqProvider = require('../services/groqProvider')
const PersistentMemoryService = require('../services/persistentMemoryService')

// Lazy-init: persistentMemory resolved at first request
let persistentMemory = null
const groqProvider = new GroqProvider()

async function getPersistentMemory() {
  if (!persistentMemory) {
    const models = await loadModels()
    const summarizerModel = models.find(m => m.id === 9) // Compound Mini
    persistentMemory = new PersistentMemoryService(groqProvider, summarizerModel)
  }
  return persistentMemory
}

// GET /api/sessions - list of all sessions (no messages)

router.get('/', async (req, res) => {
        try {
                const sessions = await getAllSessions()
                res.json(sessions)
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

// POST /api/sessions/with-context — create a session pre-loaded with context messages
router.post('/with-context', async (req, res) => {
  try {
    const { contextMessages } = req.body
    if (!contextMessages || !Array.isArray(contextMessages) || contextMessages.length === 0) {
      return res.status(400).json({ error: 'contextMessages array is required' })
    }
    const session = await createSessionWithContext(contextMessages)
    res.status(201).json(session)
  } catch (err) {
    console.error('Failed to create context session:', err)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// GET /api/sessions/:id - get a single session with messages
router.get('/:id', async (req, res) => {
        try {
                const session = await getSession(req.params.id)
                if(!session) return res.status(404).json({error: 'Session not found'})
                res.json(session)
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

// POST /api/sessions - create new session
// Also triggers summarization of the previous session (Phase 4)
router.post('/', async (req, res) => {
        try {
                const session = await createSession()

                // Trigger Phase 4 persistent memory processing (non-blocking)
                try {
                        const memory = await getPersistentMemory()
                        memory.onNewSessionCreated(session.id)
                                .then(result => {
                                        if (result.summarizedSessionId) {
                                                console.log(`🧠 Phase 4: Processing previous session ${result.summarizedSessionId}`)
                                        }
                                })
                                .catch(err => console.error('Phase 4 processing error:', err.message))
                } catch (memErr) {
                        console.error('Failed to init persistent memory:', memErr.message)
                }

                res.status(201).json(session)
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

// PUT /api/sessions/:id - rename a session
router.put('/:id', async (req, res) => {
        try {
                const {title} = req.body
                if(!title || title.trim() === ''){
                        return res.status(400).json({error: 'Title is required'})
                }
                const session = await updateSession(req.params.id, {title: title.trim()})
                if(!session) return res.status(404).json({error: 'Session not found'})
                res.json(session)
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

// DELETE /api/sessions/:id - delete a session
router.delete('/:id', async (req, res) => {
        try {
                const deleted = await deleteSession(req.params.id)
                if(!deleted) return res.status(404).json({error: 'Session not found'})
                res.json({success:true})
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

// POST /api/sessions/:id/messages - add message to session
router.post('/:id/messages', async (req, res) => {
        try {
                const {role, content, model} = req.body
                if(!role || !content){
                        return res.status(400).json({error: 'Role and content are required'})
                }
                const session = await addMessage(req.params.id, {role,content,model:model || null})
                if(!session) return res.status(404).json({error: 'Session not found'})
                res.json(session)
        } catch (error) {
                res.status(500).json({ error: error.message })
        }
})

module.exports = router