import { Send, GitBranch, CornerDownRight, CheckSquare, AlertCircle } from 'lucide-react';
import ModelDropdown from '../../../components/ModelDropdown';
import ContextMeter from '../../../components/ContextMeter';
import RelayChip from '../../../components/RelayChip';
import ModeStatusBar from './ModeStatusBar';

/**
 * ChatInputBox
 * The entire bottom input area: error banner, relay chip, the textarea,
 * the controls row (model picker, context meter, action buttons), and the
 * mode status dots below the form.
 */
function ChatInputBox({
  // text input
  input, onInputChange, onKeyDown, textareaRef, loading,
  // form submit
  onSubmit,
  // relay
  relayContext, onClearRelay, onRelayLast,
  // hive
  hiveMode, onHiveToggle,
  // model selection
  selectedModel, selectedModelName, onModelChange,
  // messages (for context meter + relay button visibility check)
  messages,
  // error
  error,
  // selection mode
  selectionMode, onToggleSelectionMode,
  // session
  sessionId,
}) {
  const hasAssistantMessage = messages.some(m => m.role === 'assistant');

  return (
    <div className="flex-shrink-0 border-t border-white/5 bg-obsidian/90 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto px-4 py-3">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 animate-fade-in mb-2">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={15} />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Relay chip — shown when a message is targeted */}
        {relayContext && (
          <div className="mb-2">
            <RelayChip relayContext={relayContext} onClear={onClearRelay} />
          </div>
        )}

        {/* Main input container */}
        <form onSubmit={onSubmit}>
          <div className="rounded-2xl border border-white/8 bg-surface-low/80 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] focus-within:border-white/15 transition-colors relative z-20">

            {/* Textarea row */}
            <div className="px-4 pt-3 pb-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                placeholder={
                  relayContext
                    ? "Type a follow-up to refine, or say 'start new session about [topic]'..."
                    : 'Ask anything...'
                }
                rows={1}
                className="w-full bg-transparent resize-none text-sm text-gray-100 placeholder-gray-500/60 focus:outline-none disabled:opacity-50 max-h-[200px]"
                disabled={loading}
                style={{ height: 'auto' }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between px-3 py-2">
              {/* Left: model selector */}
              <div className="w-40">
                <ModelDropdown
                  value={selectedModel}
                  onChange={(val, name) => onModelChange(val, name)}
                  disabled={loading}
                  compact
                />
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1">
                {/* Context meter */}
                <ContextMeter
                  messages={messages}
                  modelName={selectedModelName}
                  relayMode={!!relayContext || hiveMode}
                  sessionId={sessionId}
                />

                {/* Selection mode toggle */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onToggleSelectionMode}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                    title="Select messages"
                  >
                    <CheckSquare size={16} />
                  </button>
                )}

                {/* Relay toggle */}
                {hasAssistantMessage && (
                  <button
                    type="button"
                    onClick={onRelayLast}
                    disabled={loading}
                    className={`p-2 rounded-xl transition-all ${
                      relayContext
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                        : 'text-gray-500 hover:text-neon-cyan hover:bg-neon-cyan/10'
                    } disabled:opacity-40`}
                    title={relayContext ? 'Cancel relay' : 'Relay — follow-up or branch from last response'}
                  >
                    <CornerDownRight size={16} />
                  </button>
                )}

                {/* Hive Orchestra toggle */}
                <button
                  type="button"
                  onClick={onHiveToggle}
                  disabled={loading}
                  className={`p-2 rounded-xl transition-all ${
                    hiveMode
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                      : 'text-gray-500 hover:text-neon-purple hover:bg-neon-purple/10'
                  } disabled:opacity-40`}
                  title={hiveMode ? 'Hive Orchestra (ON) — click to turn off' : 'Hive Orchestra — multi-model pipeline'}
                >
                  <GitBranch size={16} />
                </button>

                {/* Send */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/25 disabled:opacity-30 disabled:border-white/5 disabled:text-gray-600 disabled:bg-transparent transition-all"
                  title="Send (Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Mode status dots below the box */}
          <ModeStatusBar relayContext={relayContext} hiveMode={hiveMode} />
        </form>
      </div>
    </div>
  );
}

export default ChatInputBox;
