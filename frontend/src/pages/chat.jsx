import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, GitBranch, AlertCircle, Sparkles,
  CheckSquare, X, BookmarkPlus, ArrowRightCircle,
  ChevronDown, ChevronRight, Layers, Search
} from 'lucide-react'
import MessageBubble from '../components/MessageBubble'
import RelayChip from '../components/RelayChip'
import RelayTopicPicker from '../components/RelayTopicPicker'
import ModelDropdown from '../components/ModelDropdown'
import ContextMeter from '../components/ContextMeter'
import { useChat } from '../context/ChatContext'
import { aiAPI, relayAPI, sessionsAPI, memoryAPI } from '../services/api'

function Chat() {
  const {
    messages, setMessages,
    input, setInput,
    loading, setLoading,
    error, setError,
    activeSessionId,
    handleNewChat, handleSelectSession,
    fetchSessions, loadSession,
    bottomRef
  } = useChat()

  const [selectedModel, setSelectedModel] = useState('')
  const [selectedModelName, setSelectedModelName] = useState('Auto')
  const [relayMode, setRelayMode] = useState(false)

  // ── Relay context: stores full context about the target message ──
  // Shape: { targetIndex, targetId, originalQuestion, originalResponse }
  const [relayContext, setRelayContext] = useState(null)

  const [relayTopics, setRelayTopics] = useState([])
  const [showTopics, setShowTopics] = useState(false)
  const [fetchingTopics, setFetchingTopics] = useState(false)
  const containerRef = useRef(null)
  const textareaRef = useRef(null)

  // ── Selection mode state ──
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState(new Set())

  // ── Context messages from parent session ──
  const [contextMessages, setContextMessages] = useState([])
  const [contextCollapsed, setContextCollapsed] = useState(false)

  // Load session messages when activeSessionId changes
  useEffect(() => {
    loadSession(activeSessionId)
    if (activeSessionId) {
      sessionsAPI.getById(activeSessionId).then(res => {
        setContextMessages(res.data.context_messages || [])
      }).catch(() => {})
    } else {
      setContextMessages([])
    }
    // Clear relay state when switching sessions
    setRelayMode(false)
    setRelayContext(null)
    setShowTopics(false)
  }, [activeSessionId, loadSession])

  // Auto-focus input
  useEffect(() => {
    textareaRef.current?.focus()
  }, [activeSessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [messages, loading])

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  // ── Selection handlers ──
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev)
    setSelectedIndices(new Set())
  }

  const handleToggleSelect = useCallback((index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleSaveToMemory = async () => {
    const selectedMessages = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => messages[i]).filter(Boolean)
    if (selectedMessages.length === 0) return
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
      setError('')
      alert(`${selectedMessages.length} message(s) saved to memory!`)
    } catch (err) {
      console.error('Failed to save to memory:', err)
      setError('Failed to save messages to memory.')
    }
  }

  const handleStartContextSession = async () => {
    const ctxMessages = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => messages[i]).filter(Boolean)
      .map(m => ({ role: m.role, content: m.content, model: m.model || null }))
    if (ctxMessages.length === 0) return
    try {
      const res = await sessionsAPI.createWithContext(ctxMessages, activeSessionId)
      setSelectionMode(false)
      setSelectedIndices(new Set())
      handleSelectSession(res.data.id)
      fetchSessions()
    } catch (err) {
      console.error('Failed to create context session:', err)
      setError('Failed to create new session with context.')
    }
  }

  // ── Clear relay state helper ──
  const clearRelayState = useCallback(() => {
    setRelayMode(false)
    setRelayContext(null)
    setShowTopics(false)
  }, [])

  // ── Relay/Hive toggle ──
  // Available from the very start. When no AI messages exist, it triggers Hive mode.
  // When AI messages exist, it enters relay-from-last-response mode.
  const handleRelayClick = useCallback(() => {
    if (loading) {
      setError('Please wait for response to complete')
      return
    }

    if (relayMode) {
      // Already in relay — turn off
      clearRelayState()
      return
    }

    // Find the last AI message and its index
    let lastAIIndex = -1
    let lastAI = null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAIIndex = i
        lastAI = messages[i]
        break
      }
    }

    if (lastAI) {
      // Find the user question that preceded this AI response
      let originalQuestion = ''
      for (let i = lastAIIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          originalQuestion = messages[i].content
          break
        }
      }

      // Store full relay context
      setRelayContext({
        targetIndex: lastAIIndex,
        targetId: lastAI.id,
        originalQuestion: originalQuestion || '',
        originalResponse: lastAI.content || ''
      })
      setRelayMode(true)
      setShowTopics(false)
      if (activeSessionId) fetchTopics()
    } else {
      // No AI messages → enable Hive Orchestra mode
      setRelayMode(true)
      setRelayContext(null)
      setShowTopics(false)
    }
  }, [messages, activeSessionId, setError, loading, relayMode, clearRelayState])

  const fetchTopics = async () => {
    if (!activeSessionId) return
    try {
      setFetchingTopics(true)
      const res = await relayAPI.getTopics(activeSessionId)
      setRelayTopics(res.data.topics || [])
    } catch (err) {
      console.error('Failed to fetch relay topics:', err)
      setRelayTopics([])
    } finally {
      setFetchingTopics(false)
    }
  }

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || !activeSessionId) return

    const userMessage = input.trim()
    setInput('')
    setError('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      setLoading(true)

      if (relayMode && relayContext) {
        // ── RELAY MODE: Smart relay with full context ──
        const response = await relayAPI.smart({
          sessionId: activeSessionId,
          userInput: userMessage,
          targetMessageIndex: relayContext.targetIndex,
          originalQuestion: relayContext.originalQuestion,
          originalResponse: relayContext.originalResponse,
        })

        const responseData = response.data

        if (responseData.action === 'follow_up') {
          // ── FOLLOW-UP: Update the target AI message in-place ──
          // Remove the optimistic user message (follow-ups don't add new messages)
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== tempUserMsg.id)
            // Update the target AI message content
            const targetIdx = relayContext.targetIndex
            if (targetIdx >= 0 && targetIdx < updated.length) {
              updated[targetIdx] = {
                ...updated[targetIdx],
                content: responseData.output,
                model: responseData.model,
                relayUpdated: true,
                relayFollowUps: [
                  ...(updated[targetIdx].relayFollowUps || []),
                  responseData.followUpQuestion || userMessage
                ]
              }
            }
            return [...updated]
          })
          clearRelayState()

        } else if (responseData.action === 'new_session') {
          // ── NEW SESSION: Navigate to the branched session ──
          // Remove the optimistic user message (this was a command, not a chat message)
          setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
          clearRelayState()

          if (responseData.error === 'no_matches') {
            setError(`No messages found matching topic: "${responseData.topic}". Try being more specific.`)
          } else if (responseData.newSession) {
            // Switch to the new session
            handleSelectSession(responseData.newSession.id)
            fetchSessions()
          }
        } else {
          // Unknown action — treat as a normal response
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: responseData.output || 'No response generated.',
            model: responseData.model,
            timestamp: new Date(),
            orchestration: responseData.orchestration || null,
          }
          setMessages(prev => [...prev, aiMessage])
          clearRelayState()
        }

      } else {
        // ── Normal or Hive mode (relayMode without relayContext = hive) ──
        const response = await aiAPI.process({
          sessionId: activeSessionId,
          input: userMessage,
          modelId: selectedModel || undefined,
          mode: relayMode ? 'hive' : undefined
        })

        const aiMessage = {
          id: response.data.messageId || Date.now() + 1,
          role: 'assistant',
          content: response.data.output || response.data.response || response.data.content,
          model: response.data.model || response.data.provider,
          timestamp: new Date(),
          orchestration: response.data.orchestration || null,
        }
        setMessages(prev => [...prev, aiMessage])

        if (relayMode) {
          setRelayMode(false) // Turn off after sending
        }
      }

      // Refresh sidebar so auto-titled session name shows up
      fetchSessions()
    } catch (err) {
      console.error('Send message error:', err)
      setError(err.response?.data?.error || 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }, [input, loading, activeSessionId, selectedModel, relayMode, relayContext, setInput, setMessages, setLoading, setError, fetchSessions, handleSelectSession, clearRelayState])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      setError('')
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, editing: false } : m
      ))
    } catch {
      setError('Failed to update message')
    }
  }, [setMessages, setError])

  // ── Topic picker handlers ──
  const handleRelayTopic = useCallback(async (topic) => {
    // Topic selected from the picker — create a new session based on this topic
    if (!activeSessionId) return

    try {
      setLoading(true)
      setError('')

      // Call relay-smart with the topic description as user input
      // The AI classifier will detect this as new_session intent
      const response = await relayAPI.smart({
        sessionId: activeSessionId,
        userInput: `start new session about ${topic.name}`,
        targetMessageIndex: relayContext?.targetIndex,
        originalQuestion: relayContext?.originalQuestion,
        originalResponse: relayContext?.originalResponse,
      })

      const responseData = response.data

      if (responseData.action === 'new_session' && responseData.newSession) {
        clearRelayState()
        handleSelectSession(responseData.newSession.id)
        fetchSessions()
      } else if (responseData.action === 'new_session' && responseData.error === 'no_matches') {
        setError(`No messages found matching topic: "${responseData.topic}". Try describing it differently.`)
      } else {
        // Fallback: classifier didn't pick it up as new_session, show response
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: responseData.output || 'Topic session could not be created.',
          model: responseData.model,
          timestamp: new Date(),
          orchestration: responseData.orchestration || null,
        }])
        clearRelayState()
      }
    } catch (err) {
      console.error('Relay topic error:', err)
      setError('Failed to create topic session')
    } finally {
      setLoading(false)
    }
  }, [activeSessionId, relayContext, setMessages, setLoading, setError, fetchSessions, handleSelectSession, clearRelayState])

  const handleManualTopicStart = useCallback(async (description) => {
    // Manual topic: user typed their own description
    await handleRelayTopic({ name: description })
  }, [handleRelayTopic])

  const handleRegenerateMessage = useCallback(async (messageId) => {
    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex === -1) return
    try {
      setLoading(true)
      setError('')
      let userMsg = null
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { userMsg = messages[i]; break }
      }
      if (!userMsg) throw new Error('Could not find original user message')
      const response = await aiAPI.process({
        sessionId: activeSessionId,
        input: userMsg.content,
        modelId: selectedModel || undefined,
        regenerate: true
      })
      setMessages(prev => {
        const updated = [...prev]
        updated[msgIndex] = {
          ...updated[msgIndex],
          content: response.data.output || response.data.response || response.data.content,
          model: response.data.model || response.data.provider,
          timestamp: new Date()
        }
        return updated
      })
    } catch (err) {
      console.error('Regenerate error:', err)
      setError('Failed to regenerate response')
    } finally {
      setLoading(false)
    }
  }, [messages, activeSessionId, selectedModel, setMessages, setLoading, setError])

  // ── No active session — welcome screen ──
  if (!activeSessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center space-y-5 animate-fade-in max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-white/10 flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Welcome to Relay</h1>
            <p className="text-gray-400 mt-2 text-sm">Multi-model chat with intelligent routing</p>
          </div>
          <button
            onClick={handleNewChat}
            className="px-6 py-2.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/25 rounded-xl hover:bg-neon-cyan/20 transition-all text-sm font-medium"
          >
            Start New Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Selection header ── */}
      {selectionMode && (
        <div className="flex-shrink-0 border-b border-white/5 bg-surface-low/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckSquare size={16} className="text-neon-cyan" />
            <span className="text-sm text-gray-200 font-medium">
              {selectedIndices.size === 0
                ? 'Tap messages to select'
                : `${selectedIndices.size} message${selectedIndices.size !== 1 ? 's' : ''} selected`
              }
            </span>
          </div>
          <button
            onClick={toggleSelectionMode}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
          {/* Context messages from parent session */}
          {contextMessages.length > 0 && (
            <div className="mb-6 rounded-xl overflow-hidden border border-neon-purple/20 bg-neon-purple/5">
              <button
                onClick={() => setContextCollapsed(!contextCollapsed)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-neon-purple hover:bg-neon-purple/10 transition-colors"
              >
                <Layers size={13} />
                Context from previous session ({contextMessages.length} messages)
                {contextCollapsed
                  ? <ChevronRight size={13} className="ml-auto" />
                  : <ChevronDown size={13} className="ml-auto" />
                }
              </button>
              {!contextCollapsed && (
                <div className="px-4 pb-3 space-y-2 border-t border-neon-purple/10">
                  {contextMessages.map((msg, i) => (
                    <div key={i} className="flex gap-2 py-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 w-12 flex-shrink-0 ${
                        msg.role === 'user' ? 'text-neon-cyan' : 'text-neon-purple'
                      }`}>{msg.role}</span>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                onRegenerate={() => handleRegenerateMessage(message.id)}
                onEdit={(content) => handleEditMessage(message.id, content)}
                selectionMode={selectionMode}
                isSelected={selectedIndices.has(index)}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}

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
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Selection Action Bar ── */}
      {selectionMode && selectedIndices.size > 0 && (
        <div className="flex-shrink-0 border-t border-white/5 bg-surface-low/95 backdrop-blur-xl px-4 py-3 animate-fade-in">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedIndices.size} message{selectedIndices.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button onClick={handleSaveToMemory}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-xl hover:bg-neon-purple/20 transition-colors">
                <BookmarkPlus size={14} /> Save to Memory
              </button>
              <button onClick={handleStartContextSession}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 rounded-xl hover:bg-neon-cyan/25 transition-colors">
                <ArrowRightCircle size={14} /> New Chat with Context
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Input Area — Claude-style: textarea on top, controls below ── */}
      {!selectionMode && (
        <div className="flex-shrink-0 border-t border-white/5 bg-obsidian/90 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 animate-fade-in mb-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={15} />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Relay Chip */}
            {relayMode && relayContext && (
              <div className="mb-2">
                <RelayChip
                  relayContext={relayContext}
                  onClear={clearRelayState}
                />
              </div>
            )}

            {/* Topics Picker */}
            {relayMode && showTopics && (
              <div className="mb-2">
                <RelayTopicPicker
                  topics={relayTopics}
                  loading={fetchingTopics}
                  onSelect={handleRelayTopic}
                  onManualStart={handleManualTopicStart}
                  onCancel={() => setShowTopics(false)}
                />
              </div>
            )}

            {/* ── Main input container ── */}
            <form onSubmit={handleSendMessage}>
              <div className="rounded-2xl border border-white/8 bg-surface-low/80 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] focus-within:border-white/15 transition-colors relative z-20">
                {/* Top section: textarea (full width) */}
                <div className="px-4 pt-3 pb-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={relayMode && relayContext
                      ? "Type a follow-up to refine, or say 'start new session about [topic]'..."
                      : "Ask anything..."
                    }
                    rows={1}
                    className="w-full bg-transparent resize-none text-sm text-gray-100 placeholder-gray-500/60 focus:outline-none disabled:opacity-50 max-h-[200px]"
                    disabled={loading}
                    style={{ height: 'auto' }}
                  />
                </div>

                {/* Bottom section: controls row */}
                <div className="flex items-center justify-between px-3 py-2">
                  {/* Left: model selector */}
                  <div className="w-40">
                    <ModelDropdown
                      value={selectedModel}
                      onChange={(val, name) => { setSelectedModel(val); setSelectedModelName(name || 'Auto') }}
                      disabled={loading}
                      compact
                    />
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-1">
                    {/* Context Meter */}
                    <ContextMeter messages={messages} modelName={selectedModelName} relayMode={relayMode} />

                    {/* Selection mode toggle */}
                    {messages.length > 0 && (
                      <button type="button" onClick={toggleSelectionMode}
                        className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                        title="Select messages">
                        <CheckSquare size={16} />
                      </button>
                    )}

                    {/* Browse Topics button — only in relay mode with context */}
                    {relayMode && relayContext && messages.length >= 4 && (
                      <button
                        type="button"
                        onClick={() => setShowTopics(prev => !prev)}
                        disabled={loading}
                        className={`p-2 rounded-xl transition-all ${
                          showTopics
                            ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                            : 'text-gray-500 hover:text-neon-purple hover:bg-neon-purple/10'
                        } disabled:opacity-40`}
                        title="Browse topics to branch into a new session"
                      >
                        <Search size={16} />
                      </button>
                    )}

                    {/* Relay / Hive toggle — ALWAYS available */}
                    <button
                      type="button"
                      onClick={handleRelayClick}
                      disabled={loading}
                      className={`p-2 rounded-xl transition-all ${
                        relayMode
                          ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                          : 'text-gray-500 hover:text-neon-purple hover:bg-neon-purple/10'
                      } disabled:opacity-40`}
                      title={relayMode
                        ? (relayContext ? 'Relay mode (ON) — click to cancel' : 'Hive Orchestra (ON) — click to cancel')
                        : (messages.some(m => m.role === 'assistant')
                          ? 'Relay — route through multiple models'
                          : 'Hive Orchestra — multi-model from start'
                        )
                      }
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

              {/* Relay mode indicator below the input */}
              {relayMode && (
                <div className="flex items-center gap-2 mt-1.5 px-1 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
                  <span className="text-[11px] text-neon-purple/80">
                    {relayContext
                      ? 'Relay mode — type a follow-up or request a new session from this response'
                      : 'Hive Orchestra — multi-model pipeline active'
                    }
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
