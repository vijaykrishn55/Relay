import { useEffect, useRef } from "react";
import { Send, Loader, AlertCircle, Bot, User } from "lucide-react";
import { aiAPI } from "../services/api";
import { useChat } from '../context/ChatContext'
import MessageBubble from "../components/MessageBubble";

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

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load messages when switching sessions
  useEffect(() => {
    loadSession(activeSessionId)
  }, [activeSessionId, loadSession])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setError('')

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
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

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
          {messages.map((msg, index) => {
            const lastAssistantIndex = messages.reduce(
              (last, m, i) => (m.role === 'assistant' ? i : last), -1
            )
            return (
              <MessageBubble
                key={msg.timestamp ||index}
                message={msg}
                isLast={index === messages.length - 1}
                isLastAssistant={index === lastAssistantIndex}
                onRegenerate={handleRegenerate}
                onEdit= {(newContent)=> handleEdit(index,newContent)}
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

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-3">
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
              placeholder="Message Relay..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              {loading
                ? <Loader size={15} className="text-white animate-spin" />
                : <Send size={15} className="text-white" />
              }
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            AI router picks the best model for each message automatically
          </p>
        </form>
      </div>
    </div>
  )
}

export default Chat;