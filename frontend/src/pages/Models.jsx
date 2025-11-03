import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import ModelCard from '../components/ModelCard'

function Models() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data 
  const models = [
    {
      id: 1,
      name: 'GPT-4',
      provider: 'OpenAI',
      status: 'active',
      capabilities: ['text-generation', 'code', 'reasoning'],
      costPer1k: 0.03,
      avgLatency: 450
    },
    {
      id: 2,
      name: 'GPT-3.5-Turbo',
      provider: 'OpenAI',
      status: 'active',
      capabilities: ['text-generation', 'code'],
      costPer1k: 0.002,
      avgLatency: 180
    },
    {
      id: 3,
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
      status: 'active',
      capabilities: ['text-generation', 'reasoning', 'analysis'],
      costPer1k: 0.015,
      avgLatency: 320
    },
    {
      id: 4,
      name: 'Llama 2 7B',
      provider: 'Meta (Local)',
      status: 'inactive',
      capabilities: ['text-generation'],
      costPer1k: 0,
      avgLatency: 890
    }
  ]

  // Filter models
  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Model Registry</h1>
            <p className="text-gray-600 mt-2">
              Manage your AI models and their configurations
            </p>
          </div>
          
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus size={20} />
            Add Model
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search models by name or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 font-medium">Total Models</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{models.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 font-medium">Active Models</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {models.filter(m => m.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 font-medium">Cloud Providers</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {new Set(models.map(m => m.provider)).size}
          </p>
        </div>
      </div>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No models found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(model => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Models