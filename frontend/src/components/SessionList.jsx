import { useState } from "react";
import { Plus, Trash2, MessageSquare, Check, X } from "lucide-react";

function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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
    <div className="flex flex-col h-full">
      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={onCreate}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Recent
      </p>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-400">No conversations yet.</p>
        )}

        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
              activeSessionId === session.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare size={14} className="flex-shrink-0 opacity-60" />

            {renamingId === session.id ? (
              <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename(session.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 outline-none"
                />
                <button onClick={() => submitRename(session.id)} className="text-green-600 hover:text-green-700">
                  <Check size={12} />
                </button>
                <button onClick={() => setRenamingId(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <span
                  className="flex-1 text-xs truncate"
                  onDoubleClick={e => startRename(session, e)}
                  title="Double-click to rename"
                >
                  {session.title}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(session.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SessionList