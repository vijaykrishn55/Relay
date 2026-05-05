/**
 * ModeStatusBar
 * Small status indicators shown under the input form when Relay or Hive is active.
 * Each indicator is a pulsing dot + label.
 */
function ModeStatusBar({ relayContext, hiveMode }) {
  if (!relayContext && !hiveMode) return null;

  return (
    <div className="flex items-center gap-3 mt-1.5 px-1 animate-fade-in">
      {relayContext && (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-[11px] text-neon-cyan/80">
            Relay — follow-up or new session from this response
          </span>
        </div>
      )}
      {hiveMode && (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
          <span className="text-[11px] text-neon-purple/80">
            Hive Orchestra — multi-model pipeline
          </span>
        </div>
      )}
    </div>
  );
}

export default ModeStatusBar;
