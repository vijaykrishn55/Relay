# Relay — Backend

Express.js API server for AI-powered model routing across multiple providers.

## 🛠️ Tech Stack

- **Node.js** with Express 5
- **MySQL** via mysql2
- **AI SDKs**:
  - `@mistralai/mistralai` — Mistral Codestral
  - `@cerebras/cerebras_cloud_sdk` — Cerebras models
  - `groq-sdk` — Groq models (also used as meta-router)
  - `cohere-ai` — Cohere reasoning & multilingual models
- **dotenv** for environment variables
- **cors** for cross-origin requests

## 📁 Project Structure

```
backend/
├── routes/
│   ├── ai/
│   │   ├── index.js           # AI route aggregator
│   │   ├── process.js         # Standard model routing
│   │   ├── relay.js           # Relay smart routing & follow-ups
│   │   └── context.js         # Context window info
│   ├── models.js              # Model management & API key validation
│   ├── analytics.js           # Request metrics & dashboard data
│   ├── sessions.js            # Chat session lifecycle & context persistence
│   ├── memory.js              # Neural search & memory retrieval
│   └── profile.js             # User profile & system status
├── services/
│   ├── hiveOrchestrator.js    # Multi-model pipeline orchestration
│   ├── relayPipeline.js       # Relay smart routing pipeline
│   ├── relayService.js        # Relay context extraction & branching
│   ├── decomposerService.js   # Task decomposition (Hive phase 1)
│   ├── strategistService.js   # Model assignment strategy (Hive phase 2)
│   ├── executorService.js     # Parallel model execution (Hive phase 3)
│   ├── assemblerService.js    # Response synthesis (Hive phase 4)
│   ├── aiRouterService.js     # AI meta-router using Compound Mini
│   ├── scoreMatcher.js        # Score-based model matching
│   ├── router.js              # Fallback routing strategies
│   ├── persistentMemoryService.js # Session summarization & memory
│   ├── conversationMemory.js  # In-session context retrieval
│   ├── contextBuilder.js      # System context assembly
│   ├── systemPersona.js       # Adaptive persona generation
│   ├── sentimentService.js    # Sentiment analysis
│   ├── clarificationService.js # Ambiguity detection
│   ├── userPatternService.js  # User behavior pattern tracking
│   ├── modelConversation.js   # Model conversation state
│   ├── mistralProvider.js     # Mistral integration
│   ├── cerebrasProvider.js    # Cerebras integration
│   ├── groqProvider.js        # Groq integration
│   └── cohereProvider.js      # Cohere integration
├── data/
│   ├── db.js                  # MySQL connection pool
│   ├── models.js              # Model registry (11 active models)
│   ├── modelScores.js         # Capability scores for routing
│   ├── sessions.js            # Session CRUD operations
│   ├── sessionSummary.js      # Session summary persistence
│   ├── memory.js              # Memory CRUD operations
│   └── userProfile.js         # User profile persistence
├── utils/
│   ├── jsonRepair.js          # Malformed JSON recovery
│   ├── rateLimiter.js         # Per-model rate limiting
│   └── apiKeyValidator.js     # API key validation
├── config/
│   └── conversational.js      # Conversational intelligence config
├── schema.sql                 # Full database schema & seed data
├── server.js                  # Express server setup
└── .env                       # API keys & DB config
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

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=relay
```

### Setup Database

Run `schema.sql` in your MySQL client to create the database and seed models.

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
POST   /api/ai/process                # Standard model routing
POST   /api/ai/relay-smart            # Intelligent relay & context branching
POST   /api/ai/relay-followup         # Follow-up within relay context
GET    /api/ai/context-info/:sessionId # Context window usage info
```

### Sessions
```
GET    /api/sessions              # List all sessions (titles only)
GET    /api/sessions/:id          # Get session with full history
POST   /api/sessions              # Start new session
POST   /api/sessions/with-context # Branch session with existing messages
DELETE /api/sessions/:id          # Delete session
```

### Persistent Memory
```
GET    /api/memory                # Search/list persistent memories
POST   /api/memory                # Create manual memory entry
DELETE /api/memory/:id            # Delete memory entry
```

### Profile & Analytics
```
GET    /api/profile               # User profile & system status
GET    /api/analytics/dashboard   # Dashboard metrics
```

## 🎯 Routing Strategies

### AI-Powered (Default)
- Compound Mini reads the user's prompt and selects the best model from the registry.
- Returns a model ID and reasoning string.
- Falls back to score-based matching if AI routing fails.

### Hive Mind Pipeline
- Activated for complex tasks or via manual toggle.
- Coordinates multiple models across 4 phases:
  1. **Decomposer** — Breaks complex questions into subtasks.
  2. **Strategist** — Assigns the best model to each subtask.
  3. **Executor** — Runs subtasks in parallel across providers.
  4. **Assembler** — Synthesizes subtask results into a coherent response.

## 🔧 AI Providers

### Mistral (`mistralProvider.js`)
- Codestral — optimized for code generation

### Cerebras (`cerebrasProvider.js`)
- Qwen 3 235B — reasoning, analysis, multilingual
- GPT OSS 120B — reasoning, research, large documents
- Llama 3.1 8B — fast responses, quick Q&A

### Groq (`groqProvider.js`)
- Llama 4 Scout 17B — reasoning, analysis
- Llama 3.1 8B Instant — ultra-fast simple tasks
- Allam 2 7B — multilingual tasks
- Compound Mini — AI meta-router (routing only)
- Compound — balanced routing and reasoning

### Cohere (`cohereProvider.js`)
- Command A Reasoning — deep reasoning, complex analysis
- Command R Plus — multilingual, structured output

## 🔒 Security

- API keys stored in `.env` (not committed)
- CORS configured for frontend origin
- Input validation on all endpoints
- Error handling with appropriate status codes
