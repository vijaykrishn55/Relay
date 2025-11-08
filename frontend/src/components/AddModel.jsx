import { X } from 'lucide-react'
import { useState } from 'react'

function AddModelModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
  name: '',
  provider: '',
  endpoint: '',
  apiProvider: '',
  apiKey:'',
  capabilities: [],
  pricing: {
    input: 0,
    output: 0
  }
})
  const [showCustomProvider, setShowCustomProvider] = useState(false)
  const [customProvider, setCustomProvider] = useState('')

  const handleChange = (e) => {
  const { name, value } = e.target
  if (name.includes('.')) {
    const [parent, child] = name.split('.')
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: parseFloat(value) || 0
      }
    }))
  } else if (name === 'capabilities') {
    // Convert comma-separated string to array
    setFormData(prev => ({ 
      ...prev, 
      [name]: value.split(',').map(cap => cap.trim()).filter(Boolean) 
    }))
  } else if (name === 'apiProvider') {
    // Check if "other" is selected
    if (value === 'other') {
      setShowCustomProvider(true)
      setFormData(prev => ({ ...prev, [name]: '' }))
    } else {
      setShowCustomProvider(false)
      setCustomProvider('')
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  } else {
    setFormData(prev => ({ ...prev, [name]: value }))
  }
}

  const handleCustomProviderChange = (e) => {
    const value = e.target.value
    setCustomProvider(value)
    setFormData(prev => ({ ...prev, apiProvider: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
    // Reset form
    setShowCustomProvider(false)
    setCustomProvider('')
  }

  if (!isOpen) return null

 return (
  <div className="fixed inset-0 backdrop-blur flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Add New Model</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Llama 3.1 8B"
          />
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider *
          </label>
          <input
            type="text"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Meta (via Groq)"
          />
        </div>

        {/* API Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Provider *
          </label>
          <select
            name="apiProvider"
            value={showCustomProvider ? 'other' : formData.apiProvider}
            onChange={handleChange}
            required={!showCustomProvider}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select API Provider</option>
            <option value="openrouter">OpenRouter</option>
            <option value="mistral">Mistral</option>
            <option value="cerebras">Cerebras</option>
            <option value="groq">Groq</option>
            <option value="cohere">Cohere</option>
            <option value="other">Other (Custom)</option>
          </select>
        </div>

        {/* Custom API Provider Input */}
{showCustomProvider && (
  <>
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        ⚠️ <strong>Important:</strong> Custom providers must use OpenAI-compatible REST APIs. 
        Providers requiring specific SDKs are not supported.
      </p>
      <p className="text-xs text-yellow-700 mt-1">
        Examples that work: Together AI, Perplexity, Replicate, Fireworks AI
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Custom API Provider Name *
      </label>
      <input
        type="text"
        value={customProvider}
        onChange={handleCustomProviderChange}
        required
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="e.g., together, perplexity, fireworks"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        API Key *
      </label>
      <input
        type="password"
        name="apiKey"
        value={formData.apiKey}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter your API key"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Endpoint URL *
      </label>
      <input
        type="url"
        name="endpoint"
        value={formData.endpoint}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="e.g., https://api.together.xyz/v1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Must be OpenAI-compatible (supports /chat/completions)
      </p>
    </div>
  </>
)}

        {/* Endpoint - Only show if NOT custom provider */}
        {!showCustomProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint URL *
            </label>
            <input
              type="url"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., https://api.groq.com"
            />
          </div>
        )}

        {/* Capabilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capabilities *
          </label>
          <input
            type="text"
            name="capabilities"
            value={formData.capabilities.join(', ')} // Convert array to string for display
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., text-generation, code, reasoning"
          />
          <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Cost (per 1M tokens)
            </label>
            <input
              type="number"
              name="pricing.input"
              value={formData.pricing.input}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Cost (per 1M tokens)
            </label>
            <input
              type="number"
              name="pricing.output"
              value={formData.pricing.output}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Model
          </button>
        </div>
      </form>
    </div>
  </div>
)
}

export default AddModelModal