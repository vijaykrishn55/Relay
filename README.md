# Relay

An AI chat that automatically routes your prompt to the best available model across multiple providers — an Distributed AI OS.

https://github.com/user-attachments/assets/b1a0f26a-06af-4d0d-9df2-bd07c4ecf24b

## 🚀 Features

- **Smart Relay & Hive Mode** - Cross-model orchestration that routes prompts to specialist models or runs complex multi-model pipelines.
- **Persistent Memory** - Automatic session summarization and long-term memory retrieval for continuous learning.
- **Session Branching** - Start new chats from specific topics or points in a conversation.
- **Conversational Intelligence** - Sentiment analysis, clarification detection, and adaptive persona.
- **Multi-Provider Support** - 11 active models across Mistral, Cerebras, Cohere, and Groq.
- **Real-time Analytics** - Live dashboard with request metrics, latency tracking, and model performance.

## 📊 Providers & Models

| Provider | Models | Specialization |
|----------|--------|----------------|
| **Groq** | Llama 4 Scout 17B, Llama 3.1 8B Instant, Allam 2 7B, Compound Mini, Compound | Ultra-fast inference |
| **Cerebras** | Qwen 3 235B, GPT OSS 120B, Llama 3.1 8B | Fast reasoning & general tasks |
| **Mistral** | Codestral | Code generation |
| **Cohere** | Command A Reasoning, Command R Plus | Deep reasoning & multilingual |

## 🛠️ Tech Stack

**Frontend:**
- React 19 with Vite
- Tailwind CSS 4
- React Router 7
- Recharts, Mermaid, React Markdown

**Backend:**
- Node.js with Express 5
- MySQL (mysql2)
- AI SDKs: `@mistralai/mistralai`, `groq-sdk`, `@cerebras/cerebras_cloud_sdk`, `cohere-ai`

## 📁 Project Structure

```
relay/
├── frontend/          # React application (Vite)
└── backend/           # Express API server (Node.js)
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL
- API Keys from:
  - Mistral (https://console.mistral.ai)
  - Cerebras (https://cerebras.ai)
  - Groq (https://console.groq.com)
  - Cohere (https://dashboard.cohere.com)

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
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=relay
```

Run `schema.sql` in your MySQL client to set up the database.

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
2. **Triage** scores the question's complexity across reasoning, code, creativity, and other dimensions.
3. **Simple queries** go through AI-powered routing — Compound Mini selects the best specialist model.
4. **Complex queries** activate the Hive pipeline — Decomposer breaks the task, Strategist assigns models, Specialists execute, and Assembler synthesizes the final response.
5. **Persistent Memory** automatically captures key insights and summarizes sessions for long-term context.
6. **Analytics updated** — every request is tracked in real-time on the Dashboard.

## 📱 Pages

- **Dashboard** — System overview, request count, active models, recent request log.
- **Chat** — AI-powered routing with Hive orchestration, follow-ups, and session branching.
- **Memory** — Persistent memories, session summaries, and user profile insights.
- **Models** — View and manage registered models, capabilities, and provider status.

## 🔥 Key Capabilities

- **AI Meta-Router** — Compound Mini reasons about the prompt and picks the right specialist model.
- **Hive Mind** — Multi-model pipeline (Decomposer → Strategist → Specialists → Assembler) for complex tasks.
- **Capability Detection** — Code requests → Codestral, fast queries → Groq, reasoning → Cerebras/Cohere.
- **Conversational Intelligence** — Sentiment tracking, clarification detection, adaptive persona.

## 👨‍💻 Author

Built by [@vijaykrishn55](https://github.com/vijaykrishn55)
---

**⭐ Star this repo if you find it useful!**
