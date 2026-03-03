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
        'Z.AI GLM 4.7': 'zai-glm-4.7',
        'OpenAI GPT OSS': 'gpt-oss-120b',
        'Llama 3.1 8B': 'llama3.1-8b'
      }

      const cerebrasModel = modelMap[model.name] || 'llama3.1-8b'

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