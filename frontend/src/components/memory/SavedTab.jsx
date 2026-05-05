import { useState, useEffect } from 'react'
import { Search, Trash2, Edit3, Tag, BookmarkPlus } from 'lucide-react'
import { memoryAPI } from '../../services/api'

function SavedTab({ onCountUpdate }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')

  // Fetch memories
  const fetchMemories = async (query) => {
    try {
      setLoading(true)
      setError(null)
      const res = await memoryAPI.getAll(query || '')
      setMemories(res.data)
      if (onCountUpdate) onCountUpdate(res.data.length)
    } catch (err) {
      console.error('Failed to fetch memories:', err)
      setError('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  // Single useEffect: fetch immediately for empty query, debounce for search
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        fetchMemories(searchQuery)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      fetchMemories()
    }
  }, [searchQuery])

  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return
    try {
      await memoryAPI.delete(id)
      setMemories(prev => {
        const updated = prev.filter(m => m.id !== id)
        if (onCountUpdate) onCountUpdate(updated.length)
        return updated
      })
    } catch (err) {
      console.error('Failed to delete memory:', err)
      setError('Failed to delete memory. Try again.')
    }
  }

  const startEdit = (memory) => {
    setEditingId(memory.id)
    setEditContent(memory.content)
    setEditTags(memory.tags.join(', '))
  }

  const saveEdit = async (id) => {
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
      await memoryAPI.update(id, { content: editContent, tags })
      setMemories(prev => prev.map(m =>
        m.id === id ? { ...m, content: editContent, tags } : m
      ))
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update memory:', err)
      setError('Failed to update memory. Try again.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Saved Memories</h2>
          <p className="text-sm text-gray-400">
            {memories.length} memor{memories.length === 1 ? 'y' : 'ies'} — auto-injected when relevant
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-purple text-gray-900 text-[10px] font-medium">
          <BookmarkPlus size={10} />
          User-Saved
        </span>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-white/10 bg-surface-low rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan text-gray-100 placeholder-gray-500 transition-all"
        />
      </div>

      {/* Memory list */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
          <button onClick={() => fetchMemories(searchQuery)} className="mt-2 text-neon-cyan hover:underline">
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="text-center text-gray-400 py-12">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <BookmarkPlus size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No memories saved yet.</p>
          <p className="text-gray-500 text-xs mt-1">
            Select messages in a chat and click "Save to Memory" to start building your knowledge base.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map(memory => (
            <div key={memory.id} className="glass-card border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group">
              {editingId === memory.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full text-sm border border-white/10 bg-surface-low rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-neon-cyan text-gray-100 placeholder-gray-500 resize-none transition-all"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-gray-500" />
                    <input
                      type="text"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="flex-1 text-xs border border-white/10 bg-surface-low rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-neon-cyan text-gray-100 placeholder-gray-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-300 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(memory.id)} className="text-xs px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/30 transition-all">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {memory.content}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {memory.tags && memory.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-medium uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-500">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(memory)} className="p-1.5 text-gray-500 hover:text-neon-cyan rounded-lg hover:bg-neon-cyan/10 transition-colors">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(memory.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SavedTab
