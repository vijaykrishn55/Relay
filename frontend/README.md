# Relay — Frontend

React-based chat interface for AI-powered model routing.

## 🚀 Features

- **Chat** — chat interface with message history, typing indicator, and auto-scroll
- **Dashboard** — Real-time request metrics, active model count, recent request log
- **Models** — View all registered models, capabilities, provider, and API key status
- **Fixed Sidebar** — Persistent navigation with Dashboard, Chat, and Models

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
│   ├── Layout.jsx          # Fixed sidebar + main content shell
│   ├── AddModel.jsx        # Add new model modal
│   ├── ModelCard.jsx       # Model display card
│   ├── MetricCard.jsx      # Dashboard metric tile
│   ├── RequestsTable.jsx   # Recent requests table
│   └── LoadingSpinner.jsx  # Loading state component
├── pages/
│   ├── Dashboard.jsx       # Analytics dashboard
│   ├── chat.jsx            # ChatGPT-style AI chat
│   └── Models.jsx          # Model registry
├── services/
│   └── api.js              # Axios API client
└── App.jsx                 # Root router
```

## 🔗 Backend Connection

Connects to backend API at `http://localhost:5000`
