import { useState, useEffect, useCallback } from 'react'
import { sessionsAPI } from '../services/api'

export function useSessions() {
        const [sessions, setSessions] = useState([])
        const [loading, setLoading] = useState(true)

        const fetchSessions = useCallback(async () => {
                try {
                        const res = await sessionsAPI.getAll()
                        setSessions(res.data)
                } catch (err) {
                        console.error('Failed to fetch sessions:', err)
                } finally {
                        setLoading(false)
                }
        }, [])

        useEffect(() => {
                fetchSessions()
        }, [fetchSessions])

        const createSession = async () => {
                const res = await sessionsAPI.create()
                setSessions((prev) => [res.data, ...prev])
                return res.data
        }

        const renameSession = async (id, title) => {
                await sessionsAPI.rename(id, title)
                setSessions((prev) => prev.map((session) => (
                        session.id === id ? { ...session, title } : session
                )))
        }

        const deleteSession = async (id) => {
                await sessionsAPI.delete(id)
                setSessions((prev) => prev.filter((session) => session.id !== id))
        }

        const updateLocalTitle = (id, title) => {
                setSessions((prev) => prev.map((session) => (
                        session.id === id ? { ...session, title } : session
                )))
        }

        return { sessions, loading, fetchSessions, createSession, renameSession, deleteSession, updateLocalTitle }
}