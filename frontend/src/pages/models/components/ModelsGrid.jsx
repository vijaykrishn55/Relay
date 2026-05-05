import { Search } from 'lucide-react';
import ModelCard from '../../../components/ModelCard';

/**
 * ModelsGrid
 * Renders either an empty-state card or a responsive grid of ModelCard items.
 */
function ModelsGrid({ models, onClearFilters }) {
  if (models.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center border border-white/5">
        <Search size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No models match your filters</p>
        <button onClick={onClearFilters} className="text-neon-cyan text-xs mt-2 hover:underline">
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {models.map(model => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}

export default ModelsGrid;
