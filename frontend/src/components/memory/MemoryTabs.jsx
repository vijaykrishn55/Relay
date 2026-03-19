import { User, FileText, Bookmark } from 'lucide-react'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'sessions', label: 'Sessions', icon: FileText },
  { id: 'saved', label: 'Saved', icon: Bookmark }
]

function MemoryTabs({ activeTab, onTabChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default MemoryTabs
