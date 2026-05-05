import { Cpu, Filter, Globe } from 'lucide-react';

/** Three stat cards: Total Models / Showing / Providers. */
function ModelsStats({ totalModels, showingCount, providerCount }) {
  const stats = [
    { label: 'Total Models', value: totalModels,  icon: Cpu,    color: 'text-neon-cyan',   ring: 'border-neon-cyan/20',   bg: 'bg-neon-cyan/10'   },
    { label: 'Showing',      value: showingCount,  icon: Filter, color: 'text-emerald-400', ring: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { label: 'Providers',    value: providerCount, icon: Globe,  color: 'text-neon-purple', ring: 'border-neon-purple/20', bg: 'bg-neon-purple/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map(({ label, value, icon: Icon, color, ring, bg }) => (
        <div key={label} className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center border ${ring}`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ModelsStats;
