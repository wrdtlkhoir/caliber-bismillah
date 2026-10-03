import { useEffect, useState } from 'react'
import { seriesOf, type TrendParam } from '@/data/investigation'

const TICK_MS = 1500

/**
 * Menyimpan series tiap parameter. Saat `live` aktif, setiap tick titik baru
 * ditambahkan (random walk kecil yang melanjutkan tren) dan titik tertua dibuang.
 */
export function useLiveSeries(params: TrendParam[], live: boolean) {
  const [series, setSeries] = useState(() => init(params))

  useEffect(() => setSeries(init(params)), [params])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => {
      setSeries((prev) => {
        const next: Record<string, number[]> = {}
        for (const p of params) {
          const s = prev[p.key]
          const span = Math.abs(p.trend.end - p.trend.start) || Math.abs(p.trend.end) * 0.05 || 1
          const drift = (p.trend.end - p.trend.start) / s.length
          const last = s[s.length - 1]
          next[p.key] = [...s.slice(1), last + drift * 0.6 + (Math.random() - 0.5) * span * 0.04]
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(t)
  }, [live, params])

  return series
}

function init(params: TrendParam[]) {
  return Object.fromEntries(params.map((p) => [p.key, seriesOf(p)]))
}
