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

// GET /api/sessions - list of all sessions(no messages )

router.get('/', (req,res)=>{
        const sessions = getAllSessions().map(s=>({
                id: s.id,
                title: s.title,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                messageCount: s.messages.length
        }))
        res.json(sessions)
})

// GET /api/sessions/:id - get a single session with messages
router.get('/:id', (req,res)=>{
        const session = getSession(req.params.id)
        if(!session) return res.status(404).json({error: 'Session not found'})
        res.json(session)
})

// POST /api/sessions - create new session
router.post('/', (req,res)=>{
        const session= createSession()
        res.status(201).json(session)
})

// PUT /api/sessions/:id - rename a session
router.put('/:id', (req,res)=>{
        const {title} = req.body
        if(!title || title.trim() === ''){
                return res.status(400).json({error: 'Title is required'})
        }
        const session = updateSession(req.params.id, {title: title.trim()})
        if(!session) return res.status(404).json({error: 'Session not found'})
                res.json(session)
})

// DELETE /api/sessions/:id - delete a session
router.delete('/:id', (req,res)=>{
        const deleted = deleteSession(req.params.id)
        if(!deleted) return res.status(404).json({error: 'Session not found'})
        res.json({success:true})
})

// POST /api/sessions/:id/messages - add message to session
router.post('/:id/messages', (req,res)=>{
        const {role, content, model} = req.body
        if(!role || !content){
                return res.status(400).json({error: 'Role and content are required'})
        }
        const session = addMessage(req.params.id, {role,content,model:model || null})
        if(!session) return res.status(404).json({error: 'Session not found'})
        res.json(session)
})

module.exports = router