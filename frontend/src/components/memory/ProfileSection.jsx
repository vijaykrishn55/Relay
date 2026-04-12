import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'

function ProfileSection({
  icon: Icon,
  title,
  items = [],
  type = 'list', // 'list' | 'tags'
  onAdd,
  onRemove,
  emptyText = 'Nothing added yet'
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue.trim())
      setNewValue('')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewValue('')
    }
  }

  return (
    <div className="glass-card border border-white/10 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 uppercase tracking-wider">
        <Icon size={16} className="text-neon-cyan" />
        {title}
      </div>

      {/* Content */}
      {items.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-500 italic">{emptyText}</p>
      ) : type === 'tags' ? (
        /* Tags layout */
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan text-sm group border border-neon-cyan/20"
            >
              {item}
              <button
                onClick={() => onRemove(idx)}
                className="p-0.5 rounded-full hover:bg-neon-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {isAdding && (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add interest..."
                autoFocus
                className="px-2 py-1 text-sm border border-neon-cyan/30 bg-surface-low rounded-full focus:outline-none focus:ring-2 focus:ring-neon-cyan text-gray-100 placeholder-gray-500 w-32 transition-all"
              />
              <button onClick={handleAdd} className="p-1 text-neon-cyan hover:bg-neon-cyan/10 rounded transition-colors">
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* List layout */
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm text-gray-300 group">
              <span>• {item}</span>
              <button
                onClick={() => onRemove(idx)}
                className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {isAdding && (
            <li className="flex items-center gap-2">
              <span className="text-gray-500">•</span>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add ${title.toLowerCase()}...`}
                autoFocus
                className="flex-1 px-2 py-1 text-sm border border-white/10 bg-surface-low rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-cyan text-gray-100 placeholder-gray-500 transition-all"
              />
              <button onClick={handleAdd} className="p-1 text-neon-cyan hover:bg-neon-cyan/10 rounded transition-colors">
                <Check size={14} />
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Add button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-3 flex items-center gap-1 text-xs text-neon-cyan hover:text-neon-cyan/80 font-medium transition-colors"
        >
          <Plus size={12} />
          Add {type === 'tags' ? 'interest' : 'item'}
        </button>
      )}
    </div>
  )
}

export default ProfileSection
