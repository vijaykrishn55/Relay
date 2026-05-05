import { Globe, Layers, X } from 'lucide-react';

/**
 * ModelsFilters
 * Provider chip row + capability chip row + clear-all button.
 */
function ModelsFilters({
  providers, activeProvider, onProviderChange,
  capabilities, activeCapability, onCapabilityChange,
  hasActiveFilters, onClearFilters,
}) {
  return (
    <>
      {/* Provider filter */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Globe size={13} className="text-gray-500 flex-shrink-0" />
        {providers.map(p => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
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

      {/* Capability filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Layers size={13} className="text-gray-500 flex-shrink-0" />
        {capabilities.map(c => (
          <button
            key={c}
            onClick={() => onCapabilityChange(c)}
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
            onClick={onClearFilters}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-red-400/70 hover:text-red-300 border border-red-500/15 hover:border-red-500/30 bg-red-500/5 transition-all flex items-center gap-1"
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>
    </>
  );
}

export default ModelsFilters;
