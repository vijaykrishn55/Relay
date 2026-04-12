import { X, CornerDownRight } from 'lucide-react'

function RelayChip({ relayContext, onClear }) {
  if (!relayContext) return null

  // Show a truncated preview of the relayed response
  const responsePreview = relayContext.originalResponse
    ? (relayContext.originalResponse.length > 100
      ? relayContext.originalResponse.substring(0, 100) + '...'
      : relayContext.originalResponse)
    : 'AI response'

  const questionPreview = relayContext.originalQuestion
    ? (relayContext.originalQuestion.length > 60
      ? relayContext.originalQuestion.substring(0, 60) + '...'
      : relayContext.originalQuestion)
    : null

  return (
    <div className="flex items-center gap-2 px-3 py-2 glass-card border border-neon-cyan/30 rounded-xl text-sm bg-neon-cyan/10">
      <CornerDownRight size={14} className="text-neon-cyan flex-shrink-0 drop-shadow-[0_0_6px_rgba(0,242,255,0.3)]" />
      <div className="flex-1 min-w-0">
        <span className="text-neon-cyan font-medium text-xs uppercase tracking-wider drop-shadow-[0_0_4px_rgba(0,242,255,0.2)]">
          Relay: Follow-Up / New Session
        </span>
        {questionPreview && (
          <p className="text-gray-500 text-[10px] truncate mt-0.5">
            Re: "{questionPreview}"
          </p>
        )}
        <p className="text-gray-300 text-xs truncate mt-0.5">{responsePreview}</p>
      </div>
      <button
        onClick={onClear}
        className="p-1 rounded-md hover:bg-neon-cyan/20 text-neon-cyan hover:text-neon-cyan transition-colors flex-shrink-0"
        title="Cancel relay"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default RelayChip
