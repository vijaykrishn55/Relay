const GroqProvider = require("./groqProvider");
const { getModelsSync } = require("../data/models");
const { getModelScore, SCORE_DIMENSIONS } = require("../data/modelScores");
const { selectBestModel } = require("./scoreMatcher");
const rateLimiter = require("../utils/rateLimiter");
const AIRouter = require("./router");

class AIRouterService {
  constructor() {
        this.groqProvider = new GroqProvider();
        this.routerModel = getModelsSync().find(m => m.id === 9);
  }

  generatePrompt(userQuestion, availableModels){
        const modelsInfo = this.formatModelsForPrompt(availableModels);
        return `You are an AI Router System. Your ONLY job is to select the best AI model for a question.

ABSOLUTE RULES — VIOLATION IS FORBIDDEN:
1. You are a ROUTER, not an assistant. Do NOT answer the user's question.
2. Do NOT provide explanations, opinions, or information about the topic.
3. Do NOT use web search or any tools — just analyze and select.
4. Return ONLY the JSON below — no markdown, no code blocks, no extra text.

AVAILABLE MODELS (with numeric capability scores 0.0–1.0):
${modelsInfo}

USER QUESTION: "${userQuestion}"

ANALYSIS STEPS:
1. What skills does this question need? (code, reasoning, creativity, multilingual, etc.)
2. Which model's scores best match those needs?
3. Check rate limits — avoid models near their limits.
4. NEVER select Compound Mini (id=9) — that is YOU, the router. You cannot answer questions.

SCORING DIMENSIONS: ${SCORE_DIMENSIONS.join(', ')}
Match the question's needs against each model's scores. Pick the highest match.

CRITICAL: Return ONLY this JSON, nothing else:
{
  "modelId": <number>,
  "modelName": "<exact model name>",
  "reason": "<1-2 sentences why this model's scores match the question's needs>"
}`;
  }

  async routeQuestion(userQuestion, availableModels){
        try {
      console.log(`🤖 AI Router analyzing: "${userQuestion.substring(0, 50)}..."`);
      
      // Step 1: Generate the prompt with models info
      const prompt = this.generatePrompt(userQuestion, availableModels);
      
      // Step 2: Call Router AI (Compound Mini) — routing only, no answering
      console.log('📡 Calling Router AI for decision...');
      rateLimiter.record(this.routerModel.id);
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

      // Step 5b: ENFORCE — Router MUST NOT select itself (Compound Mini id=9)
      if (decision.modelId === 9) {
        console.log('⚠️ Router tried to select itself — using score-based fallback');
        return this._scoreBasedFallback(userQuestion, availableModels);
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
      console.log('🔄 Falling back to score-based selection.');
      return this._scoreBasedFallback(userQuestion, availableModels);
    }
  }

  /**
   * Score-based fallback when AI routing fails.
   * Uses numeric score matching instead of keyword heuristics.
   */
  _scoreBasedFallback(userQuestion, availableModels) {
    // Quick heuristic scoring of the question
    const inputLower = userQuestion.toLowerCase();
    const questionScores = {
      reasoning: 0.5,
      code: 0.3,
      creativity: 0.3,
      speed: 0.5,
      multilingual: 0.1,
      analysis: 0.4,
      instruction: 0.4,
      knowledge: 0.5
    };

    // Boost scores based on keywords
    if (/\b(code|function|class|program|script|debug|python|javascript|react|java|html|css|sql)\b/i.test(inputLower)) {
      questionScores.code = 0.9;
      questionScores.instruction = 0.7;
    }
    if (/\b(reason|logic|solve|puzzle|prove|deduce|infer|why|analyze)\b/i.test(inputLower)) {
      questionScores.reasoning = 0.85;
    }
    if (/\b(creative|story|poem|write|imagine|brainstorm)\b/i.test(inputLower)) {
      questionScores.creativity = 0.8;
    }
    if (/\b(translate|arabic|french|spanish|multilingual|language)\b/i.test(inputLower)) {
      questionScores.multilingual = 0.9;
    }
    if (/\b(compare|evaluate|analyze|data|chart|statistics)\b/i.test(inputLower)) {
      questionScores.analysis = 0.8;
    }
    if (/\b(diagram|mermaid|flowchart|graph|visual)\b/i.test(inputLower)) {
      questionScores.instruction = 0.8;
      questionScores.creativity = 0.6;
    }

    // Use score matcher — exclude Compound Mini (id=9) from specialist answers
    const match = selectBestModel(questionScores, availableModels, 'specialist');
    if (match) {
      return {
        modelId: match.model.id,
        modelName: match.model.name,
        reason: `Score-matched fallback: ${match.reason}`
      };
    }

    // Last resort: keyword-based fallback via old router
    const router = new AIRouter(availableModels);
    const fallbackModel = router.selectModel({
      strategy: 'balanced',
      requiredCapabilities: ['text-generation'],
      input: userQuestion
    });

    return {
      modelId: fallbackModel.id,
      modelName: fallbackModel.name,
      reason: 'Keyword-based fallback — all other methods failed'
    };
  }

  formatModelsForPrompt(availableModels){
        return availableModels
          .filter(m => m.id !== 9) // Don't show Compound Mini as an option
          .map((model) => {
                const capabilities = model.capabilities.join(', ');
                const rateLimit = model.rateLimit.rpm ? `${model.rateLimit.rpm} req/min`: model.rateLimit.rpd ? `${model.rateLimit.rpd} req/day` : 'Limited';
                
                // Include numeric scores if available
                const scoreEntry = getModelScore(model.id);
                const scoresStr = scoreEntry 
                  ? SCORE_DIMENSIONS.map(d => `${d}:${scoreEntry.scores[d]}`).join(', ')
                  : 'No scores';
                
                return `${model.id}. ${model.name} (${model.provider})
   - Capability Scores: ${scoresStr}
   - Speed: ${model.avgLatency}ms avg latency
   - Cost: ${model.costPer1k === 0 ? 'FREE' : `$${model.costPer1k}/1K tokens`}
   - Rate Limit: ${rateLimit}
   - Best for: ${scoreEntry ? scoreEntry.bestFor : this.getModelSpecialty(model)}`;
        }).join('\n\n');
  }

  getModelSpecialty(model) {
    const specialties = {
      'Codestral': 'code generation, debugging, technical documentation',
      'Z.AI GLM 4.7': 'coding with advanced reasoning, tool use',
      'OpenAI GPT OSS': 'real-time coding, large documents, Q&A, research',
      'Llama 3.1 8B': 'speed-critical tasks, high-throughput',
      'Allam 2 7B': 'multilingual tasks, international content',
      'Llama 3.1 8B Instant': 'ultra-fast simple tasks, quick responses',
      'Llama 4 Scout 17B': 'reasoning, analysis, research tasks',
      'Compound': 'balanced reasoning and speed',
      'Command A Reasoning': 'deep reasoning, complex analysis, structured outputs',
      'Command R Plus': 'multilingual, citations, structured output'
    };
    
    return specialties[model.name] || 'general-purpose tasks';
  }

}

module.exports = AIRouterService;