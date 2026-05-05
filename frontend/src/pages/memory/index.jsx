import { useState, useCallback } from 'react';
import { Brain } from 'lucide-react';

import MemoryStats   from '../../components/memory/MemoryStats';
import MemoryTabs    from '../../components/memory/MemoryTabs';
import ProfileTab    from '../../components/memory/ProfileTab';
import SummariesTab  from '../../components/memory/SummariesTab';
import SavedTab      from '../../components/memory/SavedTab';

/** Format a date string into a human-readable "time ago" label. */
function formatTimeAgo(dateStr) {
  if (!dateStr) return null;
  const date     = new Date(dateStr);
  const diffMs   = Date.now() - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);

  if (diffMins  < 1)  return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  === 0) return 'Today';
  if (diffDays  === 1) return 'Yesterday';
  if (diffDays  < 7)  return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Memory page — entry point.
 * Owns the tab-level state and the stats banner data; everything else
 * is delegated to the sub-components in components/memory/.
 */
function Memory() {
  const [activeTab, setActiveTab] = useState('profile');

  const [stats, setStats] = useState({
    profileItems:       0,
    profileLastUpdated: null,
    summaryCount:       0,
    latestSummary:      null,
    memoryCount:        0,
  });

  const handleProfileUpdate = useCallback((itemCount, lastUpdated) => {
    setStats(prev => ({ ...prev, profileItems: itemCount, profileLastUpdated: formatTimeAgo(lastUpdated) }));
  }, []);

  const handleSummaryUpdate = useCallback((count, latest) => {
    setStats(prev => ({ ...prev, summaryCount: count, latestSummary: formatTimeAgo(latest) }));
  }, []);

  const handleMemoryUpdate = useCallback((count) => {
    setStats(prev => ({ ...prev, memoryCount: count }));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center border border-neon-purple/30">
            <Brain size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-100">AI Memory</h1>
            <p className="text-sm text-gray-400">What the AI knows and remembers about you</p>
          </div>
        </div>

        {/* Stats cards (clicking a card switches to that tab) */}
        <MemoryStats stats={stats} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab navigation */}
        <MemoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content — all three rendered but only the active one is visible
            (show/hide with CSS to avoid losing state on tab switch) */}
        <div className="relative w-full">
          <div className={activeTab === 'profile'  ? 'block' : 'hidden'}><ProfileTab   onProfileUpdate={handleProfileUpdate} /></div>
          <div className={activeTab === 'sessions' ? 'block' : 'hidden'}><SummariesTab onCountUpdate={handleSummaryUpdate}  /></div>
          <div className={activeTab === 'saved'    ? 'block' : 'hidden'}><SavedTab     onCountUpdate={handleMemoryUpdate}   /></div>
        </div>

      </div>
    </div>
  );
}

export default Memory;
