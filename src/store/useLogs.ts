import { useState, useCallback, useMemo } from 'react'
import type { WorkoutLog } from '../models/log'
import { getWorkoutLogs, upsertWorkoutLog, deleteWorkoutLog } from './storage'
import { buildLoadHistory } from '../utils/trainingMath'

export function useLogs(seedDate: string, seedCTL: number, seedATL: number) {
  const [logs, setLogs] = useState<WorkoutLog[]>(getWorkoutLogs)

  const saveLog = useCallback((log: WorkoutLog) => {
    upsertWorkoutLog(log)
    setLogs(getWorkoutLogs())
  }, [])

  const removeLog = useCallback((id: string) => {
    deleteWorkoutLog(id)
    setLogs(getWorkoutLogs())
  }, [])

  // Find a log for a specific plan day (by date string like "3/16")
  const logForDate = useCallback(
    (isoDate: string) => logs.find(l => l.date === isoDate) ?? null,
    [logs],
  )

  // Build the full CTL/ATL/TSB history from all saved logs
  const loadHistory = useMemo(
    () => buildLoadHistory(logs, seedDate, seedCTL, seedATL),
    [logs, seedDate, seedCTL, seedATL],
  )

  // Latest training load snapshot
  const latestLoad = loadHistory[loadHistory.length - 1] ?? null

  return { logs, saveLog, removeLog, logForDate, loadHistory, latestLoad }
}
