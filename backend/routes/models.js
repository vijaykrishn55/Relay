const express = require('express')
const router = express.Router()
const models = require('../data/models')
const { updateModelStatuses, checkApiKey } = require('../utils/apiKeyValidator')

// GET all models with updated statuses
router.get('/', (req, res) => {
  const modelsWithStatus = updateModelStatuses(models)
  res.json(modelsWithStatus)
})

// GET single model by ID with status check
router.get('/:id', (req, res) => {
  const model = models.find(m => m.id === parseInt(req.params.id))
  
  if (!model) {
    return res.status(404).json({ error: 'Model not found' })
  }
  
  // Check API key and update status
  const keyCheck = checkApiKey(model.apiProvider)
  const modelWithStatus = {
    ...model,
    status: keyCheck.available ? 'active' : 'unavailable',
    statusReason: keyCheck.reason
  }
  
  res.json(modelWithStatus)
})

// POST new model with API key validation
router.post('/', (req, res) => {
  try {
    const newModel = {
      id: models.length + 1,
      model_id: req.body.name.toLowerCase().replace(/\s+/g, '-'),
      avgLatency: 200,
      costPer1k: req.body.pricing?.input || 0,
      rateLimit: { rpm: 30, tpm: 60000 },
      
      name: req.body.name,
      provider: req.body.provider,
      endpoint: req.body.endpoint,
      apiProvider: req.body.apiProvider,
      capabilities: req.body.capabilities,
      pricing: req.body.pricing
    }

    // If custom API key is provided, save it to .env
    if (req.body.apiKey && req.body.apiProvider) {
      const envKey = `${req.body.apiProvider.toUpperCase()}_API_KEY`
      
      // Update environment variable
      process.env[envKey] = req.body.apiKey
      
      // Write to .env file for persistence
      const fs = require('fs')
      const path = require('path')
      const envPath = path.join(__dirname, '../.env')
      
      try {
        // Read existing .env
        let envContent = fs.readFileSync(envPath, 'utf8')
        
        // Check if key exists
        const keyRegex = new RegExp(`^${envKey}=.*$`, 'm')
        if (keyRegex.test(envContent)) {
          // Update existing key
          envContent = envContent.replace(keyRegex, `${envKey}=${req.body.apiKey}`)
        } else {
          // Add new key
          envContent += `\n${envKey}=${req.body.apiKey}`
        }
        
        // Write back to .env
        fs.writeFileSync(envPath, envContent)
      } catch (fsError) {
        console.error('Error writing to .env:', fsError)
        // Continue anyway - key is in memory
      }
    }

    // Check API key status
    const keyCheck = checkApiKey(newModel.apiProvider)
    newModel.status = keyCheck.available ? 'active' : 'unavailable'
    newModel.statusReason = keyCheck.reason

    models.push(newModel)
    res.status(201).json(newModel)
    
  } catch (error) {
    console.error('Error adding model:', error)
    res.status(500).json({ error: 'Failed to add model', details: error.message })
  }
})

module.exports = router