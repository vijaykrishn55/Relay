import { useCallback } from 'react';
import { useChat } from '../../../context/ChatContext';
import { aiAPI, relayAPI, sessionsAPI } from '../../../services/api';

/**
 * useMessageActions
 * Owns the three message mutation operations: send, edit, and regenerate.
 * All three interact with the backend and update the local message list via
 * `setMessages` from ChatContext.
 *
 * @param {string}   input           – current textarea value
 * @param {Function} setInput         – setter to clear the textarea after send
 * @param {string}   activeSessionId
 * @param {string}   selectedModel     – the model ID selected in the dropdown
 * @param {boolean}  hiveMode
 * @param {object}   relayContext      – from useRelayMode
 * @param {Function} clearRelayState   – from useRelayMode
 * @param {object}   textareaRef       – ref to the textarea (for re-focus after send)
 */
export function useMessageActions(
  input,
  setInput,
  activeSessionId,
  selectedModel,
  hiveMode,
  relayContext,
  clearRelayState,
  textareaRef,
) {
  const {
    messages, setMessages,
    setLoading, setError,
    handleSelectSession, fetchSessions, loadSession,
  } = useChat();

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Optimistically add the user bubble
    const tempUserMsg = {
      id:        Date.now(),
      role:      'user',
      content:   userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      setLoading(true);

      if (relayContext) {
        // ── RELAY MODE ───────────────────────────────────────────────────
        const response = await relayAPI.smart({
          sessionId:           activeSessionId,
          userInput:           userMessage,
          targetMessageIndex:  relayContext.targetIndex,
          originalQuestion:    relayContext.originalQuestion,
          originalResponse:    relayContext.originalResponse,
        });

        const data = response.data;

        if (data.action === 'follow_up') {
          // Update the targeted assistant message in-place
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== tempUserMsg.id);
            const idx     = relayContext.targetIndex;
            if (idx >= 0 && idx < updated.length) {
              updated[idx] = {
                ...updated[idx],
                content:       data.output,
                model:         data.model,
                relayUpdated:  true,
                relayFollowUps: [
                  ...(updated[idx].relayFollowUps || []),
                  data.followUpQuestion || userMessage,
                ],
              };
            }
            return [...updated];
          });
          clearRelayState();

        } else if (data.action === 'new_session') {
          setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
          clearRelayState();
          if (data.error === 'no_matches') {
            setError(`No messages found matching topic: "${data.topic}". Try being more specific.`);
          } else if (data.newSession) {
            handleSelectSession(data.newSession.id);
            fetchSessions();
          }

        } else {
          const aiMessage = {
            id:            Date.now() + 1,
            role:          'assistant',
            content:       data.output || 'No response generated.',
            model:         data.model,
            timestamp:     new Date(),
            orchestration: data.orchestration || null,
          };
          setMessages(prev => [...prev, aiMessage]);
          clearRelayState();
        }

      } else {
        // ── NORMAL / HIVE MODE ───────────────────────────────────────────
        await aiAPI.process({
          sessionId: activeSessionId,
          input:     userMessage,
          modelId:   selectedModel || undefined,
          mode:      hiveMode ? 'hive' : undefined,
        });

        // Reload session from DB to get real message IDs.
        // The optimistic user bubble (tempUserMsg) has a fake Date.now() ID
        // that doesn't exist in the DB. Without reload, any subsequent
        // edit/regenerate would fail with "Message not found".
        await loadSession(activeSessionId);
      }

      fetchSessions(); // refresh sidebar so auto-title shows
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.response?.data?.error || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [
    input, activeSessionId, selectedModel, hiveMode, relayContext,
    setInput, setMessages, setLoading, setError,
    fetchSessions, handleSelectSession, clearRelayState, textareaRef, loadSession,
  ]);

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    if (!activeSessionId) return;
    try {
      setError('');
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return;

      const message = messages[msgIndex];

      // If it's a user message with a following assistant response,
      // delete both from DB and re-process with the edited content.
      // aiAPI.process creates fresh user + assistant records.
      if (message.role === 'user') {
        const nextAssistant = messages[msgIndex + 1];
        if (nextAssistant && nextAssistant.role === 'assistant') {
          setLoading(true);
          try {
            // Preserve hive mode if the original response used orchestration
            const wasHive = !!(nextAssistant.orchestration);

            // Delete both old messages from DB — process() will recreate them
            await sessionsAPI.deleteMessage(activeSessionId, nextAssistant.id);
            await sessionsAPI.deleteMessage(activeSessionId, messageId);

            await aiAPI.process({
              sessionId: activeSessionId,
              input:     newContent,
              modelId:   selectedModel || undefined,
              mode:      (hiveMode || wasHive) ? 'hive' : undefined,
            });

            // Reload session from DB to get fresh message IDs
            await loadSession(activeSessionId);
          } catch (regenErr) {
            console.error('Re-gen after edit failed:', regenErr);
            setError('Message edited, but failed to regenerate response');
          } finally {
            setLoading(false);
          }
        } else {
          // No assistant response after this user message — just update in place
          await sessionsAPI.editMessage(activeSessionId, messageId, newContent);
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
        }
      } else {
        // Editing an assistant message — just update in place
        await sessionsAPI.editMessage(activeSessionId, messageId, newContent);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
      }
    } catch (err) {
      console.error('Edit error:', err);
      setError('Failed to update message');
    }
  }, [messages, activeSessionId, selectedModel, hiveMode, setMessages, setError, setLoading, loadSession]);

  // ── Regenerate ───────────────────────────────────────────────────────────
  const handleRegenerateMessage = useCallback(async (messageId) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1 || !activeSessionId) return;

    try {
      setLoading(true);
      setError('');

      let userMsg = null;
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { userMsg = messages[i]; break; }
      }
      if (!userMsg) throw new Error('Could not find original user message');

      // Check if the original response used Hive orchestration
      const originalMsg = messages[msgIndex];
      const wasHive = !!(originalMsg.orchestration);

      await sessionsAPI.deleteMessage(activeSessionId, messageId);
      await sessionsAPI.deleteMessage(activeSessionId, userMsg.id);

      await aiAPI.process({
        sessionId: activeSessionId,
        input:     userMsg.content,
        modelId:   selectedModel || undefined,
        mode:      (hiveMode || wasHive) ? 'hive' : undefined,
      });

      // Reload session from DB to get fresh message IDs
      // (process creates new user + assistant records — old IDs are gone)
      await loadSession(activeSessionId);
    } catch (err) {
      console.error('Regenerate error:', err);
      setError('Failed to regenerate response');
    } finally {
      setLoading(false);
    }
  }, [messages, activeSessionId, selectedModel, hiveMode, setMessages, setLoading, setError, loadSession]);

  return { handleSendMessage, handleEditMessage, handleRegenerateMessage };
}
