import { useState, useEffect } from 'react'
import type { AthleteProfile } from '../models/athlete'
import type { WorkoutLog } from '../models/log'

type SyncState = 'loading' | 'ready' | 'unauthenticated' | 'error'

interface ServerData {
  athlete: AthleteProfile | null
  logs: WorkoutLog[]
  planOverrides: object[]
  stravaConnected: boolean
}

interface UseServerSyncResult {
  syncState: SyncState
  serverData: ServerData | null
  pushAthlete: (athlete: AthleteProfile) => void
  pushLogs: (logs: WorkoutLog[]) => void
  pushPlanOverrides: (overrides: object[]) => void
}

export function useServerSync(): UseServerSyncResult {
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [serverData, setServerData] = useState<ServerData | null>(null)

  useEffect(() => {
    fetch('/api/data')
      .then(async res => {
        if (res.status === 401) {
          setSyncState('unauthenticated')
          return
        }
        if (!res.ok) {
          setSyncState('error')
          return
        }
        const data = await res.json() as ServerData
        setServerData(data)
        setSyncState('ready')
      })
      .catch(() => setSyncState('error'))
  }, [])

  // Fire-and-forget push — UI stays responsive, server catches up
  function pushAthlete(athlete: AthleteProfile) {
    fetch('/api/data?resource=athlete', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(athlete),
    }).catch(console.error)
  }

  function pushLogs(logs: WorkoutLog[]) {
    fetch('/api/data?resource=logs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logs),
    }).catch(console.error)
  }

  function pushPlanOverrides(overrides: object[]) {
    fetch('/api/data?resource=plan-overrides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    }).catch(console.error)
  }

  return { syncState, serverData, pushAthlete, pushLogs, pushPlanOverrides }
}
