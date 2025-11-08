# Distributed AI OS

A browser-based platform that intelligently routes AI requests across multiple providers, optimizing for cost, latency, and quality.

## 🚀 Features

- **Multi-Provider Support** - 12 AI models from 5 providers (OpenRouter, Mistral, Cerebras, Groq, Cohere)
- **Intelligent Routing** - Auto mode with 4 strategies or Manual model selection
- **Smart Capability Detection** - Automatically detects if you need code, reasoning, thinking, or analysis
- **Real-time Analytics** - Dashboard with metrics and request tracking
- **Add Custom Models** - Support for custom AI providers with OpenAI-compatible APIs

## 📊 Providers & Models

| Provider | Models | Specialization |
|----------|--------|----------------|
| **Groq** | 5 models | Ultra-fast inference (100-160ms) |
| **Cerebras** | 3 models | Thinking & reasoning tasks |
| **Cohere** | 2 models | Advanced reasoning & multilingual |
| **Mistral** | 1 model | Code generation (Codestral) |
| **OpenRouter** | 1 model | Gemini 2.0 Flash |

## 🛠️ Tech Stack

**Frontend:**
- React with Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- Lucide Icons

**Backend:**
- Node.js + Express
- Multiple AI SDKs (@mistralai, groq-sdk, cerebras, openai, cohere-ai)
- In-memory analytics

## 📁 Project Structure

```
Distributed AI OS/
├── frontend/          # React application
├── backend/           # Express API server
└── shared/            # Shared types/constants
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- API Keys from:
  - OpenRouter (https://openrouter.ai)
  - Mistral (https://console.mistral.ai)
  - Cerebras (https://cerebras.ai)
  - Groq (https://console.groq.com)
  - Cohere (https://dashboard.cohere.com)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vijaykrishn55/distributed-ai-os.git
cd distributed-ai-os
```

2. **Setup Backend**
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
OPENROUTER_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
CEREBRAS_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
```

Start backend:
```bash
npm run dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the app**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 🎯 How It Works

1. **User submits a prompt** in the Playground
2. **Router analyzes the input** for required capabilities (code, reasoning, thinking)
3. **Strategy applied** to select the best model based on:
   - **Cost-Optimized**: Picks fastest free model
   - **Performance-Optimized**: Picks lowest latency model
   - **Quality-Optimized**: Picks model with best capabilities (prioritizes thinking/reasoning)
   - **Balanced**: Optimal mix of speed and quality
4. **Request routed** to appropriate provider
5. **Response returned** with metrics (latency, tokens, model used)

## 📱 Pages

- **Dashboard** - System overview, metrics, recent requests
- **Playground** - Interactive AI testing with strategy selector or manual model selection
- **Models** - View all models, their capabilities, and add custom models

## 🔥 Key Capabilities

- **Intelligent Intent Detection** - Detects if your question needs:
  - Thinking/reasoning (routes to Qwen 235B Thinking)
  - Code generation (routes to Codestral or Qwen Coder)
  - Fast responses (routes to Groq models)
  
- **Automatic Fallback** - If a model fails, tries alternatives

- **Rate Limit Aware** - Tracks and displays per-model rate limits

## 📈 Features

- ✅ Manual model selection
- ✅ Add custom models (OpenAI-compatible APIs)
- ✅ 5 providers with 12 models
- [ ] User authentication
- [ ] Request history export
- [ ] Model comparison tool
- [ ] Streaming responses


## 👨‍💻 Author

Built by [@vijaykrishn55](https://github.com/vijaykrishn55)

---

**⭐ Star this repo if you find it useful!**
