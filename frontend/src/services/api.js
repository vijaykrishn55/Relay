import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// API endpoints
export const modelsAPI = {
  getAll: () => api.get('/models'),
  getById: (id) => api.get(`/models/${id}`),
  create:(data)=> api.post('/models',data)
}

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard')
}

export const aiAPI = {
  process: (data) => api.post('/ai/process', data)
}

export default api