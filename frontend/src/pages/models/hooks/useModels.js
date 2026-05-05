import { useState, useEffect, useMemo } from 'react';
import { modelsAPI } from '../../../services/api';

/**
 * useModels
 * Owns the full model-list lifecycle: fetching, filtering by text/provider/
 * capability, and deriving the unique provider and capability lists used by
 * the filter UI.
 */
export function useModels() {
  const [models,           setModels]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeProvider,   setActiveProvider]   = useState('all');
  const [activeCapability, setActiveCapability] = useState('all');

  useEffect(() => { fetchModels(); }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await modelsAPI.getAll();
      setModels(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = async (modelData) => {
    try {
      await modelsAPI.create(modelData);
      await fetchModels();
    } catch (err) {
      console.error('Error adding model:', err);
      setError('Failed to add model');
    }
  };

  // Unique provider list derived from loaded models
  const providers = useMemo(() => {
    const set = new Set(models.map(m => m.provider));
    return ['all', ...Array.from(set).sort()];
  }, [models]);

  // Unique capability list derived from loaded models
  const capabilities = useMemo(() => {
    const set = new Set();
    models.forEach(m => {
      if (Array.isArray(m.capabilities)) m.capabilities.forEach(c => set.add(c));
    });
    return ['all', ...Array.from(set).sort()];
  }, [models]);

  // Apply all three filters simultaneously
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      const q = searchQuery.toLowerCase();
      const matchesText = !q ||
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        (model.model_id && model.model_id.toLowerCase().includes(q)) ||
        (Array.isArray(model.capabilities) && model.capabilities.some(c => c.toLowerCase().includes(q)));
      const matchesProvider   = activeProvider   === 'all' || model.provider === activeProvider;
      const matchesCapability = activeCapability === 'all' ||
        (Array.isArray(model.capabilities) && model.capabilities.includes(activeCapability));
      return matchesText && matchesProvider && matchesCapability;
    });
  }, [models, searchQuery, activeProvider, activeCapability]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveProvider('all');
    setActiveCapability('all');
  };

  const hasActiveFilters = searchQuery || activeProvider !== 'all' || activeCapability !== 'all';

  return {
    models, loading, error,
    searchQuery, setSearchQuery,
    activeProvider, setActiveProvider,
    activeCapability, setActiveCapability,
    providers, capabilities,
    filteredModels, hasActiveFilters,
    clearFilters, handleAddModel,
  };
}
