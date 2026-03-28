const AIRouterService = require("./aiRouterService");
const { getModelScore, SCORE_DIMENSIONS } = require("../data/modelScores");

class AIRouter {
  constructor(models) {
    this.models = models;
  }
  analyzeInput(input) {
    const inputLower = input.toLowerCase();
    const detectedCapabilities = ['text-generation'];

    // Reasoning/Logic detection
    const reasoningKeywords = [
      "solve",
      "puzzle",
      "logic",
      "reasoning",
      "think",
      "analyze",
      "explain",
      //" why",
      "deduce",
      "infer",
      "conclude",
      "prove",
    ];
    if (reasoningKeywords.some((keyword) => inputLower.includes(keyword))) {
      detectedCapabilities.push("reasoning");
    }

    // Thinking/Deep analysis detection
    const thinkingKeywords = [
      "thinking",
      "philosophy",
      "complex",
      "deep",
      "theoretical",
      "hypothesis",
      "argument",
      "debate",
    ];
    if (thinkingKeywords.some((keyword) => inputLower.includes(keyword))) {
      detectedCapabilities.push("thinking");
    }

    // Code detection
    const codeKeywords = [
      "code",
      "function",
      "class",
      "program",
      "script",
      "debug",
      "python",
      "javascript",
      "react",
      "java",
      "write a",
    ];
    if (codeKeywords.some((keyword) => inputLower.includes(keyword))) {
      detectedCapabilities.push("code");
    }

    // Documentation detection
    const docKeywords = ["document", "documentation", "readme", "comment"];
    if (docKeywords.some((keyword) => inputLower.includes(keyword))) {
      detectedCapabilities.push("documentation");
    }

    console.log(
      `🔍 Detected capabilities from input: ${detectedCapabilities.join(", ")}`
    );
    return detectedCapabilities;
  }
  analyzeIntent(input) {
    const inputLower = input.toLowerCase();
    const hints = [];

    // Detect if question needs thinking/reasoning
    if (
      inputLower.includes("puzzle") ||
      inputLower.includes("logic") ||
      inputLower.includes("solve") ||
      inputLower.includes("why") ||
      inputLower.includes("explain") ||
      inputLower.includes("philosophical")
    ) {
      hints.push("thinking", "reasoning");
    }

    // Detect if question needs code
    if (
      inputLower.includes("code") ||
      inputLower.includes("function") ||
      inputLower.includes("algorithm") ||
      inputLower.includes("program") ||
      inputLower.includes("script")
    ) {
      hints.push("code");
    }

    // Detect if question needs analysis
    if (
      inputLower.includes("analyze") ||
      inputLower.includes("compare") ||
      inputLower.includes("evaluate")
    ) {
      hints.push("analysis");
    }

    return hints;
  }
  async selectModel(request) {
    let { strategy = 'balanced', requiredCapabilities = [], input = '' } = request
  
    if (strategy === 'ai-powered') {
      const aiRouter = new AIRouterService();
      const decision = await aiRouter.routeQuestion(input, this.models);
      const selectedModel = this.models.find(m => m.id === decision.modelId);
      
      if (!selectedModel) {
        console.log('⚠️ AI Router invalid model, fallback to balanced');
        strategy = 'balanced';
      } else {
        console.log(`✅ AI-powered routing: ${selectedModel.name}`);
        return selectedModel;
      }
    }
    const hints = this.analyzeIntent(input)
    const allRequiredCapabilities = [...new Set([...requiredCapabilities, ...hints])]

    console.log(`🔍 Capabilities needed: ${allRequiredCapabilities.join(', ') || 'none'}`)

    let eligibleModels = this.models.filter(model =>
    model.status === 'active' &&
    allRequiredCapabilities.every(cap => model.capabilities.includes(cap))
  )
  
    if (eligibleModels.length === 0) {
      console.log('⚠️ No models match requirements, relaxing constraints...')
      eligibleModels = this.models.filter(model => model.status === 'active')
    }
  
    switch (strategy) {
      case 'cost-optimized':
        return this.selectByCost(eligibleModels)
      case 'performance-optimized':
        return this.selectByLatency(eligibleModels)
      case 'quality-optimized':
        return this.selectByQuality(eligibleModels)
      case 'balanced':
      default:
        return this.selectBalanced(eligibleModels)
    }
  }

