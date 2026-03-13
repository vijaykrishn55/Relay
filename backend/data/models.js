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
    apiProvider: 'mistral'
  },
  
  // Cerebras
  {
    id: 3,
    name: 'Z.AI GLM 4.7',
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
    model_id: 'zai-glm-4.7',
    apiProvider: 'cerebras'
  },
  {
    id: 4,
    name: 'OpenAI GPT OSS',
    provider: 'Cerebras',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'analysis'],
    costPer1k: 0.0,
    avgLatency: 200,
    rateLimit: { rpm: 30, tpm: 64000, rpd: 14400 },
    contextWindow: 128000,
    maxOutputTokens: 65536,
    endpoint: 'https://api.cerebras.ai',
    model_id: 'gpt-oss-120b',
    apiProvider: 'cerebras'
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
    apiProvider: 'cerebras'
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
    apiProvider: 'groq'
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
    apiProvider: 'groq'
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
    apiProvider: 'groq'
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
    apiProvider: 'groq'
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
    apiProvider: 'groq'
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
    apiProvider: 'cohere'
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
    apiProvider: 'cohere'
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
      apiProvider: r.api_provider
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