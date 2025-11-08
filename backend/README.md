# Distributed AI OS - Backend

Express.js backend API for intelligent AI model routing across multiple providers.

## 🛠️ Tech Stack

- **Node.js** with Express
- **Multiple AI SDKs**:
  - `openai` (for OpenRouter)
  - `@mistralai/mistralai` (for Mistral Codestral)
  - `@cerebras/cerebras_cloud_sdk` (for Cerebras)
  - `groq-sdk` (for Groq)
  - `cohere-ai` (for Cohere)
- **dotenv** for environment variables
- **cors** for cross-origin requests

## 📁 Project Structure

```
backend/
├── routes/
│   ├── ai.js           # AI request processing
│   ├── models.js       # Model management
│   └── analytics.js    # Analytics & metrics
├── services/
│   ├── router.js       # Intelligent routing logic
│   ├── aiProvider.js   # OpenRouter integration
│   ├── mistralProvider.js  # Mistral integration
│   ├── cerebrasProvider.js # Cerebras integration
│   ├── groqProvider.js     # Groq integration
│   ├── cohereProvider.js   # Cohere integration
│   └── genericProvider.js  # Custom provider support
├── data/
│   └── models.js       # Model configurations
├── server.js           # Express server setup
└── .env               # API keys (not in git)
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
OPENROUTER_API_KEY=your_openrouter_key
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

**Request Body (Auto Mode):**
```json
{
  "input": "Your prompt here",
  "strategy": "balanced",
  "requiredCapabilities": ["text-generation"]
}
```

**Request Body (Manual Mode):**
```json
{
  "input": "Your prompt here",
  "modelId": 3
}
```

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

### 1. Balanced (Default)
- 60% weight on speed
- 40% weight on capability quality
- Best for general use

### 2. Cost-Optimized
- Picks fastest free model
- Since all are free, optimizes for speed
- Best for high-volume requests

### 3. Performance-Optimized
- Picks model with lowest latency
- Usually selects Groq models (100-160ms)
- Best for real-time applications

### 4. Quality-Optimized
- Prioritizes thinking/reasoning capabilities
- Picks Qwen 235B Thinking for complex tasks
- Best for complex problems

## 🧠 Intelligent Features

### Intent Detection
Automatically detects required capabilities from input:
- **Logic/reasoning** → Routes to thinking models
- **Code requests** → Routes to code specialists
- **Fast queries** → Routes to Groq models

### Capability-Based Scoring
Models scored by capability quality:
- Thinking: 100 points
- Reasoning: 80 points
- Analysis: 70 points
- Code: 50 points
- Documentation: 40 points

## 🔧 AI Provider Services

### OpenRouter Provider (`aiProvider.js`)
- Connects to OpenRouter API
- Supports Gemini 2.0 Flash

### Mistral Provider (`mistralProvider.js`)
- Direct Mistral API connection
- Uses Codestral endpoint
- Optimized for code generation

### Cerebras Provider (`cerebrasProvider.js`)
- Ultra-fast inference
- Thinking and reasoning models
- High rate limits

### Groq Provider (`groqProvider.js`)
- Fastest inference (100-160ms)
- 5 different models
- Best for performance-critical tasks

### Cohere Provider (`cohereProvider.js`)
- Advanced reasoning capabilities
- Multilingual support
- Command R and Command R+ models

### Generic Provider (`genericProvider.js`)
- Supports custom OpenAI-compatible APIs
- Used as fallback for unknown providers
- REST API only (no SDK required)

## 📊 Model Configuration

Models configured in `data/models.js`:
```js
{
  id: 1,
  name: 'Compound Mini',
  provider: 'Groq',
  status: 'active',
  capabilities: ['text-generation'],
  costPer1k: 0.0,
  avgLatency: 100,
  rateLimit: { rpm: 30, rpd: 250, tpm: 70000 },
  model_id: 'groq/compound-mini',
  apiProvider: 'groq'
}
```

## 🔒 Security

- API keys stored in `.env` (not committed)
- CORS configured for frontend origin
- Input validation on all endpoints
- Error handling with appropriate status codes

## 📈 Rate Limits

All providers have rate limits:
- **Groq**: 30 RPM per model
- **Cerebras**: 10-30 RPM, up to 14,400/day
- **Mistral**: 60 RPM (generous)
- **OpenRouter**: 10 RPM (free tier)

## 🚀 Deployment

Ready for deployment to:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

Environment variables must be set on hosting platform.

## 🧪 Testing

Test the routing logic:
```bash
curl -X POST http://localhost:5000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{"input":"Hello world","strategy":"balanced"}'
```

---

Built with ❤️ for the Distributed AI OS
