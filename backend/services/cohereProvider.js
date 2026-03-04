const { CohereClientV2 } = require('cohere-ai')

class CohereProvider {
  constructor() {
    this.client = new CohereClientV2({
      token: process.env.COHERE_API_KEY
    })
    this.name = 'Cohere'
  }

  async callModel(model, input) {
    const startTime = Date.now()

    try {
      console.log(`📡 Calling Cohere model: ${model.model_id}`)

      const response = await this.client.chat({
        model: model.model_id,
        messages: [{ role: 'user', content: input }]
      })

      const latency = Date.now() - startTime
      const output = response.message?.content?.[0]?.text || ''
      const tokensUsed = (response.usage?.tokens?.inputTokens || 0) + (response.usage?.tokens?.outputTokens || 0)

      console.log(`✅ Success with Cohere ${model.name}`)

      return {
        output,
        latency,
        tokensUsed,
        cost: 0
      }

    } catch (error) {
      console.error(`❌ Error with Cohere:`, error.message)
      throw new Error(`Cohere API error: ${error.message}`)
    }
  }
}

module.exports = CohereProvider
