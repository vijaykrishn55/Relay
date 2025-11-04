const { Cerebras } = require('@cerebras/cerebras_cloud_sdk')

class CerebrasProvider {
  constructor() {
    this.client = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY
    })
  }

  async callModel(model, input) {
    try {
      const startTime = Date.now()

      // Map our model names to Cerebras model IDs
      const modelMap = {
        'Qwen 3 235B Thinking': 'qwen2.5-32b',
        'Qwen 3 Coder 480B': 'qwen2.5-coder-32b',
        'Llama 4 Maverick': 'llama-3.3-70b'
      }

      const cerebrasModel = modelMap[model.name] || 'llama-3.3-70b'

      console.log(`📡 Calling Cerebras model: ${cerebrasModel}`)
      console.log(`📝 Input: ${input.substring(0, 50)}...`)

      const completion = await this.client.chat.completions.create({
        model: cerebrasModel,
        messages: [
          {
            role: 'user',
            content: input
          }
        ]
      })

      const endTime = Date.now()
      const latency = endTime - startTime

      const output = completion.choices[0].message.content
      const tokensUsed = completion.usage.total_tokens
      const cost = this.calculateCost(tokensUsed, model.costPer1k)

      console.log(`✅ Success with Cerebras ${cerebrasModel}`)

      return {
        output,
        latency,
        cost: cost.toFixed(4),
        tokensUsed
      }

    } catch (error) {
      console.error('❌ Error calling Cerebras:', error.message)
      throw new Error(`Cerebras Provider Error: ${error.message}`)
    }
  }

  calculateCost(tokens, costPer1k) {
    return (tokens / 1000) * costPer1k
  }
}

module.exports = CerebrasProvider