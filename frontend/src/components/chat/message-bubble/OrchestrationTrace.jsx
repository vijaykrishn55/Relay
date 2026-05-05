import { useState } from 'react';

/**
 * OrchestrationTrace
 * Collapsible "🐝 Hive Process" panel that visualises the orchestration
 * pipeline phases for an assistant message that was processed by the Hive
 * Orchestrator.
 *
 * Props:
 *   orchestration – the `result.orchestration` object from the backend
 *   metrics       – the `result.metrics` object (contains pipelineLatency)
 */
function OrchestrationTrace({ orchestration, metrics }) {
  const [open, setOpen] = useState(false);
  if (!orchestration) return null;

  const {
    mode, isComplex, sentiment, triageReason, subtasks,
    modelsUsed, assemblerModel,
    decompositionTurns, executionBatches, failedSubtasks,
  } = orchestration;

  const isFull = mode === 'full-pipeline';
  const isFast = mode === 'fast-path';

  const totalModels = modelsUsed?.length || 1;
  const totalTasks  = subtasks?.length || 0;

  // Prefer metrics.pipelineLatency; fall back to orchestration-level field
  const latencyMs    = metrics?.pipelineLatency || orchestration.pipelineLatency;
  const latencyLabel = latencyMs ? `${(latencyMs / 1000).toFixed(1)}s` : null;

  // One-line summary always shown in the collapsed header
  const summary = isFull
    ? `${totalTasks} tasks · ${totalModels} models${latencyLabel ? ` · ${latencyLabel}` : ''}`
    : isFast
    ? `Fast path · ${modelsUsed?.[0] || 'Auto'}${latencyLabel ? ` · ${latencyLabel}` : ''}`
    : `${mode}${latencyLabel ? ` · ${latencyLabel}` : ''}`;

  return (
    <div className="mt-3 border-t border-white/5 pt-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors group w-full text-left min-w-0"
      >
        <span className="text-base leading-none shrink-0">🐝</span>
        <span className="font-medium shrink-0">Hive Process</span>
        <span className="text-gray-600 ml-1 truncate min-w-0" title={summary}>{summary}</span>
        <span className={`ml-auto shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="mt-2 space-y-1.5 text-[11px] border-l-2 border-white/5 ml-2 pl-3 animate-fade-in">

          {/* Sentiment */}
          {sentiment && (
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-base leading-none mt-[-1px] shrink-0">😊</span>
              <div className="min-w-0">
                <span className="text-gray-400 font-medium shrink-0">Sentiment</span>
                <span className="ml-1.5 text-gray-500 truncate inline-block max-w-[calc(100%-5rem)] align-bottom" title={`${sentiment.sentiment}${sentiment.intensity ? ` (${sentiment.intensity})` : ''}${sentiment.confidence != null ? ` · ${Math.round(sentiment.confidence * 100)}%` : ''}`}>
                  {sentiment.sentiment}
                  {sentiment.intensity    ? ` (${sentiment.intensity})` : ''}
                  {sentiment.confidence != null ? ` · ${Math.round(sentiment.confidence * 100)}%` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Triage */}
          {triageReason && (
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-base leading-none mt-[-1px] shrink-0">📋</span>
              <div className="min-w-0 flex-1">
                <span className="text-gray-400 font-medium shrink-0">Triage</span>
                <span className="ml-1.5 text-gray-500 truncate block" title={`${isComplex ? 'Complex' : 'Simple'} — ${triageReason}`}>
                  {isComplex ? 'Complex' : 'Simple'} — {triageReason}
                </span>
              </div>
            </div>
          )}

          {/* Fast-path shortcut */}
          {isFast && modelsUsed && (
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-[-1px]">⚡</span>
              <div>
                <span className="text-gray-400 font-medium">Fast Path</span>
                <span className="ml-1.5 text-gray-500">
                  Routed to <span className="text-neon-cyan">{modelsUsed[0]}</span>
                </span>
              </div>
            </div>
          )}

          {/* Decomposition */}
          {isFull && subtasks && subtasks.length > 0 && (
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-base leading-none mt-[-1px] shrink-0">🔨</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-400 font-medium">Decomposed</span>
                <span className="ml-1.5 text-gray-500">{subtasks.length} subtasks</span>
                {decompositionTurns && (
                  <span className="ml-1.5 text-gray-600">({decompositionTurns} turns)</span>
                )}
                <div className="mt-1 space-y-0.5">
                  {subtasks.map((st, i) => (
                    <div key={st.id || i} className="flex items-center gap-1.5 ml-2 min-w-0">
                      <span className="text-gray-600 shrink-0">├─</span>
                      <span className={`font-mono text-[10px] uppercase tracking-wide shrink-0 ${
                        st.type === 'code'     ? 'text-amber-400/70'    :
                        st.type === 'analysis' ? 'text-neon-purple/70'  :
                        'text-gray-600'
                      }`}>{st.type}</span>
                      <span className="text-gray-500 truncate flex-1 min-w-0" title={st.description}>{st.description}</span>
                      {st.model && (
                        <span className="text-neon-cyan/60 text-[10px] shrink-0">→ {st.model}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Execution */}
          {isFull && executionBatches != null && (
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-[-1px]">🚀</span>
              <div>
                <span className="text-gray-400 font-medium">Executed</span>
                <span className="ml-1.5 text-gray-500">
                  {executionBatches} batches
                  {failedSubtasks?.length > 0 && (
                    <span className="ml-1.5 text-red-400">{failedSubtasks.length} failed</span>
                  )}
                </span>
                {(() => {
                  // Merge modelsUsed + subtask models, deduplicate
                  const subtaskModels = (subtasks || []).map(st => st.model).filter(Boolean);
                  const execModels = [...new Set([...(modelsUsed || []), ...subtaskModels])];
                  return execModels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-2">
                      {execModels.map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400">{m}</span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Assembly */}
          {isFull && assemblerModel && (
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-[-1px]">🎨</span>
              <div>
                <span className="text-gray-400 font-medium">Assembled by</span>
                <span className="ml-1.5 text-neon-cyan">{assemblerModel}</span>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default OrchestrationTrace;
