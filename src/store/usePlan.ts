import { useState, useCallback } from 'react'
import { LEADVILLE_2026 } from '../data/leadville2026'
import type { TrainingPlan, PlannedSession } from '../models/training'
import type { PlanEditProposal } from '../models/chat'

interface SessionOverride {
  weekNum: number
  dayDate: string
  changes: Partial<PlannedSession>
}

const STORAGE_KEY = 'adastra:plan-overrides'

function loadOverrides(): SessionOverride[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionOverride[]) : []
  } catch {
    return []
  }
}

function saveOverrides(overrides: SessionOverride[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

function applyOverrides(overrides: SessionOverride[]): TrainingPlan {
  return {
    ...LEADVILLE_2026,
    weeks: LEADVILLE_2026.weeks.map(week => ({
      ...week,
      days: week.days.map(day => {
        const override = overrides.find(
          o => o.weekNum === week.week && o.dayDate === day.date,
        )
        return override ? { ...day, ...override.changes } : day
      }),
    })),
  }
}

interface Callbacks {
  onPushOverrides?: (overrides: SessionOverride[]) => void
}

export function usePlan({ onPushOverrides }: Callbacks = {}) {
  const [overrides, setOverrides] = useState<SessionOverride[]>(loadOverrides)

  const hydrateFromServer = useCallback((serverOverrides: unknown[]) => {
    const parsed = serverOverrides as SessionOverride[]
    saveOverrides(parsed)
    setOverrides(parsed)
  }, [])

  const applyPlanEdits = useCallback((edits: PlanEditProposal[]) => {
    setOverrides(prev => {
      const next = [...prev]
      for (const edit of edits) {
        const idx = next.findIndex(
          o => o.weekNum === edit.weekNum && o.dayDate === edit.dayDate,
        )
        if (idx >= 0) {
          next[idx] = { ...next[idx], changes: { ...next[idx].changes, ...edit.changes } }
        } else {
          next.push({ weekNum: edit.weekNum, dayDate: edit.dayDate, changes: edit.changes })
        }
      }
      saveOverrides(next)
      onPushOverrides?.(next)
      return next
    })
  }, [onPushOverrides])

  const plan = applyOverrides(overrides)

  return { plan, applyPlanEdits, hydrateFromServer }
}
