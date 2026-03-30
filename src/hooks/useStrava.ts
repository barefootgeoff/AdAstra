import { useState, useEffect } from 'react'
import type { WorkoutLog } from '../models/log'

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error' | 'not_connected'

export function useStrava(ftp: number, onSync: (logs: WorkoutLog[]) => void) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  // Check URL for Strava OAuth result on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stravaParam = params.get('strava')
    if (stravaParam) {
      // Clean the param from the URL
      params.delete('strava')
      const newUrl = params.size > 0
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)

      if (stravaParam === 'connected') {
        sync()
      } else if (stravaParam === 'denied') {
        setStatus('idle')
      } else {
        setStatus('error')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connect() {
    window.location.href = '/api/auth/strava'
  }

  async function sync() {
    setStatus('syncing')
    try {
      const res = await fetch(`/api/activities?ftp=${ftp}`)
      if (res.status === 401) {
        setStatus('not_connected')
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      const { logs } = await res.json() as { logs: WorkoutLog[] }
      onSync(logs)
      setLastSynced(new Date())
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return { status, lastSynced, connect, sync }
}
