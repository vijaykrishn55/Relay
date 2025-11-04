const express = require('express')
const router = express.Router()
const models = require('../data/models')

// GET all models
router.get('/', (req, res) => {
  res.json(models)
})

// GET single model by ID
router.get('/:id', (req, res) => {
  const model = models.find(m => m.id === parseInt(req.params.id))
  
  if (!model) {
    return res.status(404).json({ error: 'Model not found' })
  }
  
  res.json(model)
})

// POST new model (we'll implement later)
router.post('/', (req, res) => {
  res.status(501).json({ message: 'Coming soon!' })
})

module.exports = router