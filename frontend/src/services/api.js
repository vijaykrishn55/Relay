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

export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  create: () => api.post('/sessions'),
  rename: (id, title) => api.put(`/sessions/${id}`, { title }),
  delete: (id) => api.delete(`/sessions/${id}`),
  createWithContext: (contextMessages) => api.post('/sessions/with-context', { contextMessages }),
}
export const memoryAPI = {
  getAll: (query)        => api.get('/memory', { params: query ? { q: query } : {} }),
  getById: (id)          => api.get(`/memory/${id}`),
  create: (data)         => api.post('/memory', data),
  update: (id, data)     => api.put(`/memory/${id}`, data),
  delete: (id)           => api.delete(`/memory/${id}`)
}

export default api