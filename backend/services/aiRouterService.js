const GroqProvider = require("./groqProvider");
const models = require("../data/models");
const AIRouter = require("./router");

class AIRouterService {
  constructor() {
        this.groqProvider = new GroqProvider();
        this.routerModel = models.find(m => m.id === 9);
  }

  generatePrompt(userQuestion, availableModels){
        const modelsInfo = this.formatModelsForPrompt(availableModels);
        return `You are an AI Router System. Your job is to analyze a user's question and intelligently select the BEST AI model to handle it from the available options.

AVAILABLE MODELS:
${modelsInfo}

USER QUESTION: "${userQuestion}"

ANALYSIS INSTRUCTIONS:
Carefully analyze the user's question and consider:
1. Task Type: Is this coding, creative writing, reasoning, analysis, or general conversation?
2. Complexity: Simple query or complex multi-step problem?
3. Speed vs Quality: Does the user need a fast response or highest quality?
4. Specialization: Which model's capabilities and specialty best match this task?
5. Model Availability: Consider rate limits - avoid models with very low limits if alternatives exist

DECISION RULES:
- For code/programming → Prefer Codestral or Qwen Coder
- For creative writing → Prefer Gemini
- For deep reasoning/analysis → Prefer Qwen Thinking or Scout
- For simple/fast queries → Prefer Llama Instant or Compound Mini
- For multilingual → Prefer Allam
- For balanced general tasks → Prefer Gemini or Llama models

CRITICAL: Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text:
{
  "modelId": <number>,
  "modelName": "<exact model name from list>",
  "reason": "<concise explanation in 1-2 sentences why this model is optimal>"
}`;
  }

  async routeQuestion(userQuestion, availableModels){
        try {
      console.log(`🤖 AI Router analyzing question: "${userQuestion.substring(0, 50)}..."`);
      
      // Step 1: Generate the prompt with models info
      const prompt = this.generatePrompt(userQuestion, availableModels);
      
      // Step 2: Call Router AI (Groq Compound Mini)
      console.log('📡 Calling Router AI for decision...');
      const response = await this.groqProvider.callModel(this.routerModel, prompt);
      
      // Step 3: Extract and clean the response
      let aiResponse = response.output.trim();
      aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Step 4: Parse JSON
      const decision = JSON.parse(aiResponse);
      
      // Step 5: Validate the decision
      if (!decision.modelId || !decision.modelName || !decision.reason) {
        throw new Error('Invalid decision format from Router AI');
      }
      
      // Step 6: Verify the selected model exists
      const selectedModel = availableModels.find(m => m.id === decision.modelId);
      if (!selectedModel) {
        throw new Error(`Router AI selected invalid model ID: ${decision.modelId}`);
      }
      
      console.log(`✅ Router AI selected: ${decision.modelName} (ID: ${decision.modelId})`);
      console.log(`   Reason: ${decision.reason}`);
      
      return {
        modelId: decision.modelId,
        modelName: decision.modelName,
        reason: decision.reason
      };
      
    } catch (error) {
      console.error('❌ Router AI failed:', error.message);
      console.log('🔄 Falling back to manual selection based on simple heuristics.');

      //fallback
      const router = new AIRouter(availableModels);
      const fallbackModel = router.selectModel({
        strategy : 'balanced',
        requiredCapabilities: ['text-generation'],
        input: userQuestion
      });

      return {
        modelId :fallbackModel.id,
        modelName: fallbackModel.name,
        reason: 'Fallback to manual selection due to Router AI failure'
      }
    }
  }

  formatModelsForPrompt(availableModels){
        return availableModels.map((model, index)=>{
                const capabilities = model.capabilities.join(', ');
                const rateLimit = model.rateLimit.rpm ? `${model.rateLimit.rpm} requests/min`: model.rateLimit.rpd ? `${model.rateLimit.rpd} requests/day` : 'Limited';
                return `${model.id}. ${model.name} (${model.provider})
   - Capabilities: ${capabilities}
   - Speed: ${model.avgLatency}ms average latency
   - Cost: ${model.costPer1k === 0 ? 'FREE' : `$${model.costPer1k} per 1K tokens`}
   - Rate Limit: ${rateLimit}
   - Best for: ${this.getModelSpecialty(model)}`;
        }).join('\n\n');
  }

  getModelSpecialty(model) {
    const specialties = {
      // 'Gemini 2.0 Flash': 'fast general-purpose tasks, creative writing, reasoning',
      'Codestral': 'code generation, debugging, technical documentation',
      'Z.AI GLM 4.7': 'coding with advanced reasoning, tool use, real-world performance',
      'OpenAI GPT OSS': 'real-time coding assistance, large documents, Q&A, research',
      'Llama 3.1 8B': 'speed-critical tasks, high-throughput, batch processing',
      'Allam 2 7B': 'multilingual tasks, international content',
      'Llama 3.1 8B Instant': 'ultra-fast simple tasks, quick responses',
      'Llama 4 Scout 17B': 'reasoning, analysis, research tasks',
      'Compound Mini': 'lightweight fast tasks, simple queries',
      'Compound': 'balanced reasoning and speed',
      'Command A Reasoning': 'deep reasoning, complex analysis, Multilingual, structured outputs, tool use',
      'Command R Plus': 'Multilingual, Safety Modes, Citations, Tool Use, Structured Output'
    };
    
    return specialties[model.name] || 'general-purpose tasks';
  }

}

module.exports = AIRouterService;