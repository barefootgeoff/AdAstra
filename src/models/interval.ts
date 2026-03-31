export interface Interval {
  index: number
  startSec: number
  durationSec: number
  avgWatts: number
  maxWatts: number
  avgHR?: number
  tss: number
}
