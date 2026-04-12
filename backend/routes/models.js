const express = require('express')
const router = express.Router()
const { getModelsSync, loadModels } = require('../data/models')
const { query } = require('../data/db')

// GET all models — return as-is from DB/static, all marked active
router.get('/', async (req, res) => {
  try {
    const models = await loadModels()
    // All models are active — no API key validation
    const modelsWithStatus = models.map(m => ({
      ...m,
      status: 'active',
      statusReason: 'Ready'
    }))
    res.json(modelsWithStatus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET single model by ID
router.get('/:id', async (req, res) => {
  try {
    const models = await loadModels()
    const model = models.find(m => m.id === parseInt(req.params.id))
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }
    
    res.json({ ...model, status: 'active', statusReason: 'Ready' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST new model
router.post('/', async (req, res) => {
  try {
    const models = await loadModels()
    const newModel = {
      id: (models.length > 0 ? Math.max(...models.map(m => m.id)) : 0) + 1,
      model_id: req.body.name.toLowerCase().replace(/\s+/g, '-'),
      avgLatency: 200,
      costPer1k: req.body.pricing?.input || 0,
      rateLimit: { rpm: 30, tpm: 60000 },
      
      name: req.body.name,
      provider: req.body.provider,
      endpoint: req.body.endpoint,
      apiProvider: req.body.apiProvider,
      capabilities: req.body.capabilities,
      pricing: req.body.pricing,
      status: 'active',
      statusReason: 'Ready'
    }

    // If custom API key is provided, save it to .env
    if (req.body.apiKey && req.body.apiProvider) {
      const envKey = `${req.body.apiProvider.toUpperCase()}_API_KEY`
      process.env[envKey] = req.body.apiKey
      
      const fs = require('fs')
      const path = require('path')
      const envPath = path.join(__dirname, '../.env')
      
      try {
        let envContent = fs.readFileSync(envPath, 'utf8')
        const keyRegex = new RegExp(`^${envKey}=.*$`, 'm')
        if (keyRegex.test(envContent)) {
          envContent = envContent.replace(keyRegex, `${envKey}=${req.body.apiKey}`)
        } else {
          envContent += `\n${envKey}=${req.body.apiKey}`
        }
        fs.writeFileSync(envPath, envContent)
      } catch (fsError) {
        console.error('Error writing to .env:', fsError)
      }
    }

    // Insert into DB
    await query(
      `INSERT INTO models (id, name, provider, status, capabilities, cost_per_1k, avg_latency, rate_limit, context_window, max_output_tokens, endpoint, model_id, api_provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newModel.id, newModel.name, newModel.provider, newModel.status,
        JSON.stringify(newModel.capabilities), newModel.costPer1k, newModel.avgLatency,
        JSON.stringify(newModel.rateLimit), newModel.contextWindow || 0, newModel.maxOutputTokens || 0,
        newModel.endpoint, newModel.model_id, newModel.apiProvider
      ]
    )
    res.status(201).json(newModel)
    
  } catch (error) {
    console.error('Error adding model:', error)
    res.status(500).json({ error: 'Failed to add model', details: error.message })
  }
})

module.exports = router