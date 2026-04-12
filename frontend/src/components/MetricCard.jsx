function MetricCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-100 mt-2">{value}</h3>
        </div>
        {Icon && (
          <div className="bg-neon-cyan/10 p-3 rounded-lg border border-neon-cyan/20">
            <Icon className="text-neon-cyan drop-shadow-[0_0_5px_rgba(0,242,255,0.4)]" size={24}></Icon>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
