import { useState, useCallback } from 'react';
import { useChat } from '../../../context/ChatContext';

/**
 * useRelayMode
 * Owns all relay-related state: which assistant message is the current relay
 * target, building the relay context object, clearing it, and enforcing
 * mutual exclusivity with Hive mode.
 *
 * @param {object[]} messages        – current message list
 * @param {boolean}  loading         – whether a response is in flight
 * @param {Function} setHiveMode     – setter from the parent to turn Hive off
 * @param {object}   textareaRef     – ref to the input textarea (for focus)
 */
export function useRelayMode(messages, loading, setHiveMode, textareaRef) {
  const { setError } = useChat();

  // Shape: { targetIndex, targetId, originalQuestion, originalResponse } | null
  const [relayContext, setRelayContext] = useState(null);

  const clearRelayState = useCallback(() => {
    setRelayContext(null);
  }, []);

  /**
   * Activate relay targeting the assistant message at `msgIndex`.
   * If the same message is already targeted, this acts as a toggle (cancel).
   */
  const handleRelayFromMessage = useCallback((msgIndex) => {
    if (loading) {
      setError('Please wait for response to complete');
      return;
    }

    // Toggle off if re-clicking the same message
    if (relayContext && relayContext.targetIndex === msgIndex) {
      clearRelayState();
      return;
    }

    const targetMsg = messages[msgIndex];
    if (!targetMsg || targetMsg.role !== 'assistant') return;

    // Walk backwards to find the user question that preceded this response
    let originalQuestion = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        originalQuestion = messages[i].content;
        break;
      }
    }

    // Relay and Hive are mutually exclusive — turn Hive off
    setHiveMode(false);

    setRelayContext({
      targetIndex:      msgIndex,
      targetId:         targetMsg.id,
      originalQuestion: originalQuestion || '',
      originalResponse: targetMsg.content || '',
    });

    textareaRef.current?.focus();
  }, [messages, loading, relayContext, setHiveMode, clearRelayState, setError, textareaRef]);

  /**
   * Convenience: activate relay on the **last** assistant message in the list.
   * Used by the relay button in the input toolbar.
   */
  const handleRelayLastMessage = useCallback(() => {
    if (relayContext) {
      clearRelayState();
      return;
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        handleRelayFromMessage(i);
        break;
      }
    }
  }, [messages, relayContext, clearRelayState, handleRelayFromMessage]);

  return {
    relayContext,
    clearRelayState,
    handleRelayFromMessage,
    handleRelayLastMessage,
  };
}
