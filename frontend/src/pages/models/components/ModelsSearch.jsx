import { Search, X } from 'lucide-react';

/** Text search bar with inline clear button. */
function ModelsSearch({ value, onChange }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
      <input
        type="text"
        placeholder="Search by name, provider, model ID, or capability…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2.5 bg-surface-low/80 border border-white/8 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan/30 transition-all backdrop-blur-sm"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default ModelsSearch;
