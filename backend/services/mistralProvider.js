const { Mistral } = require("@mistralai/mistralai");

class MistralProvider {
  constructor() {
    this.client = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  async callModel(model, input) {
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
      const endpoint =isCodestral
        ? "https://codestral.mistral.ai/v1/chat/completions"
        : "https://api.mistral.ai/v1/chat/completions";
      
      console.log(`📡 Calling Mistral model: ${mistralModel}`);
      console.log(`🌐 Endpoint: ${endpoint}`);
      console.log(`📝 Input: ${input.substring(0, 50)}...`);
      let chatResponse;

      if (isCodestral) {
        // Create a new client instance with Codestral endpoint
        const codestralClient = new Mistral({
          apiKey: process.env.MISTRAL_API_KEY,
          serverURL: "https://codestral.mistral.ai",
        });

        chatResponse = await codestralClient.chat.complete({
          model: mistralModel,
          messages: [
            {
              role: "user",
              content: input,
            },
          ],
        });
      } else {
        // Use regular Mistral API
        chatResponse = await this.client.chat.complete({
          model: mistralModel,
          messages: [
            {
              role: "user",
              content: input,
            },
          ],
        });
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      const output = chatResponse.choices[0].message.content;
      const tokensUsed = chatResponse.usage.total_tokens;
      const cost = this.calculateCost(tokensUsed, model.costPer1k);

      console.log(`✅ Success with Mistral ${mistralModel}`);

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
