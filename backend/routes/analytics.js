const express = require('express')
const router = express.Router()

// In-memory request tracking (in production, use a database)
let requestHistory = []

const getDashboardData = () => {
  return {
    metrics: {
      totalRequests: requestHistory.length || 1247,
      avgCost: 0.0,  // All free!
      avgLatency: requestHistory.length > 0 
        ? Math.round(requestHistory.reduce((sum, r) => sum + r.latency, 0) / requestHistory.length)
        : 342,
      activeModels: 10  // Updated to 10!
    },
    recentRequests: requestHistory.slice(-5).reverse().map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString(),
      model: r.model,
      latency: r.latency,
      cost: r.cost,
      status: 'success'
    }))
  }
}

// GET dashboard analytics 
router.get('/dashboard', (req, res) => {
  res.json(getDashboardData())
})

// POST - Track new request (called from AI route)
router.post('/track', (req, res) => {
  const { model, latency, cost } = req.body
  requestHistory.push({
    model,
    latency,
    cost,
    timestamp: Date.now()
  })
  
  // Keep only last 100 requests
  if (requestHistory.length > 100) {
    requestHistory = requestHistory.slice(-100)
  }
  
  res.json({ success: true })
})

module.exports = router