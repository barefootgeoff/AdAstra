import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_session.js'
import type { ChatMessage, PlanEditProposal } from '../../src/models/chat'

interface GeneralChatContext {
  athlete: {
    name: string
    ftp: number
    maxHR: number
    weight: number
    goals: Array<{ name: string; date: string; targetTime?: string }>
  }
  coachBriefing?: string
  fitness: { ctl: number; atl: number; tsb: number } | null
  currentWeek: {
    weekNum: number
    phase: string
    projectedTSS: string
    days: Array<{ label: string; type: string; day: string; date: string; completed: boolean; skipped: boolean }>
  } | null
  nextWeek: {
    weekNum: number
    phase: string
    projectedTSS: string
    days: Array<{ label: string; type: string; day: string; date: string }>
  } | null
  recentLoad: Array<{ date: string; ctl: number; atl: number; tsb: number; dailyTSS: number }>
  compliance: { planned: number; completed: number; skipped: number }
  activeTab: 'today' | 'plan' | 'fitness'
  todayContext: {
    session: { label: string; type: string; details: string[]; tss?: string; duration?: string } | null
    log: { actualTSS?: number; normalizedWatts?: number; avgHR?: number; rpe?: number; notes?: string } | null
    sessionDone: boolean
  }
}

const PLAN_EDITS_MARKER = 'PLAN_EDITS_JSON:'

function tsbState(tsb: number): string {
  if (tsb > 10) return 'fresh'
  if (tsb > 0) return 'neutral'
  if (tsb > -10) return 'slightly fatigued'
  if (tsb > -20) return 'fatigued'
  return 'very fatigued'
}

function parseReplyAndEdits(text: string): { reply: string; planEdits: PlanEditProposal[] } {
  const markerIdx = text.lastIndexOf(PLAN_EDITS_MARKER)
  if (markerIdx === -1) return { reply: text.trim(), planEdits: [] }
  const reply = text.slice(0, markerIdx).trim()
  try {
    const raw = text.slice(markerIdx + PLAN_EDITS_MARKER.length).trim()
    const planEdits = JSON.parse(raw) as PlanEditProposal[]
    return { reply, planEdits: Array.isArray(planEdits) ? planEdits : [] }
  } catch {
    return { reply, planEdits: [] }
  }
}

function buildViewContextSection(ctx: GeneralChatContext): string {
  const { activeTab, todayContext } = ctx
  if (activeTab === 'today') {
    if (!todayContext.session) {
      return 'Current view: Athlete is on the Today tab. No planned session today (rest or unplanned).'
    }
    const s = todayContext.session
    const sessionLine = `${s.label} (${s.type})${s.duration ? `, ${s.duration}` : ''}${s.tss ? `, ~${s.tss} TSS` : ''}`
    const detailsLine = s.details.slice(0, 4).join(' | ')
    if (todayContext.sessionDone && todayContext.log) {
      const l = todayContext.log
      const actuals = [
        l.actualTSS != null && `TSS ${l.actualTSS}`,
        l.normalizedWatts != null && `NP ${l.normalizedWatts}W`,
        l.avgHR != null && `avg HR ${l.avgHR}bpm`,
        l.rpe != null && `RPE ${l.rpe}/10`,
      ].filter(Boolean).join(', ')
      return `Current view: Athlete is on the Today tab — session COMPLETED.
Today's session: ${sessionLine}
Session details: ${detailsLine}
Actual result: ${actuals || 'logged'}${l.notes ? `\nAthlete notes: "${l.notes}"` : ''}`
    }
    return `Current view: Athlete is on the Today tab — session NOT YET completed, athlete is preparing.
Today's session: ${sessionLine}
Session details: ${detailsLine}`
  }
  if (activeTab === 'plan') {
    return 'Current view: Athlete is looking at their full training plan — likely has a question about scheduling, session sequencing, or weekly structure.'
  }
  return 'Current view: Athlete is looking at their fitness/load metrics (CTL, ATL, TSB) — likely wants analysis of training load trends or pacing toward race day.'
}

