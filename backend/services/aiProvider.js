const OpenAI = require('openai')

class AIProvider{
        constructor(){
                this.openrouter = new OpenAI({
                        baseURL: 'https://openrouter.ai/api/v1',
                        apiKey: process.env.OPENROUTER_API_KEY,
                })
        }

        async callModel(model, input){
                try{
                        const startTime = Date.now()
                        
                        //map models
                        const modelMap={
                                'Gemini-2.0': 'google/gemini-2.0-flash-exp:free'
                        }

                        const openrouterModel =modelMap[model.name] || 'deepseek/deepseek-r1:free'

                        console.log(`📡 Calling model: ${openrouterModel}`)
                        console.log(`📝 Input: ${input.substring(0, 50)}...`)
                        
                        const completion = await this.openrouter.chat.completions.create({
                                model: openrouterModel,
                                messages:[
                                        {
                                                role : 'user',
                                                content:input
                                        }
                                ]
                        })

                        const endTime = Date.now()
                        const latency = endTime - startTime

                        const output = completion.choices[0].message.content
                        const tokensUsed = completion.usage.total_tokens
                        const cost = this.calculateCost(tokensUsed, model.costPer1k)

                        return {
                                output,latency,
                                cost: cost.toFixed(4),
                                tokensUsed
                        }
                }catch(error){
                        console.error('Error calling AI model:', error)
                        throw new Error(`AI Provider Error : ${error.message}`)
                }
        }

        calculateCost(tokens,costPer1k){
                return (tokens/1000) * costPer1k
        }
}

module.exports = AIProvider;