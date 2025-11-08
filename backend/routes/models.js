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
  try {
    const newModel = {
      // Auto-generated fields
      id: models.length + 1,
      model_id: req.body.name.toLowerCase().replace(/\s+/g, '-'), // Auto-generate from name
      status: 'active',
      avgLatency: 200, // Default value
      costPer1k: req.body.pricing?.input || 0,
      rateLimit: { rpm: 30, tpm: 60000 }, // Default rate limits
      
      // User-provided fields
      name: req.body.name,
      provider: req.body.provider,
      endpoint: req.body.endpoint,
      apiProvider: req.body.apiProvider,
      capabilities: req.body.capabilities,
      pricing: req.body.pricing
    }

      // custom apikey
      if (req.body.apikey && req.body.apiProvider){
        const envKey =`${req.body.apiProvider.toUpperCase()}_API_KEY`

        process.env[envKey]= req.body.apiKey

        const fs = require('fs')
      const path = require('path')
      const envPath = path.join(__dirname, '../.env')
      
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
      }
    models.push(newModel)
    res.status(201).json(newModel)
    
  } catch (error) {
    console.error('Error adding model:', error)
    res.status(500).json({ error: 'Failed to add model', details: error.message })
  }
})

module.exports = router