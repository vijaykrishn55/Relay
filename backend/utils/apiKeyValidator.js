const checkApiKey = (apiProvider) => {
  if (!apiProvider) {
    return { available: false, reason: 'No API provider configured' }
  }
  const envKey = `${apiProvider.toUpperCase()}_API_KEY`
  const apiKey = process.env[envKey]
  
  // Check if key exists and is not empty
  if (!apiKey || apiKey.trim() === '') {
    return {
      available: false,
      reason: 'API key not configured'
    }
  }
  
  // Basic validation - key should be reasonable length
  if (apiKey.length < 10) {
    return {
      available: false,
      reason: 'Invalid API key format'
    }
  }
  
  return {
    available: true,
    reason: 'API key configured'
  }
}

const updateModelStatuses = (models) => {
  return models.map(model => {
    const keyCheck = checkApiKey(model.apiProvider)
    
    return {
      ...model,
      status: keyCheck.available ? 'active' : 'unavailable',
      statusReason: keyCheck.reason
    }
  })
}

module.exports = {
  checkApiKey,
  updateModelStatuses
}