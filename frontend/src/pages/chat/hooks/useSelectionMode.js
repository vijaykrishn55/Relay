import { useState, useCallback } from 'react';
import { useChat } from '../../../context/ChatContext';
import { memoryAPI, sessionsAPI } from '../../../services/api';

/**
 * useSelectionMode
 * Manages the multi-select overlay: toggling selection mode, tracking which
 * message indices are selected, saving selected messages to Memory, and
 * creating a new session with selected messages as context.
 */
export function useSelectionMode(messages, activeSessionId) {
  const { handleSelectSession, fetchSessions, setError } = useChat();

  const [selectionMode, setSelectionMode]     = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedIndices(new Set());
  }, []);

  const handleToggleSelect = useCallback((index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Save the selected messages as Memory entries
  const handleSaveToMemory = useCallback(async () => {
    const selected = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => messages[i])
      .filter(Boolean);

    if (selected.length === 0) return;

    try {
      for (const msg of selected) {
        await memoryAPI.create({
          content: msg.content,
          source_session_id: activeSessionId,
          source_message_index: messages.indexOf(msg),
          tags: [msg.role],
        });
      }
      setSelectionMode(false);
      setSelectedIndices(new Set());
      setError('');
      alert(`${selected.length} message(s) saved to memory!`);
    } catch (err) {
      console.error('Failed to save to memory:', err);
      setError('Failed to save messages to memory.');
    }
  }, [selectedIndices, messages, activeSessionId, setError]);

  // Branch into a new session using selected messages as its context
  const handleStartContextSession = useCallback(async () => {
    const ctxMessages = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => messages[i])
      .filter(Boolean)
      .map(m => ({ role: m.role, content: m.content, model: m.model || null }));

    if (ctxMessages.length === 0) return;

    try {
      const res = await sessionsAPI.createWithContext(ctxMessages, activeSessionId);
      setSelectionMode(false);
      setSelectedIndices(new Set());
      handleSelectSession(res.data.id);
      fetchSessions();
    } catch (err) {
      console.error('Failed to create context session:', err);
      setError('Failed to create new session with context.');
    }
  }, [selectedIndices, messages, activeSessionId, handleSelectSession, fetchSessions, setError]);

  return {
    selectionMode,
    selectedIndices,
    toggleSelectionMode,
    handleToggleSelect,
    handleSaveToMemory,
    handleStartContextSession,
  };
}
