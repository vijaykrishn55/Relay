const express = require('express')
const router = express.Router()
const { loadModels } = require('../data/models')
const { query } = require('../data/db')

router.get('/dashboard', async (req, res) => {
  try {
    const models = await loadModels()

    const [countRow] = await query('SELECT COUNT(*) AS total FROM request_history')
    const [avgRow] = await query('SELECT AVG(latency) AS avgLat FROM request_history')
    const recentRows = await query(
      'SELECT model, latency, cost, timestamp FROM request_history ORDER BY id DESC LIMIT 5'
    )

    res.json({
      metrics: {
        totalRequests: countRow.total || 0,
        avgCost: 0.0,
        avgLatency: Math.round(avgRow.avgLat || 0),
        activeModels: models.filter(m => m.status === 'active').length
      },
      recentRequests: recentRows.map(r => ({
        time: new Date(Number(r.timestamp)).toLocaleTimeString(),
        model: r.model,
        latency: r.latency,
        cost: r.cost,
        status: 'success'
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/track', async (req, res) => {
  try {
    const { model, latency, cost } = req.body
    await query(
      'INSERT INTO request_history (model, latency, cost, timestamp) VALUES (?, ?, ?, ?)',
      [model, latency, cost || 0, Date.now()]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router