import RequestsTable from '../../../components/RequestsTable';

/**
 * OrchestrationActivity
 * Section card wrapping the recent requests table.
 */
function OrchestrationActivity({ recentRequests, onOpenSession }) {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-gray-500 mb-4">
        Agent Orchestration Activity
      </h2>
      <RequestsTable requests={recentRequests} onOpenSession={onOpenSession} />
    </div>
  );
}

export default OrchestrationActivity;
