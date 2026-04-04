import { useState, useCallback } from 'react'
import type { AthleteMemory, AthleteMemoryKey } from '../models/athlete'

const STORAGE_KEY = 'adastra:athlete:memory'

function loadMemory(): AthleteMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AthleteMemory) : {}
  } catch {
    return {}
  }
}

function pushMemory(memory: AthleteMemory) {
  fetch('/api/chat/messages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logId: '__memory__', messages: [], memory }),
  }).catch(() => {})
}

export function useAthleteMemory() {
  const [memory, setMemory] = useState<AthleteMemory>(loadMemory)

  const mergeMemory = useCallback((incoming: AthleteMemory) => {
    const current = loadMemory()
    const merged = { ...current, ...incoming }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    setMemory(merged)
    pushMemory(merged)
  }, [])

  const clearMemoryKey = useCallback((key: AthleteMemoryKey) => {
    const current = loadMemory()
    const updated = { ...current }
    delete updated[key]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMemory(updated)
    pushMemory(updated)
  }, [])

  return { memory, mergeMemory, clearMemoryKey }
}
