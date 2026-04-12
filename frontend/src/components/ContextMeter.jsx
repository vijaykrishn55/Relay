import { useState, useMemo, useEffect } from 'react';
import { modelsAPI } from '../services/api';

/**
 * Context Meter — circular SVG indicator showing context fill percentage.
 * 
 * - Shows actual context_window from models DB per model
 * - On Auto: shows average across all models
 * - On Relay/Hive (multi-model): shows combined context of top 5 models
 */
function ContextMeter({ messages = [], modelName = 'Auto', relayMode = false }) {
  const [allModels, setAllModels] = useState([]);
  const [hover, setHover] = useState(false);

  // Fetch real context windows from the models API
  useEffect(() => {
    modelsAPI.getAll().then(res => {
      setAllModels(res.data || []);
    }).catch(() => {});
  }, []);

  const estimation = useMemo(() => {
    let maxTokens = 32000;
    let label = modelName || 'Auto';

    if (relayMode && allModels.length > 0) {
      // Relay/Hive: combined context of top 5 models by context_window
      const sorted = [...allModels]
        .filter(m => m.context_window)
        .sort((a, b) => b.context_window - a.context_window)
        .slice(0, 5);
      maxTokens = sorted.reduce((sum, m) => sum + m.context_window, 0);
      label = `Relay (${sorted.length} models)`;
    } else if (modelName === 'Auto' && allModels.length > 0) {
      // Auto: average context window across all active models
      const active = allModels.filter(m => m.context_window && m.status === 'active');
      if (active.length > 0) {
        maxTokens = Math.round(active.reduce((sum, m) => sum + m.context_window, 0) / active.length);
      }
    } else if (allModels.length > 0) {
      // Specific model: use its exact context_window from DB
      const found = allModels.find(m => m.name === modelName);
      if (found?.context_window) {
        maxTokens = found.context_window;
      }
    }

    // Count tokens in all messages
    let totalChars = 0;
    for (const msg of messages) {
      totalChars += (msg.content || '').length;
    }
    // System prompt overhead
    totalChars += 500;
    // Relay adds extra context
    if (relayMode) totalChars += 800;

    const usedTokens = Math.round(totalChars / 4);
    const percentage = Math.min(100, Math.round((usedTokens / maxTokens) * 100));

    return { usedTokens, maxTokens, percentage, label };
  }, [messages, modelName, allModels, relayMode]);

  const { percentage, usedTokens, maxTokens, label } = estimation;

  // Color based on fill
  const color = percentage <= 60 ? '#22c55e' : percentage <= 85 ? '#f59e0b' : '#ef4444';

  // SVG arc math
  const size = 28;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const formatTokens = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className="context-meter-ring"
        />
      </svg>
      <span className="absolute text-[7px] font-bold" style={{ color }}>
        {percentage}
      </span>

      {hover && (
        <div
          className="absolute bottom-full mb-2 right-0 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50 animate-fade-in"
          style={{ background: 'rgba(21,21,23,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="font-semibold text-gray-200 mb-1">{label}</div>
          <div className="text-gray-400">
            {formatTokens(usedTokens)} / {formatTokens(maxTokens)} tokens
          </div>
          {relayMode && (
            <div className="text-neon-purple text-[10px] mt-0.5">Combined top 5 model windows</div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span style={{ color }}>{percentage}% used</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextMeter;
