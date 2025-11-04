# Distributed AI OS - Frontend

React-based frontend for the Distributed AI Operating System.

## �️ Tech Stack

- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **Recharts** for analytics (future)

## � Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.jsx
│   │   ├── MetricCard.jsx
│   │   ├── ModelCard.jsx
│   │   ├── RequestsTable.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/           # Full page components
│   │   ├── Dashboard.jsx
│   │   ├── Playground.jsx
│   │   └── Models.jsx
│   ├── services/        # API integration
│   │   └── api.js
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
└── public/              # Static assets
```

## � Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Access at: http://localhost:5173

### Build for Production
```bash
npm run build
```

## � Pages

### Dashboard (`/`)
- System metrics overview
- Recent requests table
- Real-time analytics

### Playground (`/playground`)
- Interactive AI testing
- Strategy selector (4 routing strategies)
- Input/Output interface
- Real-time metrics display

### Models (`/models`)
- View all 10 AI models
- Search and filter models
- Model capabilities and rate limits
- Provider information

## 🔌 API Integration

All API calls go through `src/services/api.js`:

```js
// Get all models
modelsAPI.getAll()

// Get dashboard data
analyticsAPI.getDashboard()

// Process AI request
aiAPI.process({ input, strategy, requiredCapabilities })
```

Backend API base URL: `http://localhost:5000/api`

## 🎨 Styling

Uses Tailwind CSS utility classes:

```jsx
<div className="p-8 bg-white rounded-lg shadow">
  <h1 className="text-3xl font-bold text-gray-800">Title</h1>
</div>
```

## 🧩 Key Components

### MetricCard
Displays key metrics with icons and trends
```jsx
<MetricCard 
  title="Total Requests"
  value={1247}
  icon={Activity}
  trend="up"
  trendValue="12%"
/>
```

### ModelCard
Shows individual model information
```jsx
<ModelCard model={modelData} />
```

### Layout
Provides sidebar navigation and page wrapper
```jsx
<Layout>
  <YourPageContent />
</Layout>
```

## 📱 Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Tailwind breakpoints (sm, md, lg, xl)

## 🚀 Deployment

Ready for deployment 

Build command: `npm run build`
Output directory: `dist/`

---

Built with ❤️ for the Distributed AI OS
