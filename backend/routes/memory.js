const express = require('express')
const router = express.Router()
const {
  createMemory,
  getAllMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  searchMemories
} = require('../data/memory')

// GET /api/memory — list all memories (with optional search)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    const memories = q
      ? await searchMemories(q)
      : await getAllMemories()
    res.json(memories)
  } catch (err) {
    console.error('Failed to fetch memories:', err)
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
})

// GET /api/memory/:id — get a single memory
router.get('/:id', async (req, res) => {
  try {
    const memory = await getMemoryById(req.params.id)
    if (!memory) return res.status(404).json({ error: 'Memory not found' })
    res.json(memory)
  } catch (err) {
    console.error('Failed to fetch memory:', err)
    res.status(500).json({ error: 'Failed to fetch memory' })
  }
})

// POST /api/memory — save a new memory
router.post('/', async (req, res) => {
  try {
    const { content, source_session_id, source_message_index, tags } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' })
    }
    const memory = await createMemory({
      content: content.trim(),
      source_session_id,
      source_message_index,
      tags
    })
    res.status(201).json(memory)
  } catch (err) {
    console.error('Failed to create memory:', err)
    res.status(500).json({ error: 'Failed to create memory' })
  }
})

// PUT /api/memory/:id — update a memory (content and/or tags)
router.put('/:id', async (req, res) => {
  try {
    const { content, tags } = req.body
    const memory = await updateMemory(req.params.id, { content, tags })
    if (!memory) return res.status(404).json({ error: 'Memory not found' })
    res.json(memory)
  } catch (err) {
    console.error('Failed to update memory:', err)
    res.status(500).json({ error: 'Failed to update memory' })
  }
})

// DELETE /api/memory/:id — delete a memory
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteMemory(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Memory not found' })
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete memory:', err)
    res.status(500).json({ error: 'Failed to delete memory' })
  }
})

module.exports = router