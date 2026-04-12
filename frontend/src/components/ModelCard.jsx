import {
  CheckCircle,
  XCircle,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react";

function ModelCard({ model }) {
  return (
    <div className="glass-card p-6 hover:shadow-lg transition-all">
      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-100">{model.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{model.provider}</p>
        </div>

        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            model.status === "active"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}
        >
          {model.status === "active" ? (
            <CheckCircle size={14} />
          ) : (
            <XCircle size={14} />
          )}
          {model.status}
        </div>
      </div>

      {/* Status Reason - Show if unavailable */}
      {model.status === "unavailable" && model.statusReason && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-400 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-300">
              {model.statusReason}
            </p>
            <p className="text-xs text-amber-300/80 mt-1">
              Add API key in backend/.env to activate
            </p>
          </div>
        </div>
      )}

      {/* Capabilities */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-widest">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {model.capabilities.map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-neon-cyan/10 text-neon-cyan text-xs rounded border border-neon-cyan/20"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="bg-neon-purple/10 p-2 rounded border border-neon-purple/20">
            <DollarSign size={16} className="text-neon-purple" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Cost/1K tokens</p>
            <p className="text-sm font-bold text-gray-200">
              ${model.costPer1k}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-yellow-400/10 p-2 rounded border border-yellow-400/20">
            <Zap size={16} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Latency</p>
            <p className="text-sm font-bold text-gray-200">
              {model.avgLatency}ms
            </p>
          </div>
        </div>

        {/* Rate Limit Display */}
        <div className="flex items-center gap-2">
          <div className="bg-neon-cyan/10 p-2 rounded border border-neon-cyan/20">
            <span className="text-neon-cyan text-xs font-bold">RPM</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Rate Limit</p>
            <p className="text-sm font-bold text-gray-200">
              {model.rateLimit?.rpm || "N/A"}/min
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelCard;
