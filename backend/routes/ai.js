const express = require('express')
const router = express.Router()
const AIRouter = require('../services/router')
const AIProvider = require('../services/aiProvider')
const MistralProvider = require('../services/mistralProvider')
const CerebrasProvider = require('../services/cerebrasProvider')
const GroqProvider = require('../services/groqProvider')
const CohereProvider = require('../services/cohereProvider')
const models = require('../data/models')

const openrouterProvider = new AIProvider()
const mistralProvider = new MistralProvider()
const cerebrasProvider = new CerebrasProvider()
const groqProvider = new GroqProvider()
const cohereProvider = new CohereProvider()

router.post('/process', async (req, res) => {
  try {
    const { input, strategy, requiredCapabilities } = req.body

    if (!input || input.trim() === '') {
      return res.status(400).json({ error: 'Input is required' })
    }

    const aiRouter = new AIRouter(models)

    const selectedModel = await aiRouter.selectModel({
      strategy: strategy || 'ai-powered',
      requiredCapabilities: requiredCapabilities || ['text-generation'],
      input
    })

    if (!selectedModel) {
      return res.status(503).json({ error: 'No suitable model available' })
    }

    const decision = aiRouter.explainDecision(selectedModel, strategy || 'ai-powered')
    decision.mode = 'auto'
    console.log(`🎯 Selected: ${selectedModel.name}`)

    let response

    switch (selectedModel.apiProvider) {
      case 'mistral':
        response = await mistralProvider.callModel(selectedModel, input)
        break
      case 'cerebras':
        response = await cerebrasProvider.callModel(selectedModel, input)
        break
      case 'groq':
        response = await groqProvider.callModel(selectedModel, input)
        break
      case 'openrouter':
        response = await openrouterProvider.callModel(selectedModel, input)
        break
      case 'cohere':
        response = await cohereProvider.callModel(selectedModel, input)
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

  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router