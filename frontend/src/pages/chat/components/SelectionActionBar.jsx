import { BookmarkPlus, ArrowRightCircle } from 'lucide-react';

/**
 * SelectionActionBar
 * Bottom action bar shown when ≥1 messages are selected.
 * Provides "Save to Memory" and "New Chat with Context" actions.
 */
function SelectionActionBar({ selectedCount, onSaveToMemory, onStartContextSession }) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-white/5 bg-surface-low/95 backdrop-blur-xl px-4 py-3 animate-fade-in">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {selectedCount} message{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onSaveToMemory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-xl hover:bg-neon-purple/20 transition-colors"
          >
            <BookmarkPlus size={14} /> Save to Memory
          </button>
          <button
            onClick={onStartContextSession}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 rounded-xl hover:bg-neon-cyan/25 transition-colors"
          >
            <ArrowRightCircle size={14} /> New Chat with Context
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectionActionBar;
