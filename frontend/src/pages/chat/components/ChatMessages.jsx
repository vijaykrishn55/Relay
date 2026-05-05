import { useState, useEffect } from 'react';
import { GitBranch, Sparkles, ArrowDown } from 'lucide-react';
import MessageBubble from '../../../components/MessageBubble';
import ContextBanner from './ContextBanner';

/**
 * ChatMessages
 * The scrollable message list area. Renders:
 *  - ContextBanner (parent-session context, if any)
 *  - Empty-state illustration (when no messages yet)
 *  - One MessageBubble per message
 *  - Typing indicator while loading
 *  - invisible bottomRef sentinel for auto-scroll
 *  - Floating scroll-to-bottom button when scrolled up
 */
function ChatMessages({
  messages,
  loading,
  bottomRef,
  containerRef,
  contextMessages,
  contextCollapsed,
  onToggleContext,
  selectionMode,
  selectedIndices,
  onToggleSelect,
  relayContext,
  onRegenerate,
  onEdit,
  onRelay,
}) {
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Track whether the user has scrolled away from the bottom
  useEffect(() => {
    const sentinel = bottomRef?.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { root: containerRef?.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [bottomRef, containerRef, messages]);

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  };

  // The outer wrapper is non-scrolling + relative — the button anchors to it.
  // The inner div is the actual scrollable area.
  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">

          {/* Context from parent session */}
          <ContextBanner
            contextMessages={contextMessages}
            collapsed={contextCollapsed}
            onToggle={onToggleContext}
          />

          {/* Empty state */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                <Sparkles size={22} className="text-neon-cyan/70" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-200">Start a conversation</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-sm">
                  Ask anything. Relay will route your question to the best available model.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                index={index}
                isLast={index === messages.length - 1}
                isLastAssistant={message.role === 'assistant' && index === messages.length - 1}
                onRegenerate={() => onRegenerate(message.id)}
                onEdit={(content) => onEdit(message.id, content)}
                onRelay={() => onRelay(index)}
                isRelayTarget={relayContext?.targetIndex === index}
                selectionMode={selectionMode}
                isSelected={selectedIndices.has(index)}
                onToggleSelect={onToggleSelect}
              />
            ))
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-center gap-3 py-4 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                <GitBranch size={13} className="text-neon-cyan" />
              </div>
              <div className="flex gap-1.5 items-center">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating scroll-to-bottom button — anchored to the non-scrolling wrapper */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
                     w-9 h-9 rounded-full
                     bg-white/10 backdrop-blur-md border border-white/10
                     flex items-center justify-center
                     text-gray-400 hover:text-white hover:bg-white/15
                     shadow-lg shadow-black/30
                     transition-all duration-200 animate-fade-in"
          title="Scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
}

export default ChatMessages;
