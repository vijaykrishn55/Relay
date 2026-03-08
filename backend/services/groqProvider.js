const Groq = require('groq-sdk')

class GroqProvider {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
  }

  async callModel(model, input, systemContext = null) {
    try {
      const startTime = Date.now()

      // Map our model names to Groq model IDs
      const modelMap = {
        'Allam 2 7B': 'allam-2-7b',
        'Llama 3.1 8B Instant': 'llama-3.1-8b-instant',
        'Llama 4 Scout 17B': 'meta-llama/llama-4-scout-17b-16e-instruct',
        'Compound Mini': 'groq/compound-mini',
        'Compound': 'groq/compound'
      }

      const groqModel = modelMap[model.name] || 'llama-3.1-8b-instant'

      console.log(`📡 Calling Groq model: ${groqModel}`)
      console.log(`📝 Input: ${input.substring(0, 50)}...`)

      const messages = []
      if (systemContext) {
        messages.push({ role: 'system', content: systemContext })
      }
      messages.push({ role: 'user', content: input })

      const completion = await this.client.chat.completions.create({
        model: groqModel,
        messages
      })

      const endTime = Date.now()
      const latency = endTime - startTime

      const output = completion.choices[0].message.content
      const tokensUsed = completion.usage.total_tokens
      const cost = this.calculateCost(tokensUsed, model.costPer1k)

      console.log(`✅ Success with Groq ${groqModel}`)

      return {
        output,
        latency,
        cost: cost.toFixed(4),
        tokensUsed
      }

    } catch (error) {
      console.error('❌ Error calling Groq:', error.message)
      throw new Error(`Groq Provider Error: ${error.message}`)
    }
  }

  calculateCost(tokens, costPer1k) {
    return (tokens / 1000) * costPer1k
  }
}

module.exports = GroqProvider
