import { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import { useChat } from '../../context/ChatContext';
import DashboardHeader       from './components/DashboardHeader';
import DashboardStats        from './components/DashboardStats';
import ModelUsageList        from './components/ModelUsageList';
import OrchestrationActivity from './components/OrchestrationActivity';

function Dashboard() {
  const [metrics,         setMetrics]         = useState(null);
  const [recentRequests,  setRecentRequests]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const { handleSelectSession } = useChat();

  useEffect(() => { fetchDashboardData(); }, []);

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
        <div className="glass-card border border-red-500/20 rounded-xl p-4 text-red-300 bg-red-500/8 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <DashboardHeader />
        <DashboardStats metrics={metrics} />
        <ModelUsageList modelUsage={metrics?.modelUsage} />
        <OrchestrationActivity recentRequests={recentRequests} onOpenSession={handleSelectSession} />
      </div>
    </div>
  );
}

export default Dashboard;
