export interface Interval {
  index: number
  startSec: number
  durationSec: number
  avgWatts: number
  maxWatts?: number
  avgHR?: number
  tss: number
  zone?: 'sweetspot' | 'threshold' | 'vo2'  // power zone classification
  pacingRatio?: number                        // secondHalf/firstHalf avg watts; >1 = neg split
  avgCadence?: number                         // rpm
  vi?: number                                 // Variability Index = NP / avgWatts
  intensityFactor?: number                    // IF = NP / FTP
}
