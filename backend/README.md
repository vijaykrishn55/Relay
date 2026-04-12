# Relay — Backend

Express.js backend API for AI-powered model routing across multiple providers.

## 🛠️ Tech Stack

- **Node.js** with Express
- **AI SDKs**:
  - `@mistralai/mistralai` — Mistral Codestral
  - `@cerebras/cerebras_cloud_sdk` — Cerebras models
  - `groq-sdk` — Groq models (also used as meta-router)
  - `cohere-ai` — Cohere models (reserved for future use)
- **dotenv** for environment variables
- **cors** for cross-origin requests

## 📁 Project Structure

```
backend/
├── routes/
│   ├── ai.js               # AI request processing & Hive Orchestrator
│   ├── models.js           # Model management & API key validation
│   ├── analytics.js        # Request metrics & dashboard data
│   ├── sessions.js         # Chat session lifecycle & context persistence
│   ├── memory.js           # Neural search & memory retrieval
│   └── profile.js          # System configuration & health
├── services/
│   ├── hiveOrchestrator.js # Multi-model pipeline orchestration
│   ├── persistentMemoryService.js # Continuous learning & summarization
│   ├── router.js           # Routing logic (ai-powered + fallback strategies)
│   ├── aiRouterService.js  # AI meta-router using Compound Mini
│   ├── mistralProvider.js  # Mistral integration
│   ├── cerebrasProvider.js # Cerebras integration
│   ├── groqProvider.js     # Groq integration
│   └── cohereProvider.js   # Cohere integration (future)
├── data/
│   └── models.js           # Model registry (9 active + 2 Cohere)
├── server.js               # Express server setup
└── .env                    # API keys 
```

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Setup Environment Variables

Create `.env` file:
```env
PORT=5000

# API Keys
MISTRAL_API_KEY=your_mistral_key
CEREBRAS_API_KEY=your_cerebras_key
GROQ_API_KEY=your_groq_key
COHERE_API_KEY=your_cohere_key
```

### Run Development Server
```bash
npm run dev
```

Server runs on: http://localhost:5000

### Run Production Server
```bash
npm start
```

## 🔌 API Endpoints

### AI Processing
```
POST   /api/ai/process       # Standard model routing
POST   /api/relay/smart      # Intelligent relay & context branching
```

### Sessions
```
GET    /api/sessions         # List all sessions (titles only)
GET    /api/sessions/:id     # Get session with full history
POST   /api/sessions         # Start new session
POST   /api/sessions/with-context # Branch session with existing messages
DELETE /api/sessions/:id     # Delete session
```

### Persistent Memory
```
GET    /api/memory           # Search/list persistent memories
POST   /api/memory           # Create manual memory entry
DELETE /api/memory/:id       # Delete memory entry
```

### Profile & System
```
GET    /api/profile          # System status & session counts
```

**Request Body:**
```json
{
  "input": "Your prompt here",
  "strategy": "ai-powered",
  "requiredCapabilities": ["text-generation"]
}
```

`strategy` is optional — defaults to `ai-powered`. Other values: `balanced`, `cost`, `performance`, `quality`.

**Response:**
```json
{
  "success": true,
  "output": "AI response",
  "model": "Compound Mini",
  "provider": "Groq",
  "decision": {
    "model": "Compound Mini",
    "reason": "Selected for fastest response time (100ms)"
  },
  "metrics": {
    "latency": 120,
    "cost": "0.0000",
    "tokensUsed": 156
  }
}
```

### Analytics
```
GET    /api/analytics/dashboard    # Get dashboard metrics
```

## 🎯 Routing Strategies

### AI-Powered (Default)
- Compound Mini reads the user's prompt and selects the best model from the registry.
- Returns a model ID and reasoning string.
- Falls back to `balanced` if AI routing fails.

### Hive Orchestra
- Activated for complex tasks or via manual toggle.
- Coordinates multiple models (Decomposer, Strategist, Specialist, Assembler) to provide deeper reasoning.

## 🔧 AI Provider Services

### Mistral Provider (`mistralProvider.js`)
- Codestral endpoint
- Optimized for code generation

### Cerebras Provider (`cerebrasProvider.js`)
- Models: Z.AI GLM 4.7, OpenAI GPT OSS 120B, Llama 3.1 8B
- Fast inference, good for general reasoning

### Groq Provider (`groqProvider.js`)
- Models: Llama 4 Scout 17B, Llama 3.1 8B Instant, Allam 2 7B, Compound Mini, Compound
- Lowest latency (~100-160ms)
- Compound Mini is used as the AI meta-router

### Cohere Provider (`cohereProvider.js`)
- Command R+ and Command R
- Kept in registry for future activation

## 📊 Model Registry

11 active models in `data/models.js`. Each entry:
```js
{
  id: 2,
  name: 'Codestral',
  provider: 'Mistral',
  status: 'active',
  capabilities: ['text-generation', 'code', 'reasoning', 'documentation'],
  costPer1k: 0.0,
  avgLatency: 250,
  rateLimit: { rpm: 60, tpm: 100000 },
  contextWindow: 128000,
  maxOutputTokens: 128000,
  endpoint: 'https://codestral.mistral.ai',
  model_id: 'codestral-latest',
  apiProvider: 'mistral',
  scores: { reasoning: 0.7, code: 0.95, creativity: 0.4, speed: 0.6, multilingual: 0.5, analysis: 0.6, instruction: 0.8, knowledge: 0.6 },
  roles: ['specialist']
}
```

## 🔒 Security

- API keys stored in `.env` (not committed)
- CORS configured for frontend origin
- Input validation on all endpoints
- Error handling with appropriate status codes
