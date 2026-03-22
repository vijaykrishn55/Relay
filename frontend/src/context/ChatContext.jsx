import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { aiAPI, sessionsAPI } from '../services/api'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const skipLoadRef = useRef(false)
  const bottomRef = useRef(null)
  const activeSessionRef = useRef(null)
  const loadRequestRef = useRef(0)
  const navigate = useNavigate()
  useEffect(() => {
    activeSessionRef.current = activeSessionId
  }, [activeSessionId])


  const { sessions, fetchSessions, createSession, renameSession, deleteSession, updateLocalTitle } = useSessions()

  const handleNewChat = useCallback(async () => {
    const session = await createSession()
    skipLoadRef.current = true
    setActiveSessionId(session.id)
    setMessages([])
    setError('')
    navigate('/chat')
  }, [createSession, navigate])

  const handleSelectSession = useCallback((id) => {
    setActiveSessionId(id)
    setMessages([])
    setError('')
    navigate('/chat')
    // Touch session to update its timestamp (non-blocking)
    sessionsAPI.touch(id).catch(() => {})
  }, [navigate])

  const handleDeleteSession = useCallback(async (id) => {
    await deleteSession(id)
    setActiveSessionId((prev) => {
      if (prev === id) {
        setMessages([])
        return null
      }
      return prev
    })
  }, [deleteSession])

  const loadSession = useCallback(async (id) => {
    if (!id) return
    if (skipLoadRef.current) { skipLoadRef.current = false; return }
    const requestId = ++loadRequestRef.current
    try {
      const res = await sessionsAPI.getById(id)
      if (requestId !== loadRequestRef.current) return
      if (activeSessionRef.current !== id) return
      setMessages(res.data.messages || [])
    } catch {
      if (requestId === loadRequestRef.current) {
        setError('Failed to load session.')
      }
    }
  }, [])

  const value = {
    input, setInput,
    messages, setMessages,
    loading, setLoading,
    error, setError,
    activeSessionId, setActiveSessionId,
    bottomRef, skipLoadRef,
    sessions, fetchSessions, createSession, renameSession, deleteSession,
    updateLocalTitle,
    handleNewChat, handleSelectSession, handleDeleteSession, loadSession,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
