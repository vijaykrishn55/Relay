# Distributed AI OS - Frontend

React-based interface for intelligent AI model routing across multiple providers.

## 🚀 Features

- **Dashboard** - Real-time metrics and request monitoring
- **Playground** - Interactive AI testing with auto/manual mode
- **Models** - View and add AI models
- **Responsive Design** - Clean, modern UI with Tailwind CSS

## 🛠️ Tech Stack

- **React** - UI library
- **Vite** - Fast build tool
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - API requests
- **Recharts** - Data visualization
- **Lucide React** - Icons

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
│   ├── AddModel.jsx        # Add new model modal
│   ├── ModelDropdown.jsx   # Model selector
│   ├── ModelCard.jsx       # Model display card
│   └── ...
├── pages/
│   ├── Dashboard.jsx       # Analytics dashboard
│   ├── Playground.jsx      # AI testing interface
│   └── Models.jsx          # Model management
├── services/
│   └── api.js              # API calls
└── App.jsx
```

## 🔗 Backend Connection

Connects to backend API at `http://localhost:5000`
