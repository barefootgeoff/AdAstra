import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import { callAnthropic } from '../_anthropic.js'
import type { ChatMessage } from '../../src/models/chat'

interface TrainingContext {
  athlete: {
    name: string
    ftp: number
    maxHR: number
    weight: number
    goals: Array<{ name: string; date: string; targetTime?: string }>
  }
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
  coachBriefing?: string
  recentLoad: Array<{ date: string; ctl: number; atl: number; tsb: number; dailyTSS: number }>
  intervals?: Array<{ index: number; durationSec: number; avgWatts: number; maxWatts: number; avgHR?: number; tss: number }>
}

function buildSystemPrompt(ctx: TrainingContext): string {
  const { athlete, planned, actual, recentLoad } = ctx
  const latest = recentLoad[recentLoad.length - 1]
  const ctl = latest ? latest.ctl.toFixed(1) : 'unknown'
  const tsb = latest ? (latest.tsb > 0 ? `+${latest.tsb.toFixed(1)}` : latest.tsb.toFixed(1)) : 'unknown'
  const goal = athlete.goals[0]

  const briefingSection = ctx.coachBriefing
    ? `Coach briefing from the athlete:\n"${ctx.coachBriefing}"\n\n`
    : ''

  return `${briefingSection}You are a cycling coach having a post-ride debrief with ${athlete.name}.

Athlete:
- FTP ${athlete.ftp}W, Max HR ${athlete.maxHR}bpm, Weight ${athlete.weight}kg
- CTL (fitness): ${ctl}, TSB (form): ${tsb}
- Goal: ${goal?.name ?? 'n/a'} on ${goal?.date ?? 'n/a'}, target ${goal?.targetTime ?? 'n/a'}

Planned session:
- ${planned.label} (${planned.type}), ${planned.duration ?? '—'}, ${planned.tss ?? '—'} TSS
- Why: ${planned.why ?? 'n/a'}

What actually happened:
- Duration: ${actual.durationMinutes ?? '—'}min, Avg: ${actual.avgWatts ?? '—'}W, NP: ${actual.normalizedWatts ?? '—'}W
- Avg HR: ${actual.avgHR ?? '—'}bpm, Peak HR: ${actual.peakHR ?? '—'}bpm
- TSS: ${actual.actualTSS ?? '—'}, RPE: ${actual.rpe ?? '—'}/10
${actual.work != null ? `- Work: ${actual.work} kJ\n` : ''}${actual.intensityFactor != null ? `- IF: ${actual.intensityFactor}\n` : ''}${actual.variabilityIndex != null ? `- VI: ${actual.variabilityIndex}\n` : ''}${actual.efficiencyFactor != null ? `- EF: ${actual.efficiencyFactor}\n` : ''}${actual.wPerKg != null ? `- W/kg: ${actual.wPerKg}\n` : ''}${actual.totalElevationGain != null ? `- Elevation gain: ${actual.totalElevationGain} m\n` : ''}${actual.vam != null ? `- VAM: ${actual.vam} m/h\n` : ''}- Notes: ${actual.notes ?? 'none'}

Interval breakdown from power data:
${ctx.intervals && ctx.intervals.length > 0
  ? ctx.intervals.map(iv => {
      const dur = `${Math.floor(iv.durationSec / 60)}:${String(iv.durationSec % 60).padStart(2, '0')}`
      return `  #${iv.index}: ${dur}, avg ${iv.avgWatts}W (${Math.round(iv.avgWatts / athlete.ftp * 100)}% FTP)${iv.avgHR ? `, HR ${iv.avgHR}bpm` : ''}`
    }).join('\n')
  : '  No interval data available'}

Be concise (2–4 sentences), specific to the numbers, and direct. Speak to ${athlete.name} by name occasionally. Do not recite all the data back — use it to coach.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const { messages, context } = req.body as {
    messages: ChatMessage[]
    context: TrainingContext
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  try {
    const { text } = await callAnthropic({
      apiKey,
      model: 'claude-sonnet-4-6',
      maxTokens: 512,
      system: buildSystemPrompt(context),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    res.status(200).json({ reply: text })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    console.error('api/chat error:', err)
    if (code === 'overloaded') {
      res.status(503).json({ error: 'overloaded' })
    } else {
      res.status(502).json({ error: 'upstream_error' })
    }
  }
}
