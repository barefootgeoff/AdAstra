import { useState, useCallback } from 'react'
import type { ChatMessage } from '../models/chat'

function key(logId: string) {
  return `adastra:chat:${logId}`
}

export function useChat(logId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(key(logId))
      return raw ? (JSON.parse(raw) as ChatMessage[]) : []
    } catch {
      return []
    }
  })

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
