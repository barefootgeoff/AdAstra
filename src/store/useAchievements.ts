import { useState, useCallback } from 'react'
import type { Achievement } from '../models/achievement'
import { getAchievements, addAchievements as persistAchievements } from './storage'

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(getAchievements)

  const addAchievements = useCallback((incoming: Achievement[]) => {
    if (!incoming.length) return
    persistAchievements(incoming)
    setAchievements(getAchievements())
  }, [])

  return { achievements, addAchievements }
}
