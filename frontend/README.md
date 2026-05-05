# Relay — Frontend

React-based chat interface for AI-powered model routing.

## 🚀 Features

- **Chat** — Multi-model chat with AI routing, Hive orchestration trace, and Mermaid diagram rendering.
- **Selection Mode** — Tap messages to save to persistent memory or branch into new sessions.
- **Memory** — Persistent memories, session summaries, and user profile insights across three tabs.
- **Dashboard** — Real-time performance metrics, model utilization, and latency tracking.
- **Models** — Registry of 11 models across 4 providers with status monitoring and custom model support.

## 🛠️ Tech Stack

- **React 19** — UI library
- **Vite 7** — Build tool
- **React Router 7** — Client-side routing
- **Tailwind CSS 4** — Styling
- **Axios** — API requests
- **Lucide React** — Icons
- **Recharts** — Dashboard charts
- **React Markdown** + rehype-highlight + remark-gfm — Markdown rendering
- **Mermaid** — Diagram rendering
- **highlight.js** — Code syntax highlighting

## 📦 Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`

Production build:
```bash
npm run build
```

## 📁 Structure

```
src/
├── pages/
│   ├── dashboard/             # Analytics dashboard
│   ├── chat/                  # Multi-model intelligent chat
│   │   ├── components/        # Chat-specific components
│   │   └── hooks/             # Chat-specific hooks
│   ├── memory/                # Persistent memory & summaries
│   └── models/                # Model registry & management
│       ├── components/        # Model-specific components
│       └── hooks/             # Model-specific hooks
├── components/
│   ├── chat/
│   │   └── message-bubble/    # Message rendering subsystem
│   │       ├── AssistantMessage.jsx
│   │       ├── UserMessage.jsx
│   │       ├── CodeBlock.jsx
│   │       ├── MermaidDiagram.jsx
│   │       └── OrchestrationTrace.jsx
│   ├── memory/                # Memory tab components
│   │   ├── SavedTab.jsx
│   │   ├── SummariesTab.jsx
│   │   ├── ProfileTab.jsx
│   │   └── MemoryStats.jsx
│   ├── Layout.jsx             # Sidebar + main content shell
│   ├── ModelDropdown.jsx      # Glassmorphic model selector
│   ├── SessionList.jsx        # Chat session sidebar
│   ├── VirtualizedMessages.jsx # Virtualized message list
│   ├── ContextMeter.jsx       # Context window usage (server-side estimation)
│   ├── AddModel.jsx           # Custom model registration
│   ├── RelayChip.jsx          # Relay context indicator
│   └── LoadingSpinner.jsx     # AI pipeline progress
├── context/
│   ├── ChatContext.jsx        # Chat state management
│   └── PretextContext.jsx     # Pretext integration
├── hooks/
│   ├── useSessions.js         # Session lifecycle
│   ├── usePretext.js          # Pretext hook
│   ├── usePretextMessages.js  # Message pretext handling
│   ├── useStreamingPretext.js # Streaming pretext
│   └── useShrinkwrap.js       # Layout shrinkwrap
├── services/
│   └── api.js                 # Axios API client
├── utils/
│   └── formatTime.js          # Time formatting
├── index.css                  # Global styles
├── App.jsx                    # Root router
└── main.jsx                   # Entry point
```

## 🔗 Backend Connection

Connects to backend API at `http://localhost:5000`
