# AdAstra — General Coach Chat + Post-Ride Chat

## Context
The post-ride chat (PostRideReflection) only appears after a completed workout on "Today". The user needs a second, always-available chat — a general coach conversation for discussing training broadly, asking about plan adjustments, nutrition, race strategy, etc. Two chat experiences, one persistent coach relationship.

---

## What We're Building

### 1. General Coach Chat — `CoachChat.tsx`
A full-screen overlay panel accessible from the FAB (a "Coach" pill alongside Today/Plan/Fitness). Single persistent conversation stored as `useChat('general')` — zero changes to the existing `useChat` hook or `api/chat/messages` endpoint.

**UI**: Full-screen overlay (`fixed inset-0 z-30 bg-zinc-950`) with:
- Header: "Coach" + close button
- Scrollable message area (full height, no max-h-80 cap like post-ride)
- Fixed bottom input bar
- Starter chips when empty: "How's my training going?", "Should I adjust this week?", "Help me plan race day nutrition", "Am I on track for Leadville?"
- Same bubble styling as PostRideReflection (user=zinc-700 right, assistant=zinc-800 border left)
- Send last 20 messages max to API (`.slice(-20)`) to avoid exceeding context window over months of use

**Context assembly** (built at send-time from current props):
```
GeneralChatContext {
  athlete     → name, FTP, maxHR, weight, goals
  fitness     → latest CTL, ATL, TSB
  currentWeek → weekNum, phase, projectedTSS, sessions with completion status
  nextWeek    → weekNum, phase, projectedTSS (summary only)
  recentLoad  → 14-day load history (more than post-ride's 7 days)
  compliance  → last 14 days: planned vs completed vs skipped count
}
```

### 2. General Chat API — `api/chat/general.ts`
Separate endpoint from post-ride chat. Different system prompt, different context shape, higher token limit.

- **System prompt**: Cycling coach persona who knows the athlete deeply. Includes athlete stats, current fitness, plan phase, this week's sessions with completion, next week preview, 14-day load + compliance. When asked about plan adjustments → gives specific recommendations with rationale, but frames as suggestions the athlete applies manually.
- **Model**: `claude-sonnet-4-6`, `max_tokens: 1024` (vs 512 for post-ride — general coaching answers tend to be longer)
- **Pattern**: Mirrors `api/chat/index.ts` exactly (POST, requireAuth, build system prompt, call Anthropic, return `{ reply }`)

### 3. FAB Update — `App.tsx`
Add "Coach" as a fourth pill in the FAB menu. Unlike Today/Plan/Fitness which switch tabs, Coach opens the overlay (`coachChatOpen` state). The pill gets a distinct accent (blue border) to signal it's not a tab.

---

### 4. Coach Briefing — Persistent System Prompt

A user-editable "about me" text that gets injected into **every** AI chat (both post-ride and general). This is how the coach learns what you're trying to accomplish beyond raw metrics.

**Content examples:**
- "Training for Leadville 100 MTB, my first 100-miler. Goal is sub-9 hours."
- "I tend to go too hard on easy days. Hold me accountable."
- "Bad left knee — avoid single-leg drills. PT says cycling is fine."
- "Can only train before 6am on weekdays. Weekends are flexible."
- "Wife and 2 kids — training has to fit around family."

