import type { WorkoutType } from '../models/training'

const QUOTES: Record<WorkoutType, string[]> = {
  vo2: [
    "You just taught your heart to pump harder. It won't forget.",
    "VO₂ work is where champions are built — one gasp at a time.",
    "Five minutes feels like forever. That's the point.",
    "Oxygen debt is just a loan from your future self.",
    "Every interval at the red line closes the gap to Leadville.",
    "The burn is the adaptation talking.",
  ],
  threshold: [
    "Riding at threshold is a negotiation — you just won.",
    "Lactate is the body's way of saying 'keep going anyway.'",
    "Twenty minutes at the edge teaches you where the edge is.",
    "FTP went up the day you decided not to back off.",
    "Threshold work: uncomfortable enough to matter, sustainable enough to adapt.",
    "The discomfort you trained through today is tomorrow's ceiling.",
  ],
  sweetspot: [
    "Sweetspot: the zone where fitness compounds fastest.",
    "Not too easy, not too hard — exactly right for Leadville.",
    "Aerobic engine on. Slow build. Trust the process.",
    "Sweetspot watts now. Race-day watts in August.",
    "You're farming fitness in the most efficient field there is.",
    "Consistent sweetspot work is the quiet secret of every strong finisher.",
  ],
  endurance: [
    "There's no shortcut to endurance. You just rode the long way.",
    "Long miles build the foundation everything else rests on.",
    "The saddle is patient. So are you.",
    "Leadville is 100 miles of this. Today was training.",
    "Fat-burning, aerobic base, mental toughness — all one session.",
    "Every hour in the saddle is a deposit in the Leadville bank.",
  ],
  race: [
    "Full send. No apologies.",
    "Race pace teaches you things training never can.",
    "You compete the way you practice. Today you practiced winning.",
    "Every crit finish is a preview of the Leadville gun lap.",
    "Hard, fast, committed — exactly what August demands.",
    "Pain is temporary. Race results are forever.",
  ],
  strength: [
    "Every rep you grind now is a cramp you won't get in August.",
    "Legs that push hard don't also need to pull — gym work fixes that.",
    "Strong hips, stable core. The watts follow.",
    "Your quads are now 1% more bulletproof. Compound interest.",
    "The gym is where your bike fitness goes to get better.",
    "Force production off the bike becomes power on it.",
  ],
  rest: [
    "Adaptation happens when you stop. You're getting faster right now.",
    "Recovery isn't earned — it's required. Good call.",
    "The legs you rest today are the legs you race on tomorrow.",
    "Rest day: where the training you did all week pays off.",
    "Deliberate rest beats accidental overtraining every time.",
    "Champions are made in recovery as much as in work.",
  ],
}

export function getQuote(type: WorkoutType, seed: string): string {
  const pool = QUOTES[type]
  // Deterministic selection by date string — same quote on reload
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return pool[hash % pool.length]
}
