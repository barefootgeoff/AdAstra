import { useState, useCallback } from 'react'
import type { ChatThread } from '../models/chat'

const STORAGE_KEY = 'adastra:chat:threads'
const MAX_THREADS = 10

function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChatThread[]) : []
  } catch {
    return []
  }
}

function saveThreads(threads: ChatThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
}

function formatThreadDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function useThreads() {
  const [threads, setThreads] = useState<ChatThread[]>(loadThreads)

  const getRecentThreads = useCallback((): ChatThread[] => {
    return [...threads]
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .slice(0, MAX_THREADS)
  }, [threads])

  const createThread = useCallback((
    type: 'general' | 'ride',
    sessionLabel?: string,
    logId?: string,
  ): ChatThread => {
    const now = new Date().toISOString()
    const dateLabel = formatThreadDate(now)
    const label = type === 'ride' && sessionLabel
      ? `${dateLabel} · Post-Ride: ${sessionLabel}`
      : `${dateLabel} · General`

    const thread: ChatThread = {
      id: `thread-${Date.now()}`,
      label,
      type,
      logId,
      createdAt: now,
      lastMessageAt: now,
    }

    setThreads(prev => {
      const updated = [thread, ...prev].slice(0, MAX_THREADS * 2)
      saveThreads(updated)
      return updated
    })

    return thread
  }, [])

  const updateThreadTimestamp = useCallback((threadId: string) => {
    const now = new Date().toISOString()
    setThreads(prev => {
      const updated = prev.map(t => t.id === threadId ? { ...t, lastMessageAt: now } : t)
      saveThreads(updated)
      return updated
    })
  }, [])

  return { threads, getRecentThreads, createThread, updateThreadTimestamp }
}
