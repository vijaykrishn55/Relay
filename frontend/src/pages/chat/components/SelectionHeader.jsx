import { CheckSquare, X } from 'lucide-react';

/**
 * SelectionHeader
 * Top bar displayed when selection mode is active.
 * Shows how many messages are selected and a Cancel button.
 */
function SelectionHeader({ selectedCount, onCancel }) {
  return (
    <div className="flex-shrink-0 border-b border-white/5 bg-surface-low/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <CheckSquare size={16} className="text-neon-cyan" />
        <span className="text-sm text-gray-200 font-medium">
          {selectedCount === 0
            ? 'Tap messages to select'
            : `${selectedCount} message${selectedCount !== 1 ? 's' : ''} selected`
          }
        </span>
      </div>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
      >
        <X size={13} /> Cancel
      </button>
    </div>
  );
}

export default SelectionHeader;
