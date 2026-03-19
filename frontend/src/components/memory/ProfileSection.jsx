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
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
        <Icon size={16} className="text-gray-500" />
        {title}
      </div>

      {/* Content */}
      {items.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-400 italic">{emptyText}</p>
      ) : type === 'tags' ? (
        /* Tags layout */
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm group"
            >
              {item}
              <button
                onClick={() => onRemove(idx)}
                className="p-0.5 rounded-full hover:bg-purple-200 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="px-2 py-1 text-sm border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 w-32"
              />
              <button onClick={handleAdd} className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* List layout */
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm text-gray-700 group">
              <span>• {item}</span>
              <button
                onClick={() => onRemove(idx)}
                className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {isAdding && (
            <li className="flex items-center gap-2">
              <span className="text-gray-400">•</span>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add ${title.toLowerCase()}...`}
                autoFocus
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button onClick={handleAdd} className="p-1 text-purple-600 hover:bg-purple-50 rounded">
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
          className="mt-3 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
        >
          <Plus size={12} />
          Add {type === 'tags' ? 'interest' : 'item'}
        </button>
      )}
    </div>
  )
}

export default ProfileSection
