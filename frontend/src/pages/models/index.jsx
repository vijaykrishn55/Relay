import { useState } from 'react';
import { useModels }     from './hooks/useModels';
import ModelsHeader      from './components/ModelsHeader';
import ModelsSearch      from './components/ModelsSearch';
import ModelsFilters     from './components/ModelsFilters';
import ModelsStats       from './components/ModelsStats';
import ModelsGrid        from './components/ModelsGrid';
import LoadingSpinner    from '../../components/LoadingSpinner';
import AddModel          from '../../components/AddModel';

/**
 * Models page — thin orchestrator.
 * All data logic lives in useModels; all UI in the five sub-components.
 */
function Models() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    loading, error,
    searchQuery, setSearchQuery,
    activeProvider, setActiveProvider,
    activeCapability, setActiveCapability,
    providers, capabilities,
    filteredModels, hasActiveFilters,
    clearFilters, handleAddModel,
    models,
  } = useModels();

  if (loading) return <LoadingSpinner message="Loading models..." />;

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-card border border-red-500/30 rounded-xl p-4 text-red-300 bg-red-500/10">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">

        <ModelsHeader
          totalModels={models.length}
          providerCount={providers.length - 1}
          onAddModel={() => setIsModalOpen(true)}
        />

        <ModelsSearch value={searchQuery} onChange={setSearchQuery} />

        <ModelsFilters
          providers={providers}        activeProvider={activeProvider}      onProviderChange={setActiveProvider}
          capabilities={capabilities}  activeCapability={activeCapability}  onCapabilityChange={setActiveCapability}
          hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters}
        />

        <div className="mt-8">
          <ModelsStats
            totalModels={models.length}
            showingCount={filteredModels.length}
            providerCount={providers.length - 1}
          />

          <ModelsGrid models={filteredModels} onClearFilters={clearFilters} />
        </div>

        <AddModel
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddModel}
        />
      </div>
    </div>
  );
}

export default Models;
