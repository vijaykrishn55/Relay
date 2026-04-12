import { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Database, MessageSquare } from 'lucide-react';
import RequestsTable from '../components/RequestsTable';
import { analyticsAPI } from '../services/api';
import { useChat } from '../context/ChatContext';

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { handleSelectSession } = useChat();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard();
      setMetrics(response.data.metrics || {});
      setRecentRequests(response.data.recentRequests || []);
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          <span className="text-sm ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-card border border-red-500/20 rounded-xl p-4 text-red-300 bg-red-500/8 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const metricCards = [
    { title: 'AI Responses', value: metrics?.totalRequests ?? 0, icon: Activity, color: 'text-neon-cyan' },
    { title: 'Total Sessions', value: metrics?.totalSessions ?? 0, icon: MessageSquare, color: 'text-neon-purple' },
    { title: 'Total Models', value: metrics?.totalModels ?? metrics?.activeModels ?? 0, icon: Cpu, color: 'text-amber-400' },
    { title: 'Active Models', value: metrics?.activeModels ?? 0, icon: Database, color: 'text-neon-cyan' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
            System Hub
          </h1>
          <p className="text-neon-cyan/50 mt-1.5 text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            ALL NODES NOMINAL
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metricCards.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="glass-card p-5 glass-hover group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{m.title}</span>
                  <span className={`p-2 bg-obsidian rounded-lg border border-white/5 group-hover:border-white/15 transition-colors ${m.color}`}>
                    <Icon size={16} />
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-100">{m.value}</div>
              </div>
            );
          })}
        </div>

        {/* Model Usage Breakdown */}
        {metrics?.modelUsage && Object.keys(metrics.modelUsage).length > 0 && (
          <div className="glass-card p-5 rounded-2xl mb-8">
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-gray-500 mb-4">
              Model Usage Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(metrics.modelUsage).map(([model, count]) => (
                <div key={model} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                  <span className="text-xs text-gray-300 truncate mr-2">{model}</span>
                  <span className="text-xs font-bold text-neon-cyan">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orchestration Activity */}
        <div className="glass-card p-5 rounded-2xl">
          <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-gray-500 mb-4">
            Agent Orchestration Activity
          </h2>
          <RequestsTable
            requests={recentRequests}
            onOpenSession={handleSelectSession}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
