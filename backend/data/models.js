const { query } = require('./db')

// Static fallback — used only if DB fetch fails on startup
const staticModels = [
  // Mistral
  {
    id: 2,
    name: 'Codestral',
    provider: 'Mistral',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'documentation'],
    costPer1k: 0.0,
    avgLatency: 250,
    rateLimit: { rpm: 60, tpm: 100000 },
    contextWindow: 128000,
    maxOutputTokens: 128000,
    endpoint: 'https://codestral.mistral.ai',
    model_id: 'codestral-latest',
    apiProvider: 'mistral',
    scores: { reasoning: 0.7, code: 0.95, creativity: 0.4, speed: 0.6, multilingual: 0.5, analysis: 0.6, instruction: 0.8, knowledge: 0.6 },
    roles: ['specialist']
  },
  
  // Cerebras
  {
    id: 3,
    name: 'Qwen 3 32B',
    provider: 'Cerebras',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning'],
    costPer1k: 0.0,
    avgLatency: 180,
    // Free tier severely reduced: RPM 10, RPD only 100
    rateLimit: { rpm: 10, tpm: 60000, rpd: 100 },
    contextWindow: 128000,
    maxOutputTokens: 128000,
    endpoint: 'https://api.cerebras.ai',
    model_id: 'qwen-3-32b',
    apiProvider: 'cerebras',
    scores: { reasoning: 0.75, code: 0.85, creativity: 0.5, speed: 0.7, multilingual: 0.4, analysis: 0.7, instruction: 0.7, knowledge: 0.65 },
    roles: ['specialist']
  },
  {
    id: 4,
    name: 'Llama 3.3 70B',
    provider: 'Cerebras',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'analysis'],
    costPer1k: 0.0,
    avgLatency: 200,
    rateLimit: { rpm: 30, tpm: 64000, rpd: 14400 },
    contextWindow: 128000,
    maxOutputTokens: 65536,
    endpoint: 'https://api.cerebras.ai',
    model_id: 'llama-3.3-70b',
    apiProvider: 'cerebras',
    scores: { reasoning: 0.8, code: 0.8, creativity: 0.65, speed: 0.65, multilingual: 0.6, analysis: 0.8, instruction: 0.75, knowledge: 0.8 },
    roles: ['specialist', 'assembler']
  },
  {
    id: 5,
    name: 'Llama 3.1 8B',
    provider: 'Cerebras',
    status: 'active',
    capabilities: ['text-generation', 'code'],
    costPer1k: 0.0,
    avgLatency: 150,
    rateLimit: { rpm: 30, tpm: 60000, rpd: 14400 },
    contextWindow: 128000,
    maxOutputTokens: 128000,
    endpoint: 'https://api.cerebras.ai',
    model_id: 'llama3.1-8b',
    apiProvider: 'cerebras',
    scores: { reasoning: 0.5, code: 0.6, creativity: 0.5, speed: 0.9, multilingual: 0.3, analysis: 0.45, instruction: 0.6, knowledge: 0.5 },
    roles: ['decomposer', 'strategist']
  },
  
  // Groq
  {
    id: 6,
    name: 'Allam 2 7B',
    provider: 'Groq',
    status: 'active',
    capabilities: ['text-generation', 'multilingual'],
    costPer1k: 0.0,
    avgLatency: 150,
    rateLimit: { rpm: 30, rpd: 7000, tpm: 6000, tpd: 500000 },
    contextWindow: 4096,
    maxOutputTokens: 4096,
    endpoint: 'https://api.groq.com',
    model_id: 'allam-2-7b',
    apiProvider: 'groq',
    scores: { reasoning: 0.4, code: 0.2, creativity: 0.5, speed: 0.7, multilingual: 0.9, analysis: 0.3, instruction: 0.5, knowledge: 0.4 },
    roles: ['specialist']
  },
  {
    id: 7,
    name: 'Llama 3.1 8B Instant',
    provider: 'Groq',
    status: 'active',
    capabilities: ['text-generation', 'code'],
    costPer1k: 0.0,
    avgLatency: 120,
    rateLimit: { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
    contextWindow: 131072,
    maxOutputTokens: 131072,
    endpoint: 'https://api.groq.com',
    model_id: 'llama-3.1-8b-instant',
    apiProvider: 'groq',
    scores: { reasoning: 0.45, code: 0.55, creativity: 0.45, speed: 0.95, multilingual: 0.3, analysis: 0.4, instruction: 0.6, knowledge: 0.45 },
    roles: ['decomposer', 'strategist']
  },
  {
    id: 8,
    name: 'Llama 4 Scout 17B',
    provider: 'Groq',
    status: 'active',
    capabilities: ['text-generation', 'reasoning', 'analysis'],
    costPer1k: 0.0,
    avgLatency: 160,
    rateLimit: { rpm: 30, rpd: 1000, tpm: 30000, tpd: 500000 },
    contextWindow: 131072,
    maxOutputTokens: 8192,
    endpoint: 'https://api.groq.com',
    model_id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    apiProvider: 'groq',
    scores: { reasoning: 0.85, code: 0.6, creativity: 0.7, speed: 0.7, multilingual: 0.5, analysis: 0.8, instruction: 0.75, knowledge: 0.75 },
    roles: ['specialist', 'assembler', 'strategist']
  },
  {
    id: 9,
    name: 'Compound Mini',
    provider: 'Groq',
    status: 'active',
    capabilities: ['text-generation'],
    costPer1k: 0.0,
    avgLatency: 100,
    rateLimit: { rpm: 30, rpd: 250, tpm: 70000 },
    contextWindow: 131072,
    maxOutputTokens: 8192,
    endpoint: 'https://api.groq.com',
    model_id: 'groq/compound-mini',
    apiProvider: 'groq',
    scores: { reasoning: 0.4, code: 0.3, creativity: 0.3, speed: 0.9, multilingual: 0.2, analysis: 0.35, instruction: 0.8, knowledge: 0.5 },
    roles: ['decomposer']
  },
  {
    id: 10,
    name: 'Compound',
    provider: 'Groq',
    status: 'active',
    capabilities: ['text-generation', 'reasoning'],
    costPer1k: 0.0,
    avgLatency: 140,
    rateLimit: { rpm: 30, rpd: 250, tpm: 70000 },
    contextWindow: 131072,
    maxOutputTokens: 8192,
    endpoint: 'https://api.groq.com',
    model_id: 'groq/compound',
    apiProvider: 'groq',
    scores: { reasoning: 0.6, code: 0.4, creativity: 0.4, speed: 0.8, multilingual: 0.3, analysis: 0.55, instruction: 0.75, knowledge: 0.6 },
    roles: ['decomposer', 'strategist']
  },
  
  // Cohere Models
  {
    id: 11,
    name: 'Command A Reasoning',
    provider: 'Cohere',
    status: 'active',
    capabilities: ['text-generation', 'reasoning', 'analysis'],
    costPer1k: 0.0,
    avgLatency: 300,
    rateLimit: { rpm: 20, tpm: 40000 },
    contextWindow: 256000,
    maxOutputTokens: 32000,
    endpoint: 'https://api.cohere.ai',
    model_id: 'command-a-reasoning-08-2025',
    apiProvider: 'cohere',
    scores: { reasoning: 0.95, code: 0.65, creativity: 0.6, speed: 0.3, multilingual: 0.7, analysis: 0.9, instruction: 0.8, knowledge: 0.85 },
    roles: ['specialist', 'assembler']
  },
  {
    id: 12,
    name: 'Command R Plus',
    provider: 'Cohere',
    status: 'active',
    capabilities: ['text-generation', 'reasoning', 'multilingual'],
    costPer1k: 0.0,
    avgLatency: 280,
    rateLimit: { rpm: 20, tpm: 40000 },
    contextWindow: 128000,
    maxOutputTokens: 4000,
    endpoint: 'https://api.cohere.ai',
    model_id: 'command-r-plus-08-2024',
    apiProvider: 'cohere',
    scores: { reasoning: 0.7, code: 0.45, creativity: 0.6, speed: 0.35, multilingual: 0.8, analysis: 0.65, instruction: 0.7, knowledge: 0.7 },
    roles: ['specialist']
  }
]

// Cached models from DB
let cachedModels = null

async function loadModels() {
  try {
    const rows = await query('SELECT * FROM models')
    if (rows.length === 0) return staticModels

    cachedModels = rows.map(r => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      status: r.status,
      capabilities: typeof r.capabilities === 'string' ? JSON.parse(r.capabilities) : r.capabilities,
      costPer1k: parseFloat(r.cost_per_1k),
      avgLatency: r.avg_latency,
      rateLimit: typeof r.rate_limit === 'string' ? JSON.parse(r.rate_limit) : r.rate_limit,
      contextWindow: r.context_window,
      maxOutputTokens: r.max_output_tokens,
      endpoint: r.endpoint,
      model_id: r.model_id,
      apiProvider: r.api_provider,
      scores: r.scores ? (typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores) : null,
      roles: r.roles ? (typeof r.roles === 'string' ? JSON.parse(r.roles) : r.roles) : []
    }))
    return cachedModels
  } catch (error) {
    console.warn('⚠️ Failed to load models from DB, using static fallback:', error.message)
    return staticModels
  }
}

function getModelsSync() {
  return cachedModels || staticModels
}

module.exports = { loadModels, getModelsSync, staticModels }