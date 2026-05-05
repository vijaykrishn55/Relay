import { useState, useRef, useEffect } from 'react';
import { Copy, Check, Pencil, X } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/formatTime';

/**
 * UserMessage
 * Renders a single user message bubble with inline edit support and
 * optional selection-mode checkbox overlay.
 *
 * Props:
 *   message        – message object { id, content, timestamp }
 *   index          – position in the messages array
 *   selectionMode  – boolean, whether multi-select is active
 *   isSelected     – boolean, whether this message is currently selected
 *   onToggleSelect – (index) => void
 *   onEdit         – (newContent: string) => void
 */
function UserMessage({ message, index, selectionMode, isSelected, onToggleSelect, onEdit }) {
  const [copied, setCopied]         = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);

  // Auto-focus + auto-size the textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
    if (e.key === 'Escape') handleEditCancel();
  };

  return (
    <div
      className={`relative flex justify-end py-2 group animate-fade-in ${
        selectionMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'bg-neon-cyan/5 rounded-xl ring-1 ring-neon-cyan/30' : ''}`}
      onClick={() => selectionMode && onToggleSelect(index)}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-neon-cyan border-neon-cyan text-obsidian'
              : 'border-gray-500 bg-transparent hover:border-gray-400'
          }`}>
            {isSelected && <Check size={12} strokeWidth={3} />}
          </div>
        </div>
      )}

      <div className={`max-w-[75%] relative ${selectionMode ? 'mr-2' : ''}`}>
        {/* Hover actions (copy + edit) */}
        {!selectionMode && (
          <div className="absolute -left-16 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
              title="Copy">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            <button onClick={() => { setEditContent(message.content); setIsEditing(true); }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
              title="Edit">
              <Pencil size={13} />
            </button>
          </div>
        )}

        {/* Inline edit textarea */}
        {isEditing ? (
          <div className="bg-surface-mid border border-neon-cyan/20 rounded-2xl rounded-br-sm px-4 py-3">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-transparent text-sm text-gray-100 resize-none focus:outline-none min-w-[200px]"
              rows={1}
            />
            <div className="flex gap-1.5 justify-end mt-2">
              <button onClick={handleEditCancel} className="p-1 rounded-md hover:bg-white/10 text-gray-400"><X size={13} /></button>
              <button onClick={handleEditSave}   className="p-1 rounded-md bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20"><Check size={13} /></button>
            </div>
          </div>
        ) : (
          <div className="bg-neon-cyan/8 text-gray-100 rounded-2xl rounded-br-sm px-4 py-2.5 border border-neon-cyan/15">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        )}

        {/* Timestamp (visible on hover) */}
        {message.timestamp && (
          <p className="text-[10px] text-gray-600 mt-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
            {formatRelativeTime(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

export default UserMessage;
