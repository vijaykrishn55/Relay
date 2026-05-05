/**
 * ModelUsageList
 * Grid showing how many requests each model handled.
 * Only rendered when modelUsage data exists.
 */
function ModelUsageList({ modelUsage }) {
  if (!modelUsage || Object.keys(modelUsage).length === 0) return null;

  return (
    <div className="glass-card p-5 rounded-2xl mb-8">
      <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-gray-500 mb-4">
        Model Usage Breakdown
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(modelUsage).map(([model, count]) => (
          <div key={model} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
            <span className="text-xs text-gray-300 truncate mr-2">{model}</span>
            <span className="text-xs font-bold text-neon-cyan">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ModelUsageList;
