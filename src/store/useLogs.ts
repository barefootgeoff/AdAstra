import { useState, useCallback, useMemo } from 'react'
import type { WorkoutLog } from '../models/log'
import { getWorkoutLogs, upsertWorkoutLog, bulkUpsertWorkoutLogs, deleteWorkoutLog } from './storage'
import { buildLoadHistory } from '../utils/trainingMath'

interface Callbacks {
  onPushLogs?: (logs: WorkoutLog[]) => void
}

export function useLogs(
  seedDate: string,
  seedCTL: number,
  seedATL: number,
  { onPushLogs }: Callbacks = {},
) {
  const [logs, setLogs] = useState<WorkoutLog[]>(getWorkoutLogs)

  // Hydrate from server data (called once on load if server has more recent data)
  const hydrateFromServer = useCallback((serverLogs: WorkoutLog[]) => {
    bulkUpsertWorkoutLogs(serverLogs)
    setLogs(getWorkoutLogs())
  }, [])

  const saveLog = useCallback((log: WorkoutLog) => {
    upsertWorkoutLog(log)
    const updated = getWorkoutLogs()
    setLogs(updated)
    onPushLogs?.(updated)
  }, [onPushLogs])

  const removeLog = useCallback((id: string) => {
    deleteWorkoutLog(id)
    const updated = getWorkoutLogs()
    setLogs(updated)
    onPushLogs?.(updated)
  }, [onPushLogs])

  const syncLogs = useCallback((incoming: WorkoutLog[]) => {
    bulkUpsertWorkoutLogs(incoming)
    const updated = getWorkoutLogs()
    setLogs(updated)
    onPushLogs?.(updated)
  }, [onPushLogs])

  const logForDate = useCallback(
    (isoDate: string) => logs.find(l => l.date === isoDate) ?? null,
    [logs],
  )

  const loadHistory = useMemo(
    () => buildLoadHistory(logs, seedDate, seedCTL, seedATL),
    [logs, seedDate, seedCTL, seedATL],
  )

  const latestLoad = loadHistory[loadHistory.length - 1] ?? null

  return { logs, saveLog, removeLog, syncLogs, hydrateFromServer, logForDate, loadHistory, latestLoad }
}