  selectByCost(models) {
    return models.reduce((cheapest, current) => {
      // If costs are equal, pick the one with lower latency
      if (current.costPer1k === cheapest.costPer1k) {
        return current.avgLatency < cheapest.avgLatency ? current : cheapest;
      }
      return current.costPer1k < cheapest.costPer1k ? current : cheapest;
    });
  }
  selectByLatency(models) {
    return models.reduce((fastest, current) =>
      current.avgLatency < fastest.avgLatency ? current : fastest
    );
  }

  selectByQuality(models) {
    return models.reduce((best, current) => {
      const calculateQualityScore = (model) => {
        const scoreEntry = getModelScore(model.id);
        if (scoreEntry) {
          // Use numeric scores — weight reasoning and knowledge highest
          const s = scoreEntry.scores;
          return (s.reasoning * 30) + (s.knowledge * 25) + (s.analysis * 20) +
                 (s.code * 15) + (s.creativity * 10) + (s.instruction * 10);
        }
        // Fallback to old capability-based scoring
        let score = 0;
        if (model.capabilities.includes('thinking')) score += 100;
        if (model.capabilities.includes('reasoning')) score += 80;
        if (model.capabilities.includes('analysis')) score += 70;
        if (model.capabilities.includes('code')) score += 50;
        if (model.capabilities.includes('documentation')) score += 40;
        if (model.capabilities.includes('text-generation')) score += 20;
        score += model.avgLatency * 0.1;
        return score;
      };

      const currentScore = calculateQualityScore(current);
      const bestScore = calculateQualityScore(best);

      return currentScore > bestScore ? current : best;
    });
  }
  selectBalanced(models) {
    const maxLatency = Math.max(...models.map((m) => m.avgLatency));

    const scored = models.map((model) => {
      let qualityScore = 0;
      const scoreEntry = getModelScore(model.id);

      if (scoreEntry) {
        // Use numeric scores for quality assessment
        const s = scoreEntry.scores;
        qualityScore = (s.reasoning * 40) + (s.code * 25) + (s.analysis * 20) +
                       (s.knowledge * 15) + (s.creativity * 10);
      } else {
        // Fallback to old capability-based scoring
        if (model.capabilities.includes('thinking')) qualityScore += 50;
        if (model.capabilities.includes('reasoning')) qualityScore += 40;
        if (model.capabilities.includes('analysis')) qualityScore += 30;
        if (model.capabilities.includes('code')) qualityScore += 25;
        if (model.capabilities.includes('documentation')) qualityScore += 15;
      }

      const maxPossibleScore = scoreEntry ? 110 : 160; // Normalize based on method
      const normalizedQuality = qualityScore / maxPossibleScore;
      const normalizedLatency = 1 - model.avgLatency / maxLatency;
      const finalScore = normalizedLatency * 0.6 + normalizedQuality * 0.4;

      return { model, score: finalScore };
    });

    return scored.reduce((best, current) =>
      current.score > best.score ? current : best
    ).model;
  }
  explainDecision(selectedModel, strategy) {
    return {
      model: selectedModel.name,
      reason: this.getReasonText(selectedModel, strategy),
      metrics: {
        cost: selectedModel.costPer1k,
        latency: selectedModel.avgLatency,
      },
    };
  }
  selectWithHighestLimit(models) {
    return models.reduce((best, current) => {
      const bestRpm = best.rateLimit?.rpm || 0;
      const currentRpm = current.rateLimit?.rpm || 0;
      return currentRpm > bestRpm ? current : best;
    });
  }
  getReasonText(model, strategy) {
    switch (strategy) {
      case "cost-optimized":
        return `Selected ${model.name} - free model with fastest response (${model.avgLatency}ms)`;
      case "performance-optimized":
        return `Selected ${model.name} for fastest response time (${model.avgLatency}ms)`;
      case "quality-optimized":
        const hasThinking = model.capabilities.includes("thinking");
        const hasReasoning = model.capabilities.includes("reasoning");
        if (hasThinking) {
          return `Selected ${model.name} for advanced thinking capabilities`;
        } else if (hasReasoning) {
          return `Selected ${model.name} for strong reasoning capabilities`;
        } else {
          return `Selected ${model.name} for comprehensive processing (${model.capabilities.length} capabilities)`;
        }
      case "balanced":
      default:
        return `Selected ${model.name} for best balance of speed (${model.avgLatency}ms) and capabilities`;
    }
  }
}

module.exports = AIRouter;
