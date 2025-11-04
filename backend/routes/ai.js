const axios = require('axios')
const express = require('express')
const router = express.Router()
const AIRouter = require('../services/router')
const AIProvider = require('../services/aiProvider')
const MistralProvider = require('../services/mistralProvider')
const CerebrasProvider = require('../services/cerebrasProvider')
const GroqProvider = require('../services/groqProvider')

const models = require('../data/models')

// Initialize all providers
const openrouterProvider = new AIProvider()
const mistralProvider = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider = new GroqProvider()

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    // Initialize router
    const aiRouter = new AIRouter(models)

    // Select best model
    const selectedModel = aiRouter.selectModel({
        strategy: strategy || 'balanced',
        requiredCapabilities: requiredCapabilities || ['text-generation'],
        input: input  // Pass input for intent analysis
        })

    // Get decision explanation
    const decision = aiRouter.explainDecision(selectedModel, strategy || 'balanced')
    console.log(`🎯 Selected model: ${selectedModel.name} (${decision.reason})`)

    // Route to correct provider based on apiProvider field
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
      
      default:
        throw new Error(`Unknown provider: ${selectedModel.apiProvider}`)
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