const axios = require('axios')

class CustomProvider {
  async callModel(model, input) {
    const startTime = Date.now()
    
    try {
      const apiKey = process.env[`${model.apiProvider.toUpperCase()}_API_KEY`]
      
      if (!apiKey) {
        throw new Error(`API key not found for ${model.apiProvider}`)
      }

      console.log(`📡 Calling custom provider: ${model.apiProvider}`)

      // Try OpenAI-compatible format first (most common)
      const response = await axios.post(
        `${model.endpoint}/chat/completions`, // Standard endpoint
        {
          model: model.model_id,
          messages: [{ role: 'user', content: input }],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const latency = Date.now() - startTime
      const output = response.data.choices?.[0]?.message?.content || 
                    response.data.content || // Alternative format
                    JSON.stringify(response.data)
      
      const tokensUsed = response.data.usage?.total_tokens || 0

      console.log(`✅ Success with ${model.apiProvider}`)

      return {
        output,
        latency,
        tokensUsed,
        cost: (tokensUsed / 1000000) * (model.pricing?.input || 0)
      }

    } catch (error) {
      console.error(`❌ Error with ${model.apiProvider}:`, error.response?.data || error.message)
      throw new Error(`Custom provider error: ${error.message}`)
    }
  }
}

module.exports = CustomProvider