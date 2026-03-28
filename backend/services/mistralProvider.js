const { Mistral } = require("@mistralai/mistralai");

class MistralProvider {
  constructor() {
    this.client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  async callModel(model, input, systemContext = null) {
    try {
      const startTime = Date.now();

      // Map our model names to Mistral model IDs
      const modelMap = {
        Codestral: "codestral-latest",
        "Mistral Small": "mistral-small-latest",
        "Mistral Medium": "mistral-medium-latest",
        "Mistral Large": "mistral-large-latest",
      };

      const mistralModel = modelMap[model.name] || "codestral-latest";
      const isCodestral = mistralModel === "codestral-latest";
      const endpoint = isCodestral
        ? "https://codestral.mistral.ai/v1/chat/completions"
        : "https://api.mistral.ai/v1/chat/completions";
      
      console.log(`📡 Calling Mistral model: ${mistralModel}`);
      console.log(`🌐 Endpoint: ${endpoint}`);
      console.log(`📝 Input: ${input.substring(0, 50)}...`);

      const messages = [];
      if (systemContext) {
        messages.push({ role: "system", content: systemContext });
      }
      messages.push({ role: "user", content: input });

      let chatResponse;

      if (isCodestral) {
        const codestralClient = new Mistral({
          apiKey: process.env.MISTRAL_API_KEY,
          serverURL: "https://codestral.mistral.ai",
        });

        chatResponse = await codestralClient.chat.complete({
          model: mistralModel,
          messages,
        });
      } else {
        chatResponse = await this.client.chat.complete({
          model: mistralModel,
          messages,
        });
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      const output = chatResponse.choices?.[0]?.message?.content || '';
      const tokensUsed = chatResponse.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, model.costPer1k);

      // Validate output is not empty
      if (!output || output.trim() === '') {
        console.error(`⚠️ Mistral ${mistralModel} returned empty content`);
        throw new Error('Mistral returned empty response content');
      }

      console.log(`✅ Success with Mistral ${mistralModel} (${output.length} chars)`);

      return {
        output,
        latency,
        cost: cost.toFixed(4),
        tokensUsed,
      };
    } catch (error) {
      console.error("❌ Error calling Mistral:", error.message);
      console.error("Full error:", error);
      throw new Error(`Mistral Provider Error: ${error.message}`);
    }
  }

  calculateCost(tokens, costPer1k) {
    return (tokens / 1000) * costPer1k;
  }
}

module.exports = MistralProvider;
