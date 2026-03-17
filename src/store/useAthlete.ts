import { useState, useCallback } from 'react'
import type { AthleteProfile } from '../models/athlete'
import { getAthleteProfile, saveAthleteProfile } from './storage'
import { GEOFF } from '../data/athlete-geoff'

// Seeds with Geoff's profile if nothing is stored yet.
function loadOrSeed(): AthleteProfile {
  const stored = getAthleteProfile()
  if (stored) return stored
  saveAthleteProfile(GEOFF)
  return GEOFF
}

export function useAthlete() {
  const [athlete, setAthlete] = useState<AthleteProfile>(loadOrSeed)

  const updateAthlete = useCallback((updates: Partial<AthleteProfile>) => {
    setAthlete(prev => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString().slice(0, 10) }
      saveAthleteProfile(next)
      return next
    })
  }, [])

  return { athlete, updateAthlete }
}
