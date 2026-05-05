import { useState, useMemo, useEffect, useRef } from 'react';
import { modelsAPI, aiAPI } from '../services/api';

/**
 * Context Meter — circular SVG indicator showing context fill percentage.
 *
 * - Fetches real system context size from the backend (memory, profile, summaries)
 * - Auto: average context window across all active models
 * - Specific model: that model's exact context window from DB
 * - Hive / Relay mode: uses the MAXIMUM context window (system ceiling)
 */
function ContextMeter({ messages = [], modelName = 'Auto', relayMode = false, sessionId = null }) {
  const [allModels, setAllModels] = useState([]);
  const [hover, setHover] = useState(false);
  const [serverContext, setServerContext] = useState(null);
  const lastFetchRef = useRef(null);

  // Fetch real context windows from the models API
  useEffect(() => {
    modelsAPI.getAll().then(res => {
      setAllModels(res.data || []);
    }).catch(() => {});
  }, []);

  // Fetch real system context size from backend (debounced per session + message count)
  useEffect(() => {
    if (!sessionId) {
      setServerContext(null);
      return;
    }

    // Debounce: don't fetch more than once per 3 seconds for the same session
    const fetchKey = `${sessionId}-${messages.length}`;
    if (lastFetchRef.current === fetchKey) return;

    const timer = setTimeout(() => {
      lastFetchRef.current = fetchKey;
      aiAPI.getContextInfo(sessionId)
        .then(res => {
          if (res.data?.success) {
            setServerContext(res.data);
          }
        })
        .catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [sessionId, messages.length]);

  const estimation = useMemo(() => {
    let maxTokens = 32000;
    let label = modelName || 'Auto';
    let modeLabel = '';

    const activeModels = allModels.filter(m => m.contextWindow && m.status === 'active');

    if (relayMode && activeModels.length > 0) {
      // Relay / Hive: use the maximum context window in the system
      const maxModel = activeModels.reduce(
        (best, m) => (m.contextWindow > best.contextWindow ? m : best),
        activeModels[0]
      );
      maxTokens = maxModel.contextWindow;
      label = `Relay / Hive`;
      modeLabel = `Max: ${maxModel.name} (${(maxModel.contextWindow / 1000).toFixed(0)}k)`;

    } else if ((!modelName || modelName === 'Auto') && activeModels.length > 0) {
      // Auto: average across all active models
      const sum = activeModels.reduce((acc, m) => acc + m.contextWindow, 0);
      maxTokens = Math.round(sum / activeModels.length);
      label = 'Auto (avg)';
      modeLabel = `Average of ${activeModels.length} models`;

    } else if (modelName && modelName !== 'Auto' && allModels.length > 0) {
      // Specific model: find by name, use its exact contextWindow
      const found = allModels.find(m => m.name === modelName);
      if (found?.contextWindow) {
        maxTokens = found.contextWindow;
        label = found.name;
        modeLabel = `Context: ${(found.contextWindow / 1000).toFixed(0)}k tokens`;
      }
    }

    // Use server-side data if available, otherwise estimate client-side
    let usedTokens;
    let messageTokens = 0;
    let systemTokens = 0;

    if (serverContext?.breakdown) {
      // Real data from the backend
      const b = serverContext.breakdown;
      messageTokens = Math.round(b.messageChars / 4);
      systemTokens = Math.round(b.systemContextChars / 4);
      usedTokens = serverContext.estimatedTokens;
    } else {
      // Fallback: client-side estimate
      let totalChars = 0;
      for (const msg of messages) {
        totalChars += (msg.content || '').length;
      }
      messageTokens = Math.round(totalChars / 4);
      // Estimate system context: memory(1000) + profile(500) + summary(1000) + conversation(2000)
      systemTokens = Math.round(4500 / 4);
      if (relayMode) systemTokens += Math.round(800 / 4);
      usedTokens = messageTokens + systemTokens;
    }

    const percentage = Math.min(100, Math.round((usedTokens / maxTokens) * 100));

    return { usedTokens, maxTokens, percentage, label, modeLabel, messageTokens, systemTokens };
  }, [messages, modelName, allModels, relayMode, serverContext]);

  const { percentage, usedTokens, maxTokens, label, modeLabel, messageTokens, systemTokens } = estimation;

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
          <div className="text-gray-500 text-[10px] mt-0.5">
            💬 Messages: {formatTokens(messageTokens)} · 🧠 System: {formatTokens(systemTokens)}
          </div>
          {modeLabel && (
            <div className={`text-[10px] mt-0.5 ${relayMode ? 'text-neon-purple' : 'text-neon-cyan'}`}>
              {modeLabel}
            </div>
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
