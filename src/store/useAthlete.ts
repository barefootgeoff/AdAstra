import { useState, useCallback } from 'react'
import type { AthleteProfile } from '../models/athlete'
import { getAthleteProfile, saveAthleteProfile } from './storage'
import { GEOFF } from '../data/athlete-geoff'

function loadOrSeed(): AthleteProfile {
  const stored = getAthleteProfile()
  if (stored) return stored
  saveAthleteProfile(GEOFF)
  return GEOFF
}

interface Callbacks {
  onPushAthlete?: (athlete: AthleteProfile) => void
}

export function useAthlete({ onPushAthlete }: Callbacks = {}) {
  const [athlete, setAthlete] = useState<AthleteProfile>(loadOrSeed)

  const hydrateFromServer = useCallback((serverAthlete: AthleteProfile) => {
    // Only hydrate if server data is newer
    const local = getAthleteProfile()
    if (!local || (serverAthlete.updatedAt ?? '') >= (local.updatedAt ?? '')) {
      saveAthleteProfile(serverAthlete)
      setAthlete(serverAthlete)
    }
  }, [])

  const updateAthlete = useCallback((updates: Partial<AthleteProfile>) => {
    setAthlete(prev => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString().slice(0, 10) }
      saveAthleteProfile(next)
      onPushAthlete?.(next)
      return next
    })
  }, [onPushAthlete])

  return { athlete, updateAthlete, hydrateFromServer }
}
