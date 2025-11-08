const axios = require('axios')
const express = require('express')
const router = express.Router()
const AIRouter = require('../services/router')
const AIProvider = require('../services/aiProvider')
const MistralProvider = require('../services/mistralProvider')
const CerebrasProvider = require('../services/cerebrasProvider')
const GroqProvider = require('../services/groqProvider')
const CohereProvider = require('../services/cohereProvider')
const CustomProvider = require('../services/genericProvider')

const models = require('../data/models')

// Initialize all providers
const openrouterProvider = new AIProvider()
const mistralProvider = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider = new GroqProvider()
const cohereProvider = new CohereProvider()
const customProvider= new CustomProvider()

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities, modelId } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    let selectedModel
    let decision

    if (modelId) {
      // Manual model selection
      selectedModel = models.find(m => m.id === parseInt(modelId, 10))
      
      if (!selectedModel) {
        return res.status(404).json({ error: "Model not found" })
      }
      
      // Check if API key is available
      const { checkApiKey } = require('../utils/apiKeyValidator')
      const keyCheck = checkApiKey(selectedModel.apiProvider)
      
      if (!keyCheck.available) {
        return res.status(503).json({ 
          error: 'Model unavailable', 
          details: keyCheck.reason,
          model: selectedModel.name
        })
      }
      
      decision = {
        reason: 'Manual model selection by user',
        mode: 'manual'
      }
      console.log(`👤 Manual selection: ${selectedModel.name}`)
      
    } else {
      // Automatic router selection
      const AIRouter = require('../services/router')
      const { updateModelStatuses } = require('../utils/apiKeyValidator')
      
      // Filter only available models
      const availableModels = updateModelStatuses(models).filter(m => m.status === 'active')
      
      if (availableModels.length === 0) {
        return res.status(503).json({ 
          error: 'No models available', 
          details: 'No API keys configured'
        })
      }
      
      const aiRouter = new AIRouter(availableModels)
      
      selectedModel = aiRouter.selectModel({
        strategy: strategy || 'balanced',
        requiredCapabilities: requiredCapabilities || ['text-generation'],
        input: input
      })
      
      decision = aiRouter.explainDecision(selectedModel, strategy || 'balanced')
      decision.mode = 'auto'
      console.log(`🎯 Selected model: ${selectedModel.name} (${decision.reason})`)
    }

    // Validate selectedModel exists
    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    // Route to correct provider
    let response
    
    switch (selectedModel.apiProvider) {
      case 'mistral':
        console.log('Using Mistral Provider')
        response = await mistralProvider.callModel(selectedModel, input)
        break
      
      case 'cerebras':
        console.log('Using Cerebras Provider')
        response = await cerebrasProvider.callModel(selectedModel, input)
        break
      
      case 'groq':
        console.log('Using Groq Provider')
        response = await groqProvider.callModel(selectedModel, input)
        break
      
      case 'openrouter':
        console.log('Using OpenRouter Provider')
        response = await openrouterProvider.callModel(selectedModel, input)
        break
      
      case 'cohere':
        console.log('Using Cohere Provider')
        response = await cohereProvider.callModel(selectedModel, input)
        break
      
      default:
        console.log(`Using Custom Provider: ${selectedModel.apiProvider}`)
        response = await customProvider.callModel(selectedModel, input)
        break
    }

    res.json({
      success: true,
      input,
      output: response.output,
      model: selectedModel.name,
      provider: selectedModel.provider,
      decision,
      metrics: {
        latency: response.latency,
        cost: response.cost,
        tokensUsed: response.tokensUsed
      }
    })

    // Track request for analytics (non-blocking)
    axios.post('http://localhost:5000/api/analytics/track', {
      model: selectedModel.name,
      latency: response.latency,
      cost: response.cost
    }).catch(err => console.error('Analytics tracking failed:', err.message))

  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router