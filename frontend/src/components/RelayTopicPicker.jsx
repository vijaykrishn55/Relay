import { useState } from 'react'
import { Loader, GitBranch, X, MessageSquare, PenLine } from 'lucide-react'

function RelayTopicPicker({ topics, loading, onSelect, onManualStart, onCancel }) {
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [mode, setMode] = useState('auto') // 'auto' or 'manual'
  const [manualTopic, setManualTopic] = useState('')

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 border border-white/10">
          <Loader size={24} className="text-neon-cyan animate-spin drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]" />
          <p className="text-sm text-gray-300">Analyzing conversation topics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl border border-white/10 max-w-lg w-full mx-4 max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-neon-cyan" />
            <h3 className="font-semibold text-gray-100">Relay: Active — Start a Topic Session</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => { setMode('auto'); setManualTopic('') }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'auto'
                ? 'text-neon-cyan border-b-2 border-neon-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.2)]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            AI-Detected Topics
          </button>
          <button
            onClick={() => { setMode('manual'); setSelectedTopic(null) }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'manual'
                ? 'text-neon-cyan border-b-2 border-neon-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.2)]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <PenLine size={13} />
            Describe Your Own
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'auto' ? (
            <div className="space-y-2">
              {topics.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  No distinct topics found. Try the manual option instead.
                </p>
              ) : (
                topics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTopic(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedTopic === i
                        ? 'border-neon-cyan/50 bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,242,255,0.15)]'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-100 text-sm">{topic.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        topic.relevance === 'high' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        topic.relevance === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-white/10 text-gray-400 border border-white/10'
                      }`}>
                        {topic.relevance}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{topic.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <MessageSquare size={10} />
                      {topic.messageIndices.length} messages
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                Describe the topic you want to branch into a new session. The AI will find all related messages from this conversation.
              </p>
              <textarea
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder='e.g. "the database indexing discussion" or "everything about React hooks"'
                className="w-full border border-white/10 bg-surface-low rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {mode === 'auto' ? (
            <button
              onClick={() => selectedTopic !== null && onSelect(topics[selectedTopic])}
              disabled={selectedTopic === null}
              className="px-4 py-2 text-sm bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/30 disabled:bg-white/10 disabled:text-gray-500 disabled:border-white/10 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              Start Session
            </button>
          ) : (
            <button
              onClick={() => manualTopic.trim() && onManualStart(manualTopic.trim())}
              disabled={!manualTopic.trim()}
              className="px-4 py-2 text-sm bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/30 disabled:bg-white/10 disabled:text-gray-500 disabled:border-white/10 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              Find & Start Session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RelayTopicPicker
