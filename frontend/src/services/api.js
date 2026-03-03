import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

export const modelsAPI = {
  getAll: () => api.get('/models'),
  create: (data) => api.post('/models', data)
}

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard')
}

export const aiAPI = {
  process: (data) => api.post('/ai/process', data)
}

export default api