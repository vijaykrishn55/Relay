import { Plus } from 'lucide-react';

/** Header row: title, subtitle, and Add Model button. */
function ModelsHeader({ totalModels, providerCount, onAddModel }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple tracking-tight">
          Model Registry
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm">
          {totalModels} models across {providerCount} providers
        </p>
      </div>
      <button
        onClick={onAddModel}
        className="bg-neon-cyan/15 text-neon-cyan px-4 py-2 rounded-lg font-medium border border-neon-cyan/25 hover:bg-neon-cyan/25 hover:border-neon-cyan/40 transition-all flex items-center gap-2 text-sm"
      >
        <Plus size={16} /> Add Model
      </button>
    </div>
  );
}

export default ModelsHeader;
