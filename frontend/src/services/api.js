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
  process: (data) => api.post('/ai/process', data),
  getContextInfo: (sessionId, modelId) => api.get(`/ai/context-info/${sessionId}`, { params: { modelId } })
}

export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  create: () => api.post('/sessions'),
  rename: (id, title) => api.put(`/sessions/${id}`, { title }),
  delete: (id) => api.delete(`/sessions/${id}`),
  createWithContext: (contextMessages, parentSessionId = null, topic = null) =>
    api.post('/sessions/with-context', { contextMessages, parentSessionId, topic }),
  touch: (id) => api.post(`/sessions/${id}/touch`),
}

export const memoryAPI = {
  getAll: (query)        => api.get('/memory', { params: query ? { q: query } : {} }),
  getById: (id)          => api.get(`/memory/${id}`),
  create: (data)         => api.post('/memory', data),
  update: (id, data)     => api.put(`/memory/${id}`, data),
  delete: (id)           => api.delete(`/memory/${id}`)
}

// Persistent Memory API
export const profileAPI = {
  // User profile endpoints
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  clear: () => api.delete('/profile'),

  // Session summaries endpoints
  getSummaries: () => api.get('/profile/summaries'),
  getSummary: (sessionId) => api.get(`/profile/summaries/${sessionId}`),
  generateSummary: (sessionId) => api.post(`/profile/summaries/${sessionId}`)
}

//  Relay API
export const relayAPI = {
  followUp: (data) => api.post('/ai/relay-followup', data),
  smart: (data) => api.post('/ai/relay-smart', data),
  getTopics: (sessionId) => api.post('/ai/relay-topics', { sessionId }),
  getTopicsManual: (sessionId, description) => api.post('/ai/relay-topics-manual', { sessionId, description }),
}

export default api