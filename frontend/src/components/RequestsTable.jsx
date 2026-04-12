import { ExternalLink } from 'lucide-react';

function RequestsTable({ requests, onOpenSession }) {
  if (!requests || requests.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500 text-sm">No activity yet. Start a chat!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Query</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Model</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            {onOpenSession && (
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Session</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/3">
          {requests.map((request, index) => (
            <tr key={index} className="hover:bg-white/3 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{request.time}</td>
              <td className="px-4 py-3 text-xs text-gray-300 max-w-[200px] truncate">{request.question || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300 font-medium max-w-[180px] truncate">{request.model || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                {request.latency ? `${request.latency}ms` : '—'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                  request.status === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                    : request.status === 'partial'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    : request.status === 'fallback'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                    : 'bg-red-500/15 text-red-300 border-red-500/20'
                }`}>
                  {request.status}
                </span>
              </td>
              {onOpenSession && (
                <td className="px-4 py-3 whitespace-nowrap">
                  {request.sessionId ? (
                    <button
                      onClick={() => onOpenSession(request.sessionId)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                      title="Open session"
                    >
                      <ExternalLink size={13} />
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RequestsTable;