function buildSystemPrompt(ctx: GeneralChatContext): string {
  const { athlete, fitness, currentWeek, nextWeek, recentLoad, compliance } = ctx
  const goal = athlete.goals[0]

  const briefingSection = ctx.coachBriefing
    ? `Coach briefing from the athlete:\n"${ctx.coachBriefing}"\n\n`
    : ''

  const viewContextSection = buildViewContextSection(ctx)

  const fitnessSection = fitness
    ? `Current fitness:
- CTL (fitness): ${fitness.ctl.toFixed(1)}
- ATL (fatigue): ${fitness.atl.toFixed(1)}
- TSB (form): ${fitness.tsb > 0 ? '+' : ''}${fitness.tsb.toFixed(1)} — ${tsbState(fitness.tsb)}`
    : 'Current fitness: no data yet'

  const weekSection = currentWeek
    ? `Current training week (Week ${currentWeek.weekNum} — ${currentWeek.phase}, projected TSS ${currentWeek.projectedTSS}):
${currentWeek.days.map(d => {
  const status = d.completed ? '✓' : d.skipped ? '✗' : '○'
  return `  ${status} ${d.day} ${d.date} — ${d.label} (${d.type})`
}).join('\n')}`
    : 'Current week: no plan data'

  const nextWeekSection = nextWeek
    ? `Next week (Week ${nextWeek.weekNum} — ${nextWeek.phase}, projected TSS ${nextWeek.projectedTSS}):
${nextWeek.days.map(d => `  ○ ${d.day} ${d.date} — ${d.label} (${d.type})`).join('\n')}`
    : ''

  const loadTrend = recentLoad.length >= 2
    ? (() => {
        const first = recentLoad[0]
        const last = recentLoad[recentLoad.length - 1]
        const ctlChange = (last.ctl - first.ctl).toFixed(1)
        return `14-day CTL change: ${Number(ctlChange) >= 0 ? '+' : ''}${ctlChange}`
      })()
    : ''

  const complianceSection = `Last 14 days: ${compliance.completed} completed, ${compliance.skipped} skipped (of ${compliance.planned} planned)`

  return `${briefingSection}You are a cycling coach having a training conversation with ${athlete.name}.

Athlete:
- FTP ${athlete.ftp}W, Max HR ${athlete.maxHR}bpm, Weight ${athlete.weight}kg
- Goal: ${goal?.name ?? 'n/a'} on ${goal?.date ?? 'n/a'}, target ${goal?.targetTime ?? 'n/a'}

${viewContextSection}

${fitnessSection}

${weekSection}
${nextWeekSection ? '\n' + nextWeekSection : ''}

Training compliance:
${complianceSection}
${loadTrend ? loadTrend : ''}

## Formatting
Use markdown in your replies: **bold** for emphasis, bullet lists for session details, ## headings for sections, and --- to separate sections. Keep replies focused and conversational.

## Plan Editing
You can propose direct edits to the athlete's training plan. When proposing changes (swapping sessions, adjusting targets, moving sessions to other days), include a JSON block at the very end of your reply using EXACTLY this format:

PLAN_EDITS_JSON:[
  {
    "weekNum": <number — must match week number shown above>,
    "dayDate": "<date string — MUST exactly match the date shown above, e.g. '4/3'>",
    "description": "<one-line human summary of the change>",
    "changes": {
      "label": "<optional new label>",
      "type": "<optional: vo2|threshold|sweetspot|strength|endurance|race|rest>",
      "details": ["<optional new details array>"],
      "duration": "<optional>",
      "tss": "<optional>",
      "fuel": "<optional>",
      "why": "<optional>"
    }
  }
]

IMPORTANT: dayDate must be copied exactly from the plan (e.g. "4/3", "4/6") — do not reformat it.
To MOVE a session: include TWO entries — one to replace the original slot, one to fill the destination slot.
Only include fields that actually change. Only add PLAN_EDITS_JSON when proposing concrete plan changes the athlete confirmed or asked for. The athlete sees an approval screen before anything is applied.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  if (!requireAuth(req, res)) return

  const { messages, context } = req.body as {
    messages: ChatMessage[]
    context: GeneralChatContext
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(context),
        messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      console.error('Anthropic error:', await response.text())
      res.status(502).json({ error: 'upstream_error' })
      return
    }

    const data = await response.json() as { content: Array<{ text: string }> }
    const rawText = data.content[0]?.text ?? ''
    const { reply, planEdits } = parseReplyAndEdits(rawText)
    res.status(200).json({ reply, planEdits: planEdits.length ? planEdits : undefined })
  } catch (err) {
    console.error('api/chat/general error:', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
