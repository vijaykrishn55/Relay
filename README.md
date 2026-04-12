# Relay

An AI chat that automatically routes your prompt to the best available model across multiple providers — aiming to become a Distributed AI OS.


## 🚀 Features

- **Smart Relay & Hive Mode** - Cross-model orchestration that routes prompts to specialist models or runs complex multi-model pipelines.
- **Persistent Memory** - Automatic session summarization and long-term memory retrieval for continuous learning.
- **Session Branching** - Effortlessly start new chats from specific topics or points in a conversation.
- **Multi-Provider Support** - 11 active models across Mistral, Cerebras, Cohere, and Groq.
- **Real-time Analytics** - Live dashboard with request metrics, latency tracking, and model performance.
- **Modern Chat UI** - Premium chat interface with message selection, memory integration, and responsive design.

## 📊 Providers & Models

| Provider | Models | Specialization |
|----------|--------|----------------|
| **Groq** | Llama 4 Scout 17B, Llama 3.1 8B Instant, Allam 2 7B, Compound Mini, Compound | Ultra-fast inference |
| **Cerebras** | Z.AI GLM 4.7, OpenAI GPT OSS 120B, Llama 3.1 8B | Fast reasoning & general tasks |
| **Mistral** | Codestral | Code generation |
| **Cohere** | Command R+, Command R | Reserved for future use |

## 🛠️ Tech Stack

**Frontend:**
- React 19 with Vite
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

**Backend:**
- Node.js + Express
- AI SDKs: `@mistralai/mistralai`, `groq-sdk`, `@cerebras/cerebras_cloud_sdk`, `cohere-ai`
- In-memory analytics and session tracking

## 📁 Project Structure

```
relay/
├── frontend/          # React application (Vite)
└── backend/           # Express API server (Node.js)
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- API Keys from:
  - Mistral (https://console.mistral.ai)
  - Cerebras (https://cerebras.ai)
  - Groq (https://console.groq.com)
  - Cohere (https://dashboard.cohere.com) — optional, reserved for future models

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vijaykrishn55/Relay
cd Relay
```

2. **Setup Backend**
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
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

1. **User sends a message** in the Chat.
2. **Relay Engine** (powered by Compound Mini) analyzes the intent and selects the optimal model or pipeline.
3. **Request routed** to the selected provider (Groq, Cerebras, Mistral, or Cohere).
4. **Persistent Memory** automatically captures key insights and summarizes previous sessions for long-term context.
5. **Analytics updated** — every request is tracked in real-time on the Dashboard.

If AI-powered routing fails, it falls back to a balanced strategy based on latency and capability scores.

## 📱 Pages

- **Dashboard** — System overview, request count, active models, recent request log.
- **Chat** — Clean Chat Interface with AI-powered routing, follow-ups, and session branching.
- **Memory** — Neural search through persistent memories and summarized insights.
- **Models** — View and manage registered models, capabilities, and provider status.

## 🔥 Key Capabilities

- **AI Meta-Router** — Compound Mini reasons about the prompt and picks the right specialist model

- **Capability Detection** — Code requests → Codestral, fast queries → Groq, reasoning → Cerebras

## 👨‍💻 Author

Built by [@vijaykrishn55](https://github.com/vijaykrishn55)
---

**⭐ Star this repo if you find it useful!**
