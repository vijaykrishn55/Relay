import { Activity, MessageSquare, Cpu, Database } from 'lucide-react';

/**
 * DashboardStats
 * Four metric cards: AI Responses / Sessions / Total Models / Active Models.
 */
function DashboardStats({ metrics }) {
  const cards = [
    { title: 'AI Responses',  value: metrics?.totalRequests ?? 0,                          icon: Activity,     color: 'text-neon-cyan'   },
    { title: 'Total Sessions', value: metrics?.totalSessions ?? 0,                         icon: MessageSquare, color: 'text-neon-purple' },
    { title: 'Total Models',  value: metrics?.totalModels ?? metrics?.activeModels ?? 0,   icon: Cpu,          color: 'text-amber-400'   },
    { title: 'Active Models', value: metrics?.activeModels ?? 0,                           icon: Database,     color: 'text-neon-cyan'   },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="glass-card p-5 glass-hover group">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{card.title}</span>
              <span className={`p-2 bg-obsidian rounded-lg border border-white/5 group-hover:border-white/15 transition-colors ${card.color}`}>
                <Icon size={16} />
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-100">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export default DashboardStats;
