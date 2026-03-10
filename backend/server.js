const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app= express()
const PORT = process.env.PORT ||5000

app.use(cors())
app.use(express.json())

const modelsRoutes = require('./routes/models')
const analyticsRoutes = require('./routes/analytics')
const aiRoutes = require('./routes/ai')
const sessionsRoutes = require('.//routes/sessions')

app.use('/api/models', modelsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/sessions', sessionsRoutes)

app.get('/', (req, res) => {
  res.json({ 
    message: 'Relay API is running!',
    version: '1.0.0',
    endpoints: [
      '/api/models',
      '/api/analytics/dashboard',
      '/api/ai/process',
      '/api/sessions'
    ]
  })
})

app.listen(PORT, ()=>{
        console.log(`Server is running on http://localhost:${PORT}`)
})