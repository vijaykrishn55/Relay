const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app= express()
const PORT = process.env.PORT ||5000

app.use(cors())
app.use(express.json())

//import routes
const modelsRoutes=require('./routes/models');
const analyticsRoutes= require('./routes/analytics');
const aiRoutes= require('./routes/ai');

//use routes
app.use('/api/models', modelsRoutes);
app.use('/api/analytics',analyticsRoutes);
app.use('/api/ai/', aiRoutes)

//health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Distributed AI OS API is running!',
    version: '1.0.0',
    endpoints: [
      '/api/models',
      '/api/analytics/dashboard',
      '/api/ai/process'
    ]
  })
})

app.listen(PORT, ()=>{
        console.log(`Server is running on http://localhost:${PORT}`)
})