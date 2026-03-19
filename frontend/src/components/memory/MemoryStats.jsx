import { User, FileText, Bookmark, Sparkles, Wand2, BookmarkPlus } from 'lucide-react'

function MemoryStats({ stats, activeTab, onTabChange }) {
  const cards = [
    {
      id: 'profile',
      icon: User,
      badge: { icon: Sparkles, text: 'AI-Learned', gradient: 'from-purple-500 to-indigo-500' },
      title: 'Profile',
      value: stats.profileItems || 0,
      label: 'items',
      subtitle: stats.profileLastUpdated ? `Last: ${stats.profileLastUpdated}` : 'Not yet learned'
    },
    {
      id: 'sessions',
      icon: FileText,
      badge: { icon: Wand2, text: 'AI-Generated', gradient: 'from-blue-500 to-cyan-500' },
      title: 'Sessions',
      value: stats.summaryCount || 0,
      label: 'summaries',
      subtitle: stats.latestSummary ? `Latest: ${stats.latestSummary}` : 'No summaries yet'
    },
    {
      id: 'saved',
      icon: Bookmark,
      badge: { icon: BookmarkPlus, text: 'User-Saved', gradient: null, solid: 'bg-purple-600' },
      title: 'Saved',
      value: stats.memoryCount || 0,
      label: 'memories',
      subtitle: stats.recentMemories ? `This week: ${stats.recentMemories}` : 'No memories yet'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map(card => {
        const Icon = card.icon
        const BadgeIcon = card.badge.icon
        const isActive = activeTab === card.id

        return (
          <button
            key={card.id}
            onClick={() => onTabChange(card.id)}
            className={`
              bg-white border rounded-xl p-4 text-left transition-all
              ${isActive
                ? 'border-purple-300 ring-2 ring-purple-100 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${isActive ? 'bg-purple-100' : 'bg-gray-100'}
              `}>
                <Icon size={20} className={isActive ? 'text-purple-600' : 'text-gray-500'} />
              </div>
              <span className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-medium
                ${card.badge.solid || `bg-gradient-to-r ${card.badge.gradient}`}
              `}>
                <BadgeIcon size={10} />
                {card.badge.text}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-800">{card.value}</span>
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MemoryStats
