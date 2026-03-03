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
│   ├── ai.js               # AI request processing
│   ├── models.js           # Model management & API key validation
│   └── analytics.js        # Request metrics & dashboard data
├── services/
│   ├── router.js           # Routing logic (ai-powered + fallback strategies)
│   ├── aiRouterService.js  # AI meta-router using Compound Mini
│   ├── mistralProvider.js  # Mistral integration
│   ├── cerebrasProvider.js # Cerebras integration
│   ├── groqProvider.js     # Groq integration
│   └── cohereProvider.js   # Cohere integration (future)
├── data/
│   └── models.js           # Model registry (9 active + 2 Cohere)
├── server.js               # Express server setup
└── .env                    # API keys (not in git)
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

### Models
```
GET    /api/models           # Get all models
GET    /api/models/:id       # Get model by ID
POST   /api/models           # Add new model
```

### AI Processing
```
POST   /api/ai/process       # Process AI request
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
- Compound Mini reads the user's prompt and selects the best model from the registry
- Returns a model ID and reasoning string
- Falls back to `balanced` if AI routing fails

### Balanced
- 60% weight on speed (avgLatency), 40% on capability quality score
- Good general-purpose fallback

### Performance
- Picks lowest latency model — usually Groq models (~100ms)

### Quality
- Prioritizes capability score: reasoning > analysis > code > text-generation

### Cost
- Fastest model (all models are currently free-tier)

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
  id: 9,
  name: 'Compound Mini',
  provider: 'Groq',
  status: 'active',
  capabilities: ['text-generation', 'reasoning'],
  costPer1k: 0.0,
  avgLatency: 100,
  rateLimit: { rpm: 30, rpd: 14400, tpm: 70000 },
  model_id: 'compound-beta-mini',
  apiProvider: 'groq'
}
```

## 🔒 Security

- API keys stored in `.env` (not committed)
- CORS configured for frontend origin
- Input validation on all endpoints
- Error handling with appropriate status codes

## 📈 Rate Limits

- **Groq**: 30 RPM per model
- **Cerebras**: 10-30 RPM, up to 14,400/day
- **Mistral**: 60 RPM

## 🚀 Deployment

Ready for deployment to:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

Environment variables must be set on hosting platform.

