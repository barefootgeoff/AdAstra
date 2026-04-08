import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import { callAnthropic } from '../_anthropic.js'
import type { AthleteMemory } from '../../src/models/athlete'

interface SummaryContext {
  athlete: {
    name: string
    ftp: number
    maxHR: number
    weight: number
    goals: Array<{ name: string; date: string; targetTime?: string }>
  }
  coachBriefing?: string
  memory?: AthleteMemory
  planned: {
    label: string
    type: string
    duration?: string
    tss?: string
    details: string[]
    why?: string
  }
  actual: {
    durationMinutes?: number
    avgWatts?: number
    normalizedWatts?: number
    avgHR?: number
    peakHR?: number
    rpe?: number
    actualTSS?: number
    notes?: string
    work?: number              // kJ
    intensityFactor?: number
    variabilityIndex?: number
    efficiencyFactor?: number
    wPerKg?: number
    totalElevationGain?: number // m
    vam?: number                // m/h
  }
  recentLoad: Array<{ date: string; ctl: number; atl: number; tsb: number; dailyTSS: number }>
  intervals?: Array<{
    index: number
    durationSec: number
    avgWatts: number
    maxWatts?: number
    avgHR?: number
    tss: number
    zone?: string
    pacingRatio?: number
    avgCadence?: number
    vi?: number
    intensityFactor?: number
  }>
}

function buildSummaryPrompt(ctx: SummaryContext): string {
  const { athlete, planned, actual, recentLoad } = ctx
  const latest = recentLoad[recentLoad.length - 1]
  const ctl = latest ? latest.ctl.toFixed(1) : 'unknown'
  const tsb = latest ? (latest.tsb > 0 ? `+${latest.tsb.toFixed(1)}` : latest.tsb.toFixed(1)) : 'unknown'
  const goal = athlete.goals[0]

  const extras: string[] = []
  if (actual.work != null) extras.push(`Work ${actual.work}kJ`)
  if (actual.intensityFactor != null) extras.push(`IF ${actual.intensityFactor}`)
  if (actual.variabilityIndex != null) extras.push(`VI ${actual.variabilityIndex}`)
  if (actual.efficiencyFactor != null) extras.push(`EF ${actual.efficiencyFactor}`)
  if (actual.wPerKg != null) extras.push(`${actual.wPerKg}W/kg`)
  if (actual.totalElevationGain != null) extras.push(`${actual.totalElevationGain}m climbed`)
  if (actual.vam != null) extras.push(`VAM ${actual.vam}m/h`)
  const extrasLine = extras.length > 0 ? `\nMetrics: ${extras.join(', ')}` : ''

  return `You are a cycling coach. Write a concise 3–4 sentence ride summary for ${athlete.name}.

Athlete: FTP ${athlete.ftp}W, Max HR ${athlete.maxHR}bpm, CTL ${ctl}, TSB ${tsb}
Goal: ${goal?.name ?? 'n/a'} on ${goal?.date ?? 'n/a'}

Planned: ${planned.label} (${planned.type}), ${planned.duration ?? '—'}, ${planned.tss ?? '—'} TSS
Why: ${planned.why ?? 'n/a'}

Actual: ${actual.durationMinutes ?? '—'}min, avg ${actual.avgWatts ?? '—'}W, NP ${actual.normalizedWatts ?? '—'}W, avg HR ${actual.avgHR ?? '—'}bpm, TSS ${actual.actualTSS ?? '—'}, RPE ${actual.rpe ?? '—'}/10${extrasLine}
Notes: ${actual.notes ?? 'none'}

${ctx.intervals && ctx.intervals.length > 0
  ? `Intervals:\n${ctx.intervals.map(iv => {
      const dur = `${Math.floor(iv.durationSec / 60)}:${String(iv.durationSec % 60).padStart(2, '0')}`
      const zone = iv.zone ? `[${iv.zone.toUpperCase()}]` : `[${Math.round(iv.avgWatts / athlete.ftp * 100)}%FTP]`
      const pacing = iv.pacingRatio != null
        ? (iv.pacingRatio >= 1.02 ? `neg-split +${Math.round((iv.pacingRatio - 1) * 100)}%`
           : iv.pacingRatio <= 0.98 ? `pos-split -${Math.round((1 - iv.pacingRatio) * 100)}%`
           : 'even pacing')
        : ''
      const extras = [
        iv.intensityFactor != null && `IF:${iv.intensityFactor}`,
        iv.vi != null && `VI:${iv.vi}`,
        iv.avgCadence != null && `${iv.avgCadence}rpm`,
        iv.avgHR != null && `${iv.avgHR}bpm`,
        pacing,
      ].filter(Boolean).join(' ')
      return `  #${iv.index} ${dur} ${iv.avgWatts}W ${zone}${extras ? ' — ' + extras : ''}`
    }).join('\n')}`
  : ''}

Write a warm, encouraging 3–4 sentence summary. Lead with one genuine positive from the ride. Note how it compared to the plan. Close with one forward-looking takeaway. If anything fell short, frame it as a learning not a failure. No markdown. Speak directly to ${athlete.name}.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const { context } = req.body as { context: SummaryContext }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  try {
    const { text } = await callAnthropic({
      apiKey,
      model: 'claude-sonnet-4-6',
      maxTokens: 200,
      system: buildSummaryPrompt(context),
      messages: [{ role: 'user', content: 'Summarize this ride.' }],
    })
    res.status(200).json({ summary: text })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    console.error('api/chat/summary error:', err)
    if (code === 'overloaded') {
      res.status(503).json({ error: 'overloaded' })
    } else {
      res.status(502).json({ error: 'upstream_error' })
    }
  }
}
