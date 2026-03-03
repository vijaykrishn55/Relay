const express = require('express')
const router = express.Router()
const models = require('../data/models')

let requestHistory = []

const getDashboardData = () => {
  return {
    metrics: {
      totalRequests: requestHistory.length || 0,
      avgCost: 0.0,
      avgLatency: requestHistory.length > 0
        ? Math.round(requestHistory.reduce((sum, r) => sum + r.latency, 0) / requestHistory.length)
        : 0,
      activeModels: models.filter(m => m.status === 'active').length
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

router.get('/dashboard', (req, res) => {
  res.json(getDashboardData())
})

router.post('/track', (req, res) => {
  const { model, latency, cost } = req.body
  requestHistory.push({
    model,
    latency,
    cost,
    timestamp: Date.now()
  })
  
  if (requestHistory.length > 100) {
    requestHistory = requestHistory.slice(-100)
  }
  
  res.json({ success: true })
})

module.exports = router