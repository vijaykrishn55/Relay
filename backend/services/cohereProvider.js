const { CohereClientV2 } = require('cohere-ai')

class CohereProvider {
  constructor() {
    this.client = new CohereClientV2({
      token: process.env.COHERE_API_KEY
    })
    this.name = 'Cohere'
  }

  async callModel(model, input, systemContext = null) {
    const startTime = Date.now()

    try {
      console.log(`📡 Calling Cohere model: ${model.model_id}`)

      const messages = []
      if (systemContext) {
        messages.push({ role: 'system', content: systemContext })
      }
      messages.push({ role: 'user', content: input })

      const response = await this.client.chat({
        model: model.model_id,
        messages
      })

      const latency = Date.now() - startTime

      // Extract output - handle different Cohere API response formats
      let output = ''
      if (response.message?.content) {
        // V2 format: content is an array of content blocks
        if (Array.isArray(response.message.content)) {
          output = response.message.content
            .filter(block => block.type === 'text' || block.text)
            .map(block => block.text)
            .join('')
        } else if (typeof response.message.content === 'string') {
          // Fallback: content is a string directly
          output = response.message.content
        }
      } else if (response.text) {
        // Legacy format: text field directly on response
        output = response.text
      }

      // Critical: Throw error if output extraction failed
      if (!output || output.trim() === '') {
        console.error('⚠️ Cohere response structure:', JSON.stringify(response, null, 2).substring(0, 500))
        throw new Error('Failed to extract output from Cohere response - empty or missing content')
      }

      const tokensUsed = (response.usage?.tokens?.inputTokens || 0) + (response.usage?.tokens?.outputTokens || 0)

      console.log(`✅ Success with Cohere ${model.name} (${output.length} chars)`)

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
