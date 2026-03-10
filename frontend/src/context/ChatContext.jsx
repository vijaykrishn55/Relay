import { createContext, useContext, useState, useRef, useCallback } from 'react'
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
  const navigate = useNavigate()

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
    setError('')
    navigate('/chat')
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
    try {
      const res = await sessionsAPI.getById(id)
      setMessages(res.data.messages || [])
    } catch {
      setError('Failed to load session.')
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
