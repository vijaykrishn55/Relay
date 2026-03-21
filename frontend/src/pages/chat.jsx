import { useState, useEffect, useRef } from "react";
import { Send, Loader, AlertCircle, Bot, BookmarkPlus, ArrowRightCircle, ChevronDown, ChevronRight, Layers, CornerDownRight, GitBranch, MessageSquare } from "lucide-react";
import { aiAPI, sessionsAPI, memoryAPI, relayAPI } from "../services/api";
import { useChat } from '../context/ChatContext'
import MessageBubble from "../components/MessageBubble";
import RelayChip from "../components/RelayChip";

function Chat() {
  const {
    input, setInput,
    messages, setMessages,
    loading, setLoading,
    error, setError,
    activeSessionId, setActiveSessionId,
    bottomRef, skipLoadRef,
    sessions, fetchSessions, createSession, loadSession, updateLocalTitle,
  } = useChat()
  const activeSessionIdRef = useRef(activeSessionId)

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  // Context-seeded session state
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [contextMessages, setContextMessages] = useState([])

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState(new Set())

  // Relay state
  const [relayTarget, setRelayTarget] = useState(null) // { index, message, originalQuestion }
  const [relayTopics, setRelayTopics] = useState([])
  const [relayTopicsLoading, setRelayTopicsLoading] = useState(false)
  const [relayTopicsExpanded, setRelayTopicsExpanded] = useState(false)

  // Toggle selection mode on/off
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev)
    setSelectedIndices(new Set())
  }

  // Toggle a single message selection
  const handleToggleSelect = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load messages + context when switching sessions
  useEffect(() => {
    if (!activeSessionId) {
      setContextMessages([])
      return
    }
    loadSession(activeSessionId)
    // Also load context_messages for this session
    sessionsAPI.getById(activeSessionId).then(res => {
      setContextMessages(res.data.context_messages || [])
    }).catch(() => {
      setContextMessages([])
    })
  }, [activeSessionId, loadSession])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setError('')

    // ── If relay target is set, AI decides: follow-up or new session ──
    if (relayTarget) {
      await handleRelaySmart(userMessage)
      return
    }

    let sessionId = activeSessionId
    if (!sessionId) {
      const session = await createSession()
      sessionId = session.id
      skipLoadRef.current = true
      setActiveSessionId(session.id)
      activeSessionIdRef.current = session.id
    }

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    const requestSessionId = sessionId

    // Optimistically update the session title from the first user message
    const currentSession = sessions.find(s => s.id === sessionId)
    if (currentSession && currentSession.title === 'New Chat') {
      const autoTitle = userMessage.length > 40 ? userMessage.substring(0, 40) + '...' : userMessage
      updateLocalTitle(sessionId, autoTitle)
    }

    try {
      const response = await aiAPI.process({
        input: userMessage,
        strategy: 'ai-powered',
        requiredCapabilities: ['text-generation'],
        sessionId,
      })

      if (activeSessionIdRef.current !== requestSessionId) return

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.output,
          model: response.data.model,
        },
      ])

      fetchSessions()
    } catch (err) {
      console.error('Error:', err)
      if (activeSessionIdRef.current !== requestSessionId) return
      setError('Failed to get a response. Please try again.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      if (activeSessionIdRef.current === requestSessionId) {
        setLoading(false)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // ── Regenerate: re-send last user message ───────────
  const handleRegenerate = async () => {
    const requestSessionId = activeSessionId
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!requestSessionId || !lastUserMsg || loading) return

    const backupMessages = [...messages]

    // Optimistic: remove last assistant message
    setMessages((prev) => {
      const lastAsstIdx = prev.reduce((last, m, i) => (m.role === 'assistant' ? i : last), -1)
      if (lastAsstIdx === -1) return prev
      return prev.filter((_, i) => i !== lastAsstIdx)
    })

    setLoading(true)
    setError('')

    try {
      const response = await aiAPI.process({
        input: lastUserMsg.content,
        strategy: 'ai-powered',
        requiredCapabilities: ['text-generation'],
        sessionId: requestSessionId,
      })

      if (activeSessionIdRef.current !== requestSessionId) return

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.output,
          model: response.data.model,
        },
      ])
      fetchSessions()
    } catch {
      if (activeSessionIdRef.current !== requestSessionId) return
      setMessages(backupMessages)
      setError('Regeneration failed. Try again.')
    } finally {
      if (activeSessionIdRef.current === requestSessionId) {
        setLoading(false)
      }
    }
  }

  // ── Edit: truncate conversation and resend ──────────
  const handleEdit = async (messageIndex, newContent) => {
    const requestSessionId = activeSessionId
    if (!requestSessionId || loading) return

    const backupMessages = [...messages]

    // Remove all messages after the edited one, update the edited message
    setMessages((prev) => {
      const truncated = prev.slice(0, messageIndex)
      return [...truncated, { ...prev[messageIndex], content: newContent }]
    })

    setLoading(true)
    setError('')

    try {
      const response = await aiAPI.process({
        input: newContent,
        strategy: 'ai-powered',
        requiredCapabilities: ['text-generation'],
        sessionId: requestSessionId,
      })

      if (activeSessionIdRef.current !== requestSessionId) return

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.output,
          model: response.data.model,
        },
      ])
      fetchSessions()
    } catch {
      if (activeSessionIdRef.current !== requestSessionId) return
      setMessages(backupMessages)
      setError('Failed to get response. Try again.')
    } finally {
      if (activeSessionIdRef.current === requestSessionId) {
        setLoading(false)
      }
    }
  }

  // ── Save selected messages to memory bank ───────────
  const handleSaveToMemory = async () => {
    const selectedMessages = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => messages[i])

    try {
      for (const msg of selectedMessages) {
        await memoryAPI.create({
          content: msg.content,
          source_session_id: activeSessionId,
          source_message_index: messages.indexOf(msg),
          tags: [msg.role]
        })
      }

      setSelectionMode(false)
      setSelectedIndices(new Set())
      alert(`${selectedMessages.length} message(s) saved to memory!`)
    } catch (err) {
      console.error('Failed to save to memory:', err)
      setError('Failed to save messages to memory.')
    }
  }

  // ── Start a new session pre-loaded with selected messages as context ──
  const handleStartContextSession = async () => {
    const ctxMessages = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => ({
        role: messages[i].role,
        content: messages[i].content,
        model: messages[i].model || null
      }))

    try {
      const res = await sessionsAPI.createWithContext(ctxMessages)
      const newSession = res.data

      // Skip the auto-load in ChatContext so it doesn't overwrite our state
      skipLoadRef.current = true
      setActiveSessionId(newSession.id)
      setMessages([])
      // Set context messages immediately — we already have them
      setContextMessages(newSession.context_messages || ctxMessages)
      setSelectionMode(false)
      setSelectedIndices(new Set())
      fetchSessions()
    } catch (err) {
      console.error('Failed to create context session:', err)
      setError('Failed to create new session with context.')
    }
  }

  // ── Relay: Toggle — auto-target last assistant response + fetch topics ──
  const handleRelayToggle = async () => {
    if (relayTarget) {
      // already active → cancel
      setRelayTarget(null)
      setRelayTopics([])
      setRelayTopicsExpanded(false)
      return
    }

    // Find last assistant message
    let lastAssistantIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIdx = i
        break
      }
    }
    if (lastAssistantIdx === -1) return

    const targetMsg = messages[lastAssistantIdx]

    // Find the user question that preceded this response
    let originalQuestion = ''
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        originalQuestion = messages[i].content
        break
      }
    }

    setRelayTarget({
      index: lastAssistantIdx,
      message: targetMsg,
      originalQuestion
    })
    setRelayTopicsExpanded(false)

    // Cancel selection mode if active
    if (selectionMode) {
      setSelectionMode(false)
      setSelectedIndices(new Set())
    }

    // Fetch topics in background (only if enough messages)
    if (activeSessionId && messages.length >= 4) {
      setRelayTopicsLoading(true)
      try {
        const res = await relayAPI.getTopics(activeSessionId)
        setRelayTopics(res.data.topics || [])
      } catch (err) {
        console.error('Failed to extract topics:', err)
        // non-blocking — topics are optional suggestions
      } finally {
        setRelayTopicsLoading(false)
      }
    }
  }

  // ── Relay: Smart — AI classifies intent and auto-routes ──
  const handleRelaySmart = async (userInput) => {
    const { index, message, originalQuestion } = relayTarget
    const requestSessionId = activeSessionId

    if (!requestSessionId) return

    // Save backup for rollback
    const backupMessages = [...messages]

    // Clear relay
    setRelayTarget(null)
    setRelayTopics([])
    setRelayTopicsExpanded(false)
    setLoading(true)
    setError('')

    try {
      const response = await relayAPI.smart({
        sessionId: requestSessionId,
        targetMessageIndex: index,
        originalQuestion,
        originalResponse: message.content,
        userInput
      })

      if (activeSessionIdRef.current !== requestSessionId) return

      const { action } = response.data

      if (action === 'follow_up') {
        // Update the target message IN-PLACE (no new bubble)
        setMessages(prev => prev.map((msg, i) =>
          i === index
            ? { ...msg, content: response.data.output, model: response.data.model, relayUpdated: true }
            : msg
        ))
      } else if (action === 'new_session') {
        if (response.data.error === 'no_matches') {
          setError(`No messages found about "${response.data.topic}". Try a different topic.`)
          setMessages(backupMessages)
          return
        }

        // Switch to the new session the backend created
        const newSession = response.data.newSession
        skipLoadRef.current = true
        setActiveSessionId(newSession.id)
        setMessages([])
        setContextMessages(newSession.context_messages || [])
        fetchSessions()
      }

    } catch (err) {
      console.error('Smart relay failed:', err)
      if (activeSessionIdRef.current !== requestSessionId) return
      setMessages(backupMessages)
      setError('Relay failed. Try again.')
    } finally {
      if (activeSessionIdRef.current === requestSessionId) {
        setLoading(false)
      }
    }
  }

  // ── Relay: Branch into a new session with topic context ──
  const handleRelayTopicSelect = async (topic) => {
    const contextMsgs = topic.messageIndices
      .sort((a, b) => a - b)
      .filter(i => i >= 0 && i < messages.length)
      .map(i => ({
        role: messages[i].role,
        content: messages[i].content,
        model: messages[i].model || null
      }))

    if (contextMsgs.length === 0) {
      setError('No valid messages for this topic.')
      return
    }

    try {
      const res = await sessionsAPI.createWithContext(contextMsgs)
      const newSession = res.data

      skipLoadRef.current = true
      setActiveSessionId(newSession.id)
      setMessages([])
      setContextMessages(newSession.context_messages || contextMsgs)
      setRelayTarget(null)
      setRelayTopics([])
      setRelayTopicsExpanded(false)
      fetchSessions()
    } catch (err) {
      console.error('Failed to create topic session:', err)
      setError('Failed to create new session from topic.')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* Chat header with selection toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-medium text-gray-600">
          {selectionMode
            ? `${selectedIndices.size} message${selectedIndices.size !== 1 ? 's' : ''} selected`
            : 'Chat'
          }
        </h2>
        <button
          onClick={toggleSelectionMode}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            selectionMode
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {selectionMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full pt-24 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Bot size={28} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Relay</h2>
              <p className="text-gray-500 text-sm max-w-sm">
                AI-powered routing picks the best model for every message automatically.
              </p>
            </div>
          )}

          {/* Context messages from parent session */}
          {contextMessages && contextMessages.length > 0 && (
            <div className="mb-6 border border-purple-200 rounded-xl overflow-hidden bg-purple-50/50">
              <button
                onClick={() => setContextCollapsed(!contextCollapsed)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-100/50 transition-colors"
              >
                <Layers size={14} />
                Context from previous session ({contextMessages.length} messages)
                {contextCollapsed ? <ChevronRight size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
              </button>

              {!contextCollapsed && (
                <div className="px-4 pb-3 space-y-2">
                  {contextMessages.map((msg, i) => (
                    <div key={i} className="text-xs text-purple-800 bg-white/60 rounded-lg px-3 py-2 border border-purple-100">
                      <span className="font-semibold text-purple-600 uppercase text-[10px] tracking-wider">
                        {msg.role}
                      </span>
                      <p className="mt-0.5 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, index) => {
            const lastAssistantIndex = messages.reduce(
              (last, m, i) => (m.role === 'assistant' ? i : last), -1
            )
            return (
              <MessageBubble
                key={`${msg.timestamp || 'msg'}-${index}`}
                message={msg}
                index={index}
                isLast={index === messages.length - 1}
                isLastAssistant={index === lastAssistantIndex}
                onRegenerate={handleRegenerate}
                onEdit={(newContent) => handleEdit(index, newContent)}
                selectionMode={selectionMode}
                isSelected={selectedIndices.has(index)}
                onToggleSelect={handleToggleSelect}
              />
            )
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Selection action bar — shown when messages are selected */}
      {selectionMode && selectedIndices.size > 0 && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIndices.size} message{selectedIndices.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSaveToMemory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <BookmarkPlus size={14} />
                Save to Memory
              </button>
              <button
                onClick={handleStartContextSession}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowRightCircle size={14} />
                New Chat with Context
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {/* Relay chip — shows when a target is selected */}
          <RelayChip
            targetMessage={relayTarget?.message}
            onClear={() => {
              setRelayTarget(null)
              setRelayTopics([])
              setRelayTopicsExpanded(false)
            }}
          />

          {/* Suggested topics drop-up — collapsible, shown when relay is active */}
          {relayTarget && (relayTopics.length > 0 || relayTopicsLoading) && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setRelayTopicsExpanded(!relayTopicsExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <GitBranch size={12} />
                {relayTopicsLoading ? 'Finding topics...' : `${relayTopics.length} suggested topic${relayTopics.length !== 1 ? 's' : ''} to branch`}
                {relayTopicsExpanded ? <ChevronDown size={12} className="ml-auto" /> : <ChevronRight size={12} className="ml-auto" />}
              </button>

              {relayTopicsExpanded && !relayTopicsLoading && (
                <div className="px-1 pb-2 space-y-1.5">
                  {relayTopics.map((topic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleRelayTopicSelect(topic)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-800">{topic.name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MessageSquare size={9} />
                          {topic.messageIndices.length}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{topic.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-3">
            {/* Single Relay button */}
            {messages.some(m => m.role === 'assistant') && (
              <button
                type="button"
                onClick={handleRelayToggle}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  relayTarget
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
                }`}
                title={relayTarget ? 'Cancel relay' : 'Relay: follow up on last response'}
              >
                <CornerDownRight size={16} />
              </button>
            )}

            <textarea
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-40"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={relayTarget ? 'Ask a follow-up about this response...' : 'Message Relay...'}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                relayTarget
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
              } disabled:cursor-not-allowed`}
            >
              {loading
                ? <Loader size={15} className="text-white animate-spin" />
                : <Send size={15} className="text-white" />
              }
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {relayTarget
              ? 'Relay mode: your message will refine the selected response'
              : 'AI router picks the best model for each message automatically'
            }
          </p>
        </form>
      </div>
    </div>
  )
}

export default Chat;
