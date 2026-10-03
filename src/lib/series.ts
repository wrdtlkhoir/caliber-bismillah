/** Generator time-series deterministik untuk mock telemetry (hasil sama tiap render). */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface TrendSpec {
  start: number
  end: number
  /** sigmoid = naik/turun halus; step = lompatan tajam; linear */
  shape: 'sigmoid' | 'step' | 'linear'
  /** posisi titik belok 0–1 */
  knee?: number
  /** amplitudo noise relatif terhadap |end-start| */
  noise?: number
  seed?: number
  points?: number
}

export function makeSeries({ start, end, shape, knee = 0.6, noise = 0.03, seed = 1, points = 49 }: TrendSpec): number[] {
  const rand = mulberry32(seed)
  const span = Math.abs(end - start) || Math.abs(end) * 0.1 || 1
  const steep = shape === 'step' ? 28 : 9
  return Array.from({ length: points }, (_, i) => {
    const x = i / (points - 1)
    const p = shape === 'linear' ? x : 1 / (1 + Math.exp(-steep * (x - knee)))
    const p0 = shape === 'linear' ? 0 : 1 / (1 + Math.exp(steep * knee))
    const p1 = shape === 'linear' ? 1 : 1 / (1 + Math.exp(-steep * (1 - knee)))
    const norm = (p - p0) / (p1 - p0)
    const jitter = i === points - 1 ? 0 : (rand() - 0.5) * 2 * noise * span
    return start + (end - start) * norm + jitter
  })
}
