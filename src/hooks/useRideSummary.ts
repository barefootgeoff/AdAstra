import { useState, useEffect } from 'react'
import type { AthleteProfile } from '../models/athlete'
import type { PlannedSession } from '../models/training'
import type { WorkoutLog } from '../models/log'
import type { TrainingLoad } from '../models/load'
import type { Interval } from '../models/interval'
import { computeRideMetrics } from '../utils/trainingMath'

function cacheKey(logId: string) {
  return `adastra:summary:${logId}`
}

function loadCached(logId: string): string | null {
  try {
    return localStorage.getItem(cacheKey(logId))
  } catch {
    return null
  }
}

function storeCache(logId: string, summary: string) {
  try {
    localStorage.setItem(cacheKey(logId), summary)
  } catch {
    // ignore storage errors
  }
}

interface UseRideSummaryOptions {
  athlete: AthleteProfile
  plannedSession: PlannedSession | null
  log: WorkoutLog | null
  loadHistory: TrainingLoad[]
  intervals: Interval[]
}

export function useRideSummary({ athlete, plannedSession, log, loadHistory, intervals }: UseRideSummaryOptions) {
  const [summary, setSummary] = useState<string | null>(() => log ? loadCached(log.id) : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!log || !plannedSession) return
    if (summary) return
    setLoading(true)

    const context = {
      athlete: {
        name: athlete.name,
        ftp: athlete.ftp,
        maxHR: athlete.maxHR,
        weight: athlete.weight,
        goals: athlete.goals,
      },
      coachBriefing: athlete.coachBriefing,
      planned: {
        label: plannedSession.label,
        type: plannedSession.type,
        duration: plannedSession.duration,
        tss: plannedSession.tss,
        details: plannedSession.details,
        why: plannedSession.why,
      },
      actual: (() => {
        const m = computeRideMetrics(log, athlete)
        return {
          durationMinutes: log.durationMinutes,
          avgWatts: log.avgWatts,
          normalizedWatts: log.normalizedWatts,
          avgHR: log.avgHR,
          peakHR: log.peakHR,
          rpe: log.rpe,
          actualTSS: log.actualTSS,
          notes: log.notes,
          work: m.work != null ? Math.round(m.work) : undefined,
          intensityFactor: m.intensityFactor != null ? Number(m.intensityFactor.toFixed(2)) : undefined,
          variabilityIndex: m.variabilityIndex != null ? Number(m.variabilityIndex.toFixed(2)) : undefined,
          efficiencyFactor: m.efficiencyFactor != null ? Number(m.efficiencyFactor.toFixed(2)) : undefined,
          wPerKg: m.wPerKg != null ? Number(m.wPerKg.toFixed(2)) : undefined,
          totalElevationGain: m.totalElevationGain ?? undefined,
          vam: m.vam != null ? Math.round(m.vam) : undefined,
        }
      })(),
      recentLoad: loadHistory.slice(-7).map(l => ({
        date: l.date, ctl: l.ctl, atl: l.atl, tsb: l.tsb, dailyTSS: l.dailyTSS,
      })),
      intervals: intervals.map(iv => ({
        index: iv.index,
        durationSec: iv.durationSec,
        avgWatts: iv.avgWatts,
        maxWatts: iv.maxWatts,
        avgHR: iv.avgHR,
        tss: iv.tss,
      })),
    }

    fetch('/api/chat/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { summary: string }) => {
        setSummary(data.summary)
        storeCache(log.id, data.summary)
      })
      .catch(() => {
        // leave summary null — UI shows fallback
      })
      .finally(() => setLoading(false))
  }, [log?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return { summary, loading }
}
