import { useState, useCallback, useEffect } from 'react'
import type { ChatMessage } from '../models/chat'

function key(logId: string) {
  return `adastra:chat:${logId}`
}

export function useChat(logId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    // 1. Try localStorage first (fast, no network)
    try {
      const raw = localStorage.getItem(key(logId))
      if (raw) {
        setMessages(JSON.parse(raw) as ChatMessage[])
        return
      }
    } catch {}

    // 2. Fallback: fetch from server (covers new device / cleared cache)
    setMessages([])
    fetch(`/api/chat/messages?logId=${encodeURIComponent(logId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: { messages: ChatMessage[] } | null) => {
        if (data?.messages?.length) {
          localStorage.setItem(key(logId), JSON.stringify(data.messages))
          setMessages(data.messages)
        }
      })
      .catch(() => {})
  }, [logId])

  const persist = useCallback((msgs: ChatMessage[]) => {
    localStorage.setItem(key(logId), JSON.stringify(msgs))
    fetch('/api/chat/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, messages: msgs }),
    }).catch(() => {})
  }, [logId])

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg]
      persist(next)
      return next
    })
  }, [persist])

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m)
      persist(next)
      return next
    })
  }, [persist])

  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(key(logId))
    fetch('/api/chat/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, messages: [] }),
    }).catch(() => {})
  }, [logId])

  return { messages, addMessage, updateMessage, clearMessages }
}
