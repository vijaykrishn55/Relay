import { useState } from 'react';
import { Plus, Trash2, MessageSquare, Check, X } from 'lucide-react';

function SessionList({ sessions, activeSessionId, onSelect, onCreate, onDelete, onRename }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (session, e) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(session.title);
  };

  const submitRename = (id) => {
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col py-2">
      {/* New Session Button */}
      <div className="px-3 pb-2">
        <button
          onClick={onCreate}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs text-gray-400 hover:bg-white/5 hover:border-white/20 hover:text-gray-200 transition-all"
        >
          <Plus size={14} className="text-neon-cyan" />
          New Session
        </button>
      </div>

      {/* Section label */}
      <p className="px-4 text-[9px] font-bold text-gray-500/80 uppercase tracking-[0.2em] mb-1.5">
        Sessions
      </p>

      {/* Session items */}
      <div className="flex flex-col gap-px">
        {sessions.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-500/70 italic">No sessions yet</p>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-all ${
              activeSessionId === session.id
                ? 'bg-neon-cyan/8 text-neon-cyan'
                : 'text-gray-400 hover:bg-white/4 hover:text-gray-300'
            }`}
          >
            <MessageSquare
              size={13}
              className={`flex-shrink-0 ${
                activeSessionId === session.id
                  ? 'opacity-100 drop-shadow-[0_0_4px_rgba(0,229,255,0.5)]'
                  : 'opacity-40'
              }`}
            />

            {renamingId === session.id ? (
              <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename(session.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="flex-1 min-w-0 text-xs bg-obsidian border border-neon-cyan/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-neon-cyan text-gray-100"
                />
                <button onClick={() => submitRename(session.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                  <Check size={11} />
                </button>
                <button onClick={() => setRenamingId(null)} className="text-gray-500 hover:text-gray-300 p-0.5">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <>
                <span
                  className="flex-1 text-xs truncate min-w-0"
                  onDoubleClick={(e) => startRename(session, e)}
                  title={session.title}
                >
                  {session.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0 p-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionList;