import {
  CheckCircle,
  XCircle,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react";

function ModelCard({ model }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{model.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{model.provider}</p>
        </div>

        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            model.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
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
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-yellow-800">
              {model.statusReason}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Add API key in backend/.env to activate
            </p>
          </div>
        </div>
      )}

      {/* Capabilities */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 font-medium mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {model.capabilities.map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-purple-50 p-2 rounded">
            <DollarSign size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Cost/1K tokens</p>
            <p className="text-sm font-bold text-gray-800">
              ${model.costPer1k}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-yellow-50 p-2 rounded">
            <Zap size={16} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Latency</p>
            <p className="text-sm font-bold text-gray-800">
              {model.avgLatency}ms
            </p>
          </div>
        </div>

        {/* Rate Limit Display */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded">
            <span className="text-blue-600 text-xs font-bold">RPM</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rate Limit</p>
            <p className="text-sm font-bold text-gray-800">
              {model.rateLimit?.rpm || "N/A"}/min
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelCard;
