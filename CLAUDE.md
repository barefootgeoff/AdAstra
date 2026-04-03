# AdAstra

Cycling training dashboard for Leadville 100 MTB 2026 prep. React + Vite + Tailwind, Vercel serverless.

## Stack

- Frontend: React 18, TypeScript, Tailwind v4, Recharts
- Backend: Vercel serverless functions (`api/`), Vercel KV (Redis)
- AI: Anthropic API (claude-sonnet-4-6) for coaching chat
- Data: Strava OAuth for activity sync

## Conventions

- Dark theme (zinc-950 base), mobile-first
- State in custom hooks (`useAthlete`, `useLogs`, `useChat`, `useStrava`)
- localStorage + KV dual persistence (fire-and-forget server push)
- Training plan is static data (`src/data/leadville2026.ts`)
- Feature plans go in `devplans/`
- Hamburger menu (top-right header button) opens a right-side drawer for navigation (Today / Plan / Fitness / Coach)
- Chat bubbles: user = `bg-zinc-700` right-aligned, assistant = `bg-zinc-800/80 border` left-aligned

## Key Architecture

- `src/App.tsx` — root component, tab state, FAB, CoachChat overlay, Strava indicator
- `src/components/today/TodayView.tsx` — today's session, post-ride metrics + intervals + chat
- `src/components/chat/CoachChat.tsx` — general coach chat (full-screen overlay, `useChat('general')`)
- `src/components/today/PostRideReflection.tsx` — post-ride AI debrief (per-workout, `useChat(logId)`)
- `api/chat/index.ts` — post-ride chat endpoint (512 tokens)
- `api/chat/general.ts` — general coach chat endpoint (1024 tokens)
- `api/chat/messages.ts` — chat message persistence to KV
- `src/utils/trainingMath.ts` — TSS, CTL/ATL/TSB calculations
- `src/models/` — TypeScript interfaces for athlete, training, load, log, chat, interval

## Dev Workflow

- `npm run dev` — local Vite dev server
- `npm run build` — type-check + production build
- PRs merge to `main`, Vercel auto-deploys
- Keep this file updated when architecture changes