**Storage:**
- New field `coachBriefing: string` on `AthleteProfile` (default: seeded with Geoff's Leadville context)
- Persists to localStorage + KV via existing `updateAthlete` path — zero new storage infra
- Editable from a small "Edit" link in the CoachChat header (inline textarea, save button)

**Injection:**
- Both `api/chat/index.ts` (post-ride) and `api/chat/general.ts` get the briefing prepended to their system prompts:
  ```
  Coach briefing from the athlete:
  "${context.coachBriefing}"
  ```
- Frontend sends `coachBriefing` as part of the context payload in both chat components

### 5. Export Plan to `devplans/`

Save the full implementation plan as `devplans/general-coach-chat.md` so it can be transferred to another machine.

---

## Files

| File | Action | Description |
|---|---|---|
| `api/chat/general.ts` | **Create** | New endpoint — GeneralChatContext interface, system prompt builder, POST handler |
| `src/components/chat/CoachChat.tsx` | **Create** | Full-screen overlay chat — context assembly, useChat('general'), POST to /api/chat/general, briefing editor |
| `src/App.tsx` | **Modify** | Add `coachChatOpen` state, Coach pill in FAB, render CoachChat overlay |
| `src/models/athlete.ts` | **Modify** | Add `coachBriefing: string` to `AthleteProfile` |
| `src/data/athlete-geoff.ts` | **Modify** | Seed default coach briefing |
| `api/chat/index.ts` | **Modify** | Accept + inject `coachBriefing` into post-ride system prompt |
| `src/components/today/PostRideReflection.tsx` | **Modify** | Pass `coachBriefing` in context payload |
| `devplans/general-coach-chat.md` | **Create** | Exported plan for portability |

**No changes needed to**: `useChat.ts`, `chat.ts`, `api/chat/messages.ts`

---

## Reuse
- `useChat('general')` from `src/store/useChat.ts` — works as-is, stores to `adastra:chat:general` / KV `chat:general`
- `api/chat/messages.ts` — fire-and-forget persist works as-is with `logId: 'general'`
- `PostRideReflection.tsx` chat UI pattern — replicated (not abstracted) in CoachChat for simplicity
- `planDateToISO()` + `todayISO()` from `src/utils/dateHelpers.ts` — for finding current week
- `currentWeekIndex()` pattern from `App.tsx` — for locating current/next week in plan

---

## Implementation Order
1. Add `coachBriefing` to athlete model + seed data
2. Create `api/chat/general.ts` (with briefing injection)
3. Update `api/chat/index.ts` to accept + inject briefing
4. Create `src/components/chat/CoachChat.tsx` (with briefing editor in header)
5. Update `PostRideReflection.tsx` to pass briefing in context
6. Modify `App.tsx` — add Coach pill + overlay
7. Export plan to `devplans/general-coach-chat.md`
8. Type-check, commit, push

---

## Verification
- Open app → tap FAB → see Coach pill with blue accent
- Tap Coach → full-screen chat overlay slides in
- Send "How's my training going?" → AI responds with CTL/ATL/TSB context, references plan phase
- Send "Should I adjust tomorrow's session?" → AI gives specific recommendation referencing the actual planned session
- Close overlay (X button) → back to previous tab
- Reopen Coach → conversation history preserved
- Post-ride chat (PostRideReflection) still works independently on Today tab
- Edit coach briefing from CoachChat header → save → next message reflects the new context
- Coach briefing appears in both post-ride and general chat system prompts
- `devplans/general-coach-chat.md` exists and contains full plan

---

## Previous — Completed

### ~~1. FAB Navigation (replaces bottom tab bar)~~

**Replace** the fixed bottom tab bar in `src/App.tsx` with a floating action button (FAB) in the bottom-right corner.

**Behavior:**
- Closed: large circle (56×56px), bottom-right, shows current tab initial ("T" / "P" / "F") or a menu icon
- Open: 3 labeled pills stack vertically above the FAB, each tapping to switch view and close the menu
- Click outside (backdrop tap) or click the FAB again to close
- Smooth CSS transition on open/close (`transition-all duration-200`)

**Visual:**
```
              [ Fitness ]
              [   Plan  ]
              [  Today  ]
                  (≡)       ← FAB circle, bottom-right
```

**Implementation:**
- `fabOpen` boolean state in `App.tsx`
- FAB circle: `fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-zinc-800 border border-zinc-600 shadow-lg`
- Pills: `fixed bottom-24 right-6 z-20 flex flex-col gap-2` — each pill is `bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-zinc-200`
- Active tab pill gets `border-blue-500 text-white`
- Semi-transparent backdrop: `fixed inset-0 z-10` (no visual, just click-to-close)
- Remove `pb-20` on scroll container, add `pb-24` instead (FAB needs clearance)

**Files:** `src/App.tsx` only

---

## 2. Timezone Bug Fix

`todayISO()` in `src/utils/dateHelpers.ts` uses `new Date().toISOString()` which is UTC. Users in US timezones (UTC-5 to UTC-8) see tomorrow's date in the evening.

**Fix:** Use local date components:
```typescript
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

**File:** `src/utils/dateHelpers.ts` — one function change

---

## 3. Interval Analysis from Strava Power Streams

When a completed Strava activity is viewed in TodayView, fetch the raw power stream and detect intervals. One API call per ride view — well within rate limits.

**New endpoint: `api/strava/streams.ts`**
- `GET /api/strava/streams?activityId=12345678&ftp=290`
- Authenticates via session cookie + Strava token cookie (same pattern as `api/activities.ts`)
- Calls `GET https://www.strava.com/api/v3/activities/{id}/streams?keys=watts,heartrate,time&key_by_type=true`
- Detects intervals in the power stream:
  1. Fill null gaps with 0
  2. Compute 30-sec rolling average
  3. Find contiguous segments where smoothed power ≥ 88% FTP (sweetspot threshold)
  4. Merge segments with gaps < 30 seconds
  5. Filter to durations ≥ 60 seconds
  6. For each interval: index, startSec, durationSec, avgWatts, maxWatts, avgHR?, tss
- Returns `{ intervals: Interval[] }`

**`Interval` type** (new file `src/models/interval.ts`):
```typescript
export interface Interval {
  index: number
  startSec: number
  durationSec: number
  avgWatts: number
  maxWatts: number
  avgHR?: number
  tss: number
}
```

**Frontend — `TodayView.tsx`:**
- Parse `activityId` from `log.id` (`"strava-12345678"` → `"12345678"`)
- If id starts with `"strava-"`, fetch streams on mount with `useEffect`
- Loading state: show spinner where intervals will appear
- Pass intervals to `PostRideReflection` context so Claude can coach on them

**Do NOT cache intervals in Redis** — fetched fresh each view, keeps storage lean.

---

## 4. Simplified Post-Ride UI

The current post-ride view has a detailed "Actual vs Planned" grid. Simplify it: key metrics in one clean row, intervals below, then chat.

**New post-ride layout:**
```
✓ Mon Mar 30 — VO₂max (Rebuild — 4-Min Reps)    138d

[TSS 98] [NP 302W] [88 min] [HR 162bpm]          ← single metrics row

INTERVALS (from Strava)
  #1  4:12  avg 318W  HR 171     ← compact rows
  #2  4:08  avg 322W  HR 174
  #3  4:05  avg 315W  HR 176
  #4  4:01  avg 308W  HR 178   ← fading effort = useful coaching signal

─────────────────────────────────
Coach · Post-Ride Debrief
[How did I do today?] [How's my fitness?]   ← starter chips
[input box]                        [Send]
```

- Remove the comparison grid and "Edit log" buried below it
- Add a small "Edit" link at the top-right of the metrics row instead
- Interval rows are compact: `#N  m:ss  avg XW  HR Ybpm` — if no intervals detected, hide section
- Chat interface stays the same (it's already clean)

**Files:** `src/components/today/TodayView.tsx`

---

## 5. Auto-Sync on Load + Compact Status Indicator

**Auto-sync:** In `useStrava.ts`, add an auto-sync effect that fires once after the server sync completes (i.e., after `authed` becomes true in App.tsx). Don't block the UI — run in background.

**Pattern:** Pass an `autoSync: boolean` prop from App to trigger the effect in `useStrava`. When `autoSync` becomes `true`, call `sync()` once.

**Compact status indicator** (replaces the current header buttons):
```
● Synced 9:42am        ← green dot, last sync time
● Syncing…             ← animated grey dot
● Connect Strava       ← orange dot, clickable
● Sync failed          ← red dot, clickable to retry
```

- Lives in the header, right side, replaces the current button block
- Single line, small text (`text-xs`), color-coded dot
- "Connect Strava" and "Sync failed" are still clickable (call `connect()` / `sync()`)
- Remove the verbose button labels

**Files:** `src/hooks/useStrava.ts`, `src/App.tsx`

---

## Redis Storage — 30MB is fine
- Athlete profile: ~1KB
- Workout logs: 300 bytes × 365/yr × 5 years = ~550KB
- Chat history: ~5KB/workout × 100 active workouts = ~500KB
- **Total estimated: ~1MB lifetime** — well within 30MB

---

## Files

| File | Action |
|---|---|
| `src/utils/dateHelpers.ts` | Fix `todayISO()` timezone bug |
| `src/App.tsx` | Replace tab bar with FAB, auto-sync trigger, compact Strava indicator |
| `src/hooks/useStrava.ts` | Add `autoSync` trigger effect |
| `src/components/today/TodayView.tsx` | Simplified post-ride layout, interval fetch + display |
| `src/models/interval.ts` | New — `Interval` interface |
| `api/strava/streams.ts` | New — streams endpoint + interval detection |

---

## Implementation Order
1. Fix `todayISO()` — tiny, immediate win
2. Build `api/strava/streams.ts`
3. Add `Interval` model + update TodayView post-ride layout + interval fetch
4. Update `PostRideReflection` to include intervals in chat context
5. Replace tab bar with FAB in `App.tsx`
6. Auto-sync + compact status indicator in `useStrava` + `App.tsx`

---

## Verification
- Fix: open app in evening US timezone → shows correct local date
- Post-ride view: completed Strava activity shows interval breakdown
- AI chat: coach references specific intervals ("your 4th interval power dropped 10W — sign of early fatigue")
- FAB: tap circle → menu opens above; tap option → switches view, menu closes; tap backdrop → closes
- Auto-sync: open app → Strava sync runs automatically in background → green dot appears
