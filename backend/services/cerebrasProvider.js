const { Cerebras } = require('@cerebras/cerebras_cloud_sdk')

class CerebrasProvider {
  constructor() {
    this.client = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY
    })
  }

  async callModel(model, input, systemContext = null, conversationHistory = []) {
    try {
      const startTime = Date.now()

      // Map our model names to valid Cerebras model IDs
      // Valid Cerebras models: llama3.1-8b, qwen-3-235b-a22b-instruct-2507, gpt-oss-120b
      const modelMap = {
        'Qwen 3 235B': 'qwen-3-235b-a22b-instruct-2507',
        'GPT OSS 120B': 'gpt-oss-120b',
        'Llama 3.1 8B': 'llama3.1-8b',
        // Legacy names (for backward compatibility with DB)
        'Z.AI GLM 4.7': 'qwen-3-235b-a22b-instruct-2507',
        'OpenAI GPT OSS 120B': 'gpt-oss-120b',
        'OpenAI GPT OSS': 'gpt-oss-120b',
        'Llama 3.3 70B': 'llama3.1-8b',
        'Qwen 3 32B': 'qwen-3-235b-a22b-instruct-2507'
      }

      const cerebrasModel = modelMap[model.name] || 'llama3.1-8b'

      console.log(`📡 Calling Cerebras model: ${cerebrasModel}`)
      console.log(`📝 Input: ${input.substring(0, 50)}...`)

      const messages = []
      if (systemContext) {
        messages.push({ role: 'system', content: systemContext })
      }
      // Include conversation history for in-session context
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory)
      }
      messages.push({ role: 'user', content: input })

      const completion = await this.client.chat.completions.create({
        model: cerebrasModel,
        messages
      })

      const endTime = Date.now()
      const latency = endTime - startTime

      const output = completion.choices?.[0]?.message?.content || ''
      const tokensUsed = completion.usage?.total_tokens || 0
      const cost = this.calculateCost(tokensUsed, model.costPer1k)

      // Validate output is not empty
      if (!output || output.trim() === '') {
        console.error(`⚠️ Cerebras ${cerebrasModel} returned empty content`)
        throw new Error('Cerebras returned empty response content')
      }

      console.log(`✅ Success with Cerebras ${cerebrasModel} (${output.length} chars)`)

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