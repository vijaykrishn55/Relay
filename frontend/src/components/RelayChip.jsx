import { X, CornerDownRight } from 'lucide-react'

function RelayChip({ targetMessage, onClear }) {
  if (!targetMessage) return null

  // Show a truncated preview of the relayed response
  const preview = targetMessage.content.length > 80
    ? targetMessage.content.substring(0, 80) + '...'
    : targetMessage.content

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
      <CornerDownRight size={14} className="text-indigo-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-indigo-600 font-medium text-xs uppercase tracking-wider">
          Relay: Follow-Up
        </span>
        <p className="text-indigo-800 text-xs truncate mt-0.5">{preview}</p>
      </div>
      <button
        onClick={onClear}
        className="p-1 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors flex-shrink-0"
        title="Cancel relay"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default RelayChip
