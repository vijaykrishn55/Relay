import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function SummaryCard({ summary }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const handleViewChat = () => {
    navigate(`/chat?session=${summary.session_id}`)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
            <MessageSquare size={16} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              {summary.session_title || 'Conversation'}
            </h3>
            <span className="text-xs text-gray-400">{formatDate(summary.created_at)}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Summary text */}
      <p className={`text-sm text-gray-600 mt-3 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
        {summary.summary}
      </p>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
          {/* Topics */}
          {summary.topics && summary.topics.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Topics:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {summary.topics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes */}
          {summary.outcomes && summary.outcomes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Key outcomes:</span>
              <ul className="mt-1 space-y-1">
                {summary.outcomes.map((outcome, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-gray-400">•</span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* User info extracted */}
          {summary.user_info_extracted && Object.keys(summary.user_info_extracted).length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Learned about you:</span>
              <ul className="mt-1 space-y-1">
                {summary.user_info_extracted.name && (
                  <li className="text-xs text-gray-600">• Name: {summary.user_info_extracted.name}</li>
                )}
                {summary.user_info_extracted.interests?.map((interest, idx) => (
                  <li key={`interest-${idx}`} className="text-xs text-gray-600">• Interest: {interest}</li>
                ))}
                {summary.user_info_extracted.preferences?.map((pref, idx) => (
                  <li key={`pref-${idx}`} className="text-xs text-gray-600">• Preference: {pref}</li>
                ))}
                {summary.user_info_extracted.personal_facts?.map((fact, idx) => (
                  <li key={`fact-${idx}`} className="text-xs text-gray-600">• Fact: {fact}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleViewChat}
          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
        >
          View Chat
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  )
}

export default SummaryCard
