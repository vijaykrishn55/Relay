import { useState, useEffect } from 'react'
import { Search, RefreshCw, Wand2, FileText } from 'lucide-react'
import { profileAPI } from '../../services/api'
import SummaryCard from './SummaryCard'

function SummariesTab({ onCountUpdate }) {
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSummaries()
  }, [])

  const fetchSummaries = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await profileAPI.getSummaries()
      setSummaries(res.data)
      if (onCountUpdate) {
        const latest = res.data.length > 0 ? res.data[0].created_at : null
        onCountUpdate(res.data.length, latest)
      }
    } catch (err) {
      console.error('Failed to fetch summaries:', err)
      setError('Failed to load session summaries')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSummaries()
    setRefreshing(false)
  }

  // Filter summaries by search query
  const filteredSummaries = summaries.filter(s => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      s.summary?.toLowerCase().includes(query) ||
      s.session_title?.toLowerCase().includes(query) ||
      s.topics?.some(t => t.toLowerCase().includes(query))
    )
  })

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading summaries...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchSummaries} className="mt-2 text-purple-600 hover:underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Conversation History</h2>
          <p className="text-sm text-gray-500">
            {summaries.length} session summar{summaries.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-medium">
            <Wand2 size={10} />
            AI-Generated
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh summaries"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search summaries, topics..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Summaries list */}
      {summaries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No session summaries yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            Session summaries are automatically generated when you start a new conversation.
            <br />
            Have a chat first!
          </p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Search size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No summaries match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSummaries.map(summary => (
            <SummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SummariesTab
