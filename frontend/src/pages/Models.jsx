import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X, Filter, Cpu, Layers, Globe } from 'lucide-react'
import ModelCard from '../components/ModelCard'
import { modelsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import AddModel from '../components/AddModel'

function Models() {
  const [searchQuery, setSearchQuery] = useState('')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeProvider, setActiveProvider] = useState('all')
  const [activeCapability, setActiveCapability] = useState('all')

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      setLoading(true)
      const response = await modelsAPI.getAll()
      setModels(response.data)
      setError('')
    } catch (err) {
      console.error('Error fetching models:', err)
      setError('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const handleAddModel = async (modelData) => {
    try {
      await modelsAPI.create(modelData)
      await fetchModels()
    } catch (err) {
      console.error('Error adding model:', err)
      setError('Failed to add model')
    }
  }

  // Derive unique providers & capabilities for filter tabs
  const providers = useMemo(() => {
    const set = new Set(models.map(m => m.provider))
    return ['all', ...Array.from(set).sort()]
  }, [models])

  const capabilities = useMemo(() => {
    const set = new Set()
    models.forEach(m => {
      if (Array.isArray(m.capabilities)) {
        m.capabilities.forEach(c => set.add(c))
      }
    })
    return ['all', ...Array.from(set).sort()]
  }, [models])

  // Multi-filter: text + provider + capability
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      // Text search — name, provider, model_id, capabilities
      const q = searchQuery.toLowerCase()
      const matchesText = !q || 
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        (model.model_id && model.model_id.toLowerCase().includes(q)) ||
        (Array.isArray(model.capabilities) && model.capabilities.some(c => c.toLowerCase().includes(q)))
      
      // Provider filter
      const matchesProvider = activeProvider === 'all' || model.provider === activeProvider
      
      // Capability filter
      const matchesCapability = activeCapability === 'all' || 
        (Array.isArray(model.capabilities) && model.capabilities.includes(activeCapability))
      
      return matchesText && matchesProvider && matchesCapability
    })
  }, [models, searchQuery, activeProvider, activeCapability])

  const clearFilters = () => {
    setSearchQuery('')
    setActiveProvider('all')
    setActiveCapability('all')
  }

  const hasActiveFilters = searchQuery || activeProvider !== 'all' || activeCapability !== 'all'

  if (loading) {
    return <LoadingSpinner message="Loading models..." />
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-card border border-red-500/30 rounded-xl p-4 text-red-300 bg-red-500/10">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple tracking-tight">Model Registry</h1>
              <p className="text-gray-400 mt-1.5 text-sm">
                {models.length} models across {providers.length - 1} providers
              </p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-neon-cyan/15 text-neon-cyan px-4 py-2 rounded-lg font-medium border border-neon-cyan/25 hover:bg-neon-cyan/25 hover:border-neon-cyan/40 transition-all flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Add Model
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by name, provider, model ID, or capability…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-surface-low/80 border border-white/8 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan/30 transition-all backdrop-blur-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Globe size={13} className="text-gray-500 flex-shrink-0" />
            {providers.map(p => (
              <button
                key={p}
                onClick={() => setActiveProvider(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  activeProvider === p
                    ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/25'
                    : 'bg-white/3 text-gray-400 border-white/6 hover:bg-white/6 hover:text-gray-200'
                }`}
              >
                {p === 'all' ? 'All Providers' : p}
              </button>
            ))}
          </div>

          {/* Capability Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Layers size={13} className="text-gray-500 flex-shrink-0" />
            {capabilities.map(c => (
              <button
                key={c}
                onClick={() => setActiveCapability(c)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
                  activeCapability === c
                    ? 'bg-neon-purple/15 text-neon-purple border-neon-purple/25'
                    : 'bg-white/3 text-gray-500 border-white/5 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium text-red-400/70 hover:text-red-300 border border-red-500/15 hover:border-red-500/30 bg-red-500/5 transition-all flex items-center gap-1"
              >
                <X size={10} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20">
                <Cpu size={16} className="text-neon-cyan" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Total Models</p>
                <p className="text-2xl font-bold text-neon-cyan">{models.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Filter size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Showing</p>
                <p className="text-2xl font-bold text-emerald-400">{filteredModels.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20">
                <Globe size={16} className="text-neon-purple" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Providers</p>
                <p className="text-2xl font-bold text-neon-purple">{providers.length - 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Models Grid */}
        {filteredModels.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center border border-white/5">
            <Search size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No models match your filters</p>
            <button onClick={clearFilters} className="text-neon-cyan text-xs mt-2 hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModels.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}

        {/* Add Model Modal */}
        <AddModel
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddModel}
        />
      </div>
    </div>
  )
}

export default Models