const express = require('express')
const router = express.Router()
const{
        createSession,
        getSession,
        getAllSessions,
        updateSession,
        deleteSession,
        addMessage
}= require('../data/sessions')

// GET /api/sessions - list of all sessions (no messages)

router.get('/', async (req, res) => {
        try {
                const sessions = await getAllSessions()
                res.json(sessions)
        } catch (error) {
                res.status(500).json({ error: error.message })
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
router.post('/', async (req, res) => {
        try {
                const session = await createSession()
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