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

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg]
      localStorage.setItem(key(logId), JSON.stringify(next))
      // Fire-and-forget persist to server
      fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, messages: next }),
      }).catch(() => {})
      return next
    })
  }, [logId])

  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(key(logId))
    fetch('/api/chat/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, messages: [] }),
    }).catch(() => {})
  }, [logId])

  return { messages, addMessage, clearMessages }
}
