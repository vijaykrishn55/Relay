# Relay — Frontend

React-based chat interface for AI-powered model routing.

## 🚀 Features

- **Chat** — Dynamic interface with multi-model routing, message follow-ups, and session branching.
- **Selection Mode** — Tap messages to save to persistent memory or create new context-aware sessions.
- **Memory Dashboard** — Neural search interface for long-term insights and summarized conversation data.
- **Dashboard** — Real-time performance metrics, model utilization, and latency tracking.
- **Models** — Comprehensive registry of 11+ models across multiple providers with status monitoring.
- **Sidebar Navigation** — Persistent access to Dashboard, Chat, Memory, and Model settings.

## 🛠️ Tech Stack

- **React 19** — UI library
- **Vite** — Fast build tool
- **React Router** — Client-side routing
- **Tailwind CSS** — Styling
- **Axios** — API requests
- **Lucide React** — Icons

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
├── components/
│   ├── Layout.jsx          # Sidebar + main content shell
│   ├── MessageBubble.jsx   # Interactive message with action buttons
│   ├── RelayChip.jsx       # Relay context indicator
│   ├── RelayTopicPicker.jsx # Session branching topic detector
│   ├── ContextMeter.jsx    # Model context window visualization
│   ├── MetricCard.jsx      # Dashboard metric tile
│   └── LoadingSpinner.jsx  # AI pipeline progress indicator
├── pages/
│   ├── Dashboard.jsx       # Analytics dashboard
│   ├── Chat.jsx            # Multi-model intelligent chat
│   ├── Memory.jsx          # Persistent memory search
│   └── Models.jsx          # Model registry
├── services/
│   └── api.js              # Axios API client
└── App.jsx                 # Root router
```

## 🔗 Backend Connection

Connects to backend API at `http://localhost:5000`
