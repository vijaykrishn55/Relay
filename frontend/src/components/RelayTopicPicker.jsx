import { useState } from 'react'
import { Loader, GitBranch, X, MessageSquare, PenLine } from 'lucide-react'

function RelayTopicPicker({ topics, loading, onSelect, onManualStart, onCancel }) {
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [mode, setMode] = useState('auto') // 'auto' or 'manual'
  const [manualTopic, setManualTopic] = useState('')

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center gap-3">
          <Loader size={24} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-600">Analyzing conversation topics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Relay: Active — Start a Topic Session</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setMode('auto'); setManualTopic('') }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'auto'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI-Detected Topics
          </button>
          <button
            onClick={() => { setMode('manual'); setSelectedTopic(null) }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'manual'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
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
                <p className="text-center text-gray-500 text-sm py-8">
                  No distinct topics found. Try the manual option instead.
                </p>
              ) : (
                topics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTopic(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedTopic === i
                        ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800 text-sm">{topic.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        topic.relevance === 'high' ? 'bg-green-100 text-green-700' :
                        topic.relevance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {topic.relevance}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{topic.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <MessageSquare size={10} />
                      {topic.messageIndices.length} messages
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Describe the topic you want to branch into a new session. The AI will find all related messages from this conversation.
              </p>
              <textarea
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder='e.g. "the database indexing discussion" or "everything about React hooks"'
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {mode === 'auto' ? (
            <button
              onClick={() => selectedTopic !== null && onSelect(topics[selectedTopic])}
              disabled={selectedTopic === null}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              Start Session
            </button>
          ) : (
            <button
              onClick={() => manualTopic.trim() && onManualStart(manualTopic.trim())}
              disabled={!manualTopic.trim()}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
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
