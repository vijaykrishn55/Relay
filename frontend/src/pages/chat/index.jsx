import { useState, useRef, useEffect, useCallback } from 'react';

import { useChatSession }    from './hooks/useChatSession';
import { useRelayMode }      from './hooks/useRelayMode';
import { useSelectionMode }  from './hooks/useSelectionMode';
import { useMessageActions } from './hooks/useMessageActions';

import ChatWelcome       from './components/ChatWelcome';
import SelectionHeader   from './components/SelectionHeader';
import SelectionActionBar from './components/SelectionActionBar';
import ChatMessages      from './components/ChatMessages';
import ChatInputBox      from './components/ChatInputBox';

import { useChat } from '../../context/ChatContext';

/**
 * Chat — page entry point (~80 lines of wiring, zero business logic)
 *
 * All state is owned by the four hooks below; all UI is rendered by the
 * five components below.  This file is responsible only for:
 *  1. Instantiating hooks and passing data between them
 *  2. Deciding which top-level sections to show
 */
function Chat() {
  const { error, handleNewChat, input, setInput } = useChat();

  // ── Refs ────────────────────────────────────────────────────────────────
  const containerRef  = useRef(null);
  const textareaRef   = useRef(null);

  // ── Local UI state ──────────────────────────────────────────────────────
  const [selectedModel,     setSelectedModel]     = useState('');
  const [selectedModelName, setSelectedModelName] = useState('Auto');
  const [hiveMode,          setHiveMode]           = useState(false);

  // ── Session hook ────────────────────────────────────────────────────────
  const session = useChatSession(containerRef);
  const {
    messages, activeSessionId,
    loading, bottomRef,
    contextMessages, contextCollapsed, toggleContextCollapsed,
    fetchSessions, handleSelectSession,
  } = session;

  // ── Relay hook ──────────────────────────────────────────────────────────
  const relay = useRelayMode(messages, loading, setHiveMode, textareaRef);
  const { relayContext, clearRelayState, handleRelayFromMessage, handleRelayLastMessage } = relay;

  // ── Selection hook ──────────────────────────────────────────────────────
  const sel = useSelectionMode(messages, activeSessionId);
  const {
    selectionMode, selectedIndices,
    toggleSelectionMode, handleToggleSelect,
    handleSaveToMemory, handleStartContextSession,
  } = sel;

  // ── Message actions hook ────────────────────────────────────────────────
  const { handleSendMessage, handleEditMessage, handleRegenerateMessage } =
    useMessageActions(input, setInput, activeSessionId, selectedModel, hiveMode, relayContext, clearRelayState, textareaRef);

  // ── Auto-focus textarea when session changes ────────────────────────────
  useEffect(() => { textareaRef.current?.focus(); }, [activeSessionId]);

  // ── Textarea auto-resize ────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
  }, [handleSendMessage]);

  // ── Hive toggle — mutually exclusive with relay ─────────────────────────
  const handleHiveToggle = useCallback(() => {
    if (loading) return;
    setHiveMode(prev => { if (!prev) clearRelayState(); return !prev; });
  }, [loading, clearRelayState]);

  // ── No active session → welcome screen ─────────────────────────────────
  if (!activeSessionId) return <ChatWelcome onNewChat={handleNewChat} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Selection mode top bar */}
      {selectionMode && (
        <SelectionHeader
          selectedCount={selectedIndices.size}
          onCancel={toggleSelectionMode}
        />
      )}

      {/* Scrollable message list */}
      <ChatMessages
        messages={messages}
        loading={loading}
        bottomRef={bottomRef}
        containerRef={containerRef}
        contextMessages={contextMessages}
        contextCollapsed={contextCollapsed}
        onToggleContext={toggleContextCollapsed}
        selectionMode={selectionMode}
        selectedIndices={selectedIndices}
        onToggleSelect={handleToggleSelect}
        relayContext={relayContext}
        onRegenerate={handleRegenerateMessage}
        onEdit={handleEditMessage}
        onRelay={handleRelayFromMessage}
      />

      {/* Selection action bar (only when messages are selected) */}
      {selectionMode && (
        <SelectionActionBar
          selectedCount={selectedIndices.size}
          onSaveToMemory={handleSaveToMemory}
          onStartContextSession={handleStartContextSession}
        />
      )}

      {/* Input area (hidden in selection mode) */}
      {!selectionMode && (
        <ChatInputBox
          input={input}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          loading={loading}
          onSubmit={handleSendMessage}
          relayContext={relayContext}
          onClearRelay={clearRelayState}
          onRelayLast={handleRelayLastMessage}
          hiveMode={hiveMode}
          onHiveToggle={handleHiveToggle}
          selectedModel={selectedModel}
          selectedModelName={selectedModelName}
          onModelChange={(val, name) => { setSelectedModel(val); setSelectedModelName(name || 'Auto'); }}
          messages={messages}
          error={error}
          selectionMode={selectionMode}
          onToggleSelectionMode={toggleSelectionMode}
          sessionId={activeSessionId}
        />
      )}
    </div>
  );
}

export default Chat;
