import { useState, useEffect, useCallback } from 'react';
import { useChat } from '../../../context/ChatContext';
import { sessionsAPI } from '../../../services/api';

/**
 * useChatSession
 * Manages session-level concerns: loading messages when the active session
 * changes, loading any context messages from a parent session, and
 * auto-scrolling the message list to the bottom after new messages arrive.
 *
 * Returns everything the Chat page needs regarding session state.
 */
export function useChatSession(containerRef) {
  const {
    messages, setMessages,
    loading,
    activeSessionId,
    handleNewChat, handleSelectSession,
    fetchSessions, loadSession,
    bottomRef,
  } = useChat();

  const [contextMessages, setContextMessages]     = useState([]);
  const [contextCollapsed, setContextCollapsed]   = useState(false);

  // Load messages + context messages whenever the active session changes
  useEffect(() => {
    loadSession(activeSessionId);

    if (activeSessionId) {
      sessionsAPI.getById(activeSessionId)
        .then(res => setContextMessages(res.data.context_messages || []))
        .catch(() => {});
    } else {
      setContextMessages([]);
    }
  }, [activeSessionId, loadSession]);

  // Auto-scroll to the bottom after new messages or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading, containerRef]);

  const toggleContextCollapsed = useCallback(() => {
    setContextCollapsed(prev => !prev);
  }, []);

  return {
    messages, setMessages,
    loading,
    activeSessionId,
    handleNewChat, handleSelectSession,
    fetchSessions,
    bottomRef,
    contextMessages,
    contextCollapsed,
    toggleContextCollapsed,
  };
}
