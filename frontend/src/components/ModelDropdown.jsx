import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import { modelsAPI } from '../services/api';

function ModelDropdown({ value, onChange, disabled, compact = false }) {
  const [models, setModels] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await modelsAPI.getAll();
        console.log('[ModelDropdown] Fetched models:', response.data.length, response.data.map(m => m.name));
        setModels(response.data);
      } catch (error) {
        console.error('[ModelDropdown] Error fetching models:', error);
      }
    };
    fetchModels();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to selected item when opened
  useEffect(() => {
    if (open && menuRef.current && value) {
      const selected = menuRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [open, value]);

  const selectedModel = value ? models.find(m => String(m.id) === String(value)) : null;
  const selectedName = selectedModel?.name || (value ? 'Loading...' : 'Auto');

  const handleSelect = (modelId, modelName) => {
    onChange(modelId, modelName);
    setOpen(false);
  };

  // Group models by provider
  const grouped = {};
  for (const model of models) {
    const p = model.provider || 'Other';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(model);
  }

  if (compact) {
    return (
      <div ref={dropdownRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 w-full h-8 px-2 rounded-lg text-xs transition-colors
            ${open 
              ? 'bg-white/8 border-neon-cyan/30 text-gray-200' 
              : 'bg-transparent border-white/8 text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }
            border disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Cpu size={12} className="flex-shrink-0 text-gray-500" />
          <span className="truncate flex-1 text-left">{selectedName}</span>
          <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu — opens upward, scrollable */}
        {open && (
          <div
            ref={menuRef}
            className="absolute bottom-full mb-1 left-0 w-56 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-surface-low/98 backdrop-blur-xl shadow-2xl z-50 animate-fade-in py-1 scrollbar-thin"
          >
            {/* Auto option */}
            <button
              type="button"
              onClick={() => handleSelect('', 'Auto')}
              data-selected={!value ? 'true' : 'false'}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                ${!value 
                  ? 'bg-neon-cyan/10 text-neon-cyan' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!value ? 'bg-neon-cyan' : 'bg-gray-600'}`} />
              <span className="font-medium">Auto</span>
              <span className="ml-auto text-[10px] text-gray-500">Router picks</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-white/5 my-1" />

            {/* Model options grouped by provider */}
            {Object.entries(grouped).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{provider}</div>
                {providerModels.map(model => {
                  const isSelected = String(value) === String(model.id);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelect(String(model.id), model.name)}
                      data-selected={isSelected ? 'true' : 'false'}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
                        ${isSelected 
                          ? 'bg-neon-cyan/10 text-neon-cyan' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-neon-cyan' : 'bg-emerald-500'
                      }`} />
                      <span className="truncate">{model.name}</span>
                      {isSelected && <Check size={12} className="ml-auto flex-shrink-0 text-neon-cyan" />}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Footer showing count */}
            <div className="h-px bg-white/5 mt-1" />
            <div className="px-3 py-1.5 text-[10px] text-gray-600 text-center">
              {models.length} models available
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-compact (full-size) variant
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
        Model Selection
      </label>
      <select
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          const name = val ? models.find(m => String(m.id) === val)?.name || 'Unknown' : 'Auto';
          onChange(val, name);
        }}
        disabled={disabled}
        className="w-full px-4 py-2 border border-white/10 bg-surface-low rounded-lg focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan text-gray-100 placeholder-gray-500 disabled:opacity-50"
      >
        <option value="">Auto (Router decides)</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>{model.name} — {model.provider}</option>
        ))}
      </select>
    </div>
  );
}

export default ModelDropdown;
