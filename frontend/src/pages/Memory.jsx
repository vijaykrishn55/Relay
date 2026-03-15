import { useState, useEffect } from 'react'
import { Search, Trash2, Edit3, Tag, BookmarkPlus, Brain } from 'lucide-react'
import { memoryAPI } from '../services/api'

function Memory() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')

  // Fetch memories
  const fetchMemories = async (query) => {
    try {
      setLoading(true)
      const res = await memoryAPI.getAll(query || '')
      setMemories(res.data)
    } catch (err) {
      console.error('Failed to fetch memories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMemories(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return
    try {
      await memoryAPI.delete(id)
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to delete memory:', err)
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
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Memory Bank</h1>
          <p className="text-sm text-gray-500">
            {memories.length} saved memor{memories.length === 1 ? 'y' : 'ies'} — auto-injected into AI conversations when relevant
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16">
          <BookmarkPlus size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No memories saved yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            Select messages in a chat and click "Save to Memory" to start building your knowledge base.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map(memory => (
            <div key={memory.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
              {editingId === memory.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-gray-400" />
                    <input
                      type="text"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(memory.id)} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {memory.content}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {memory.tags && memory.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-400">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(memory)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(memory.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
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

export default Memory
