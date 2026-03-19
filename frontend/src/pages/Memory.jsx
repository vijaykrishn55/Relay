import { useState, useCallback } from 'react'
import { Brain } from 'lucide-react'
import MemoryStats from '../components/memory/MemoryStats'
import MemoryTabs from '../components/memory/MemoryTabs'
import ProfileTab from '../components/memory/ProfileTab'
import SummariesTab from '../components/memory/SummariesTab'
import SavedTab from '../components/memory/SavedTab'

function Memory() {
  const [activeTab, setActiveTab] = useState('profile')

  // Stats state
  const [stats, setStats] = useState({
    profileItems: 0,
    profileLastUpdated: null,
    summaryCount: 0,
    latestSummary: null,
    memoryCount: 0,
    recentMemories: 0
  })

  // Callbacks to update stats from child components
  const handleProfileUpdate = useCallback((itemCount, lastUpdated) => {
    setStats(prev => ({
      ...prev,
      profileItems: itemCount,
      profileLastUpdated: formatTimeAgo(lastUpdated)
    }))
  }, [])

  const handleSummaryUpdate = useCallback((count, latest) => {
    setStats(prev => ({
      ...prev,
      summaryCount: count,
      latestSummary: formatTimeAgo(latest)
    }))
  }, [])

  const handleMemoryUpdate = useCallback((count) => {
    setStats(prev => ({
      ...prev,
      memoryCount: count
    }))
  }, [])

  // Format time ago helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Handle tab change from stats cards
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab onProfileUpdate={handleProfileUpdate} />
      case 'sessions':
        return <SummariesTab onCountUpdate={handleSummaryUpdate} />
      case 'saved':
        return <SavedTab onCountUpdate={handleMemoryUpdate} />
      default:
        return <ProfileTab onProfileUpdate={handleProfileUpdate} />
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">AI Memory</h1>
          <p className="text-sm text-gray-500">
            What the AI knows and remembers about you
          </p>
        </div>
      </div>

      {/* Stats Banner */}
      <MemoryStats
        stats={stats}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Navigation */}
      <MemoryTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Memory
