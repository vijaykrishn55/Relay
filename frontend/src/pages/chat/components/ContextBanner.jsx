import { ChevronDown, ChevronRight, Layers } from 'lucide-react';

/**
 * ContextBanner
 * Collapsible banner showing context messages inherited from a parent session.
 * Only rendered when contextMessages.length > 0.
 */
function ContextBanner({ contextMessages, collapsed, onToggle }) {
  if (!contextMessages || contextMessages.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-neon-purple/20 bg-neon-purple/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-neon-purple hover:bg-neon-purple/10 transition-colors"
      >
        <Layers size={13} />
        Context from previous session ({contextMessages.length} messages)
        {collapsed
          ? <ChevronRight size={13} className="ml-auto" />
          : <ChevronDown  size={13} className="ml-auto" />
        }
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-2 border-t border-neon-purple/10">
          {contextMessages.map((msg, i) => (
            <div key={i} className="flex gap-2 py-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 w-12 flex-shrink-0 ${
                msg.role === 'user' ? 'text-neon-cyan' : 'text-neon-purple'
              }`}>{msg.role}</span>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContextBanner;
