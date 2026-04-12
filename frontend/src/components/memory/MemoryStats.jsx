import { User, FileText, Bookmark, Sparkles, Wand2, BookmarkPlus } from 'lucide-react'

function MemoryStats({ stats, activeTab, onTabChange }) {
  const cards = [
    {
      id: 'profile',
      icon: User,
      badge: { icon: Sparkles, text: 'AI-Learned', gradient: 'from-neon-purple to-neon-cyan' },
      title: 'Profile',
      value: stats.profileItems || 0,
      label: 'items',
      subtitle: stats.profileLastUpdated ? `Last: ${stats.profileLastUpdated}` : 'Not yet learned'
    },
    {
      id: 'sessions',
      icon: FileText,
      badge: { icon: Wand2, text: 'AI-Generated', gradient: 'from-neon-cyan to-neon-purple' },
      title: 'Sessions',
      value: stats.summaryCount || 0,
      label: 'summaries',
      subtitle: stats.latestSummary ? `Latest: ${stats.latestSummary}` : 'No summaries yet'
    },
    {
      id: 'saved',
      icon: Bookmark,
      badge: { icon: BookmarkPlus, text: 'User-Saved', gradient: null, solid: 'bg-neon-purple' },
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
              glass-card border rounded-xl p-4 text-left transition-all
              ${isActive
                ? 'border-neon-cyan/50 ring-2 ring-neon-cyan/20 shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                : 'border-white/10 hover:border-white/20 hover:shadow-[0_0_10px_rgba(0,242,255,0.1)]'}
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${isActive ? 'bg-neon-cyan/20' : 'bg-white/5'}
              `}>
                <Icon size={20} className={isActive ? 'text-neon-cyan' : 'text-gray-400'} />
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
                <span className="text-2xl font-bold text-gray-100">{card.value}</span>
                <span className="text-sm text-gray-400">{card.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MemoryStats
