const { CohereClient } = require('cohere-ai')

class CohereProvider {
  constructor() {
    this.client = new CohereClient({
      token: process.env.COHERE_API_KEY
    })
    this.name = 'Cohere'
  }

  async callModel(model, input) {
    const startTime = Date.now()
    
    try {
      console.log(`📡 Calling Cohere model: ${model.model_id}`)
      console.log(`📝 Input: ${input.substring(0, 100)}...`)

      const response = await this.client.chat({
        model: model.model_id,
        message: input,
        temperature: 0.7,
        maxTokens: 1000
      })

      const latency = Date.now() - startTime
      const output = response.text
      const tokensUsed = response.meta?.tokens?.inputTokens + response.meta?.tokens?.outputTokens || 0

      console.log(`✅ Success with Cohere ${model.name}`)

      return {
        output,
        latency,
        tokensUsed,
        cost: (tokensUsed / 1000000) * (model.pricing?.input || 0)
      }

    } catch (error) {
      console.error(`❌ Error with Cohere:`, error.message)
      throw new Error(`Cohere API error: ${error.message}`)
    }
  }
}

module.exports = CohereProvider
