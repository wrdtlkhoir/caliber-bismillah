import { useState } from 'react'
import type { ParetoRow } from '@/data/plant'

const W = 320
const H = 190
const PAD = { l: 34, r: 30, t: 10, b: 22 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const CUTOFF = 80

const fmtK = (v: number) => `$${Math.round(v).toLocaleString('en-US')}k`


export function LossPareto({ rows }: { rows: ParetoRow[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (!rows.length) return <p className="py-8 text-center text-[13.5px] text-ink-3">No incidents in this period.</p>

  const max = rows[0].lossK
  const step = PLOT_W / rows.length
  const barW = Math.max(4, Math.min(22, step * 0.7))
  const x = (i: number) => PAD.l + step * i + step / 2
  const yLoss = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H
  const yPct = (p: number) => PAD.t + PLOT_H - (p / 100) * PLOT_H
  const vital = rows.findIndex((r) => r.cumPct >= CUTOFF) + 1 || rows.length
  const total = rows.reduce((s, r) => s + r.lossK, 0)
  const shown = hover !== null ? rows[hover] : null
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yPct(r.cumPct).toFixed(1)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pareto of total loss by equipment type" onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map((p) => (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yPct(p)} y2={yPct(p)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={W - PAD.r + 4} y={yPct(p) + 3} fontSize={9} fill="var(--color-ink-3)" fontFamily="var(--font-mono)">
              {p}%
            </text>
            <text x={PAD.l - 4} y={yPct(p) + 3} fontSize={9} fill="var(--color-ink-3)" textAnchor="end" fontFamily="var(--font-mono)">
              {p === 0 ? '0' : `${Math.round((max * p) / 100)}`}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={yPct(CUTOFF)} y2={yPct(CUTOFF)} stroke="var(--color-ink-3)" strokeDasharray="3 3" strokeWidth={1} />
        <text x={W - PAD.r + 4} y={yPct(CUTOFF) + 3} fontSize={9} fill="var(--color-ink-2)" fontFamily="var(--font-mono)">
          80%
        </text>

        {rows.map((r, i) => (
          <g key={r.code} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - step / 2} y={PAD.t} width={step} height={PLOT_H} fill="transparent" />
            <rect
              x={x(i) - barW / 2}
              y={yLoss(r.lossK)}
              width={barW}
              height={PAD.t + PLOT_H - yLoss(r.lossK)}
              rx={1.5}
              fill="var(--color-navy-700)"
              fillOpacity={i < vital ? (hover === null || hover === i ? 1 : 0.7) : hover === i ? 0.45 : 0.25}
            />
            <text x={x(i)} y={H - 8} fontSize={9} fill={i < vital ? 'var(--color-ink)' : 'var(--color-ink-3)'} textAnchor="middle" fontFamily="var(--font-mono)">
              {r.code}
            </text>
          </g>
        ))}

        <path d={line} fill="none" stroke="var(--color-navy-950)" strokeWidth={1.5} />
        {rows.map((r, i) => (
          <circle key={r.code} cx={x(i)} cy={yPct(r.cumPct)} r={hover === i ? 3 : 2} fill="var(--color-navy-950)" />
        ))}
      </svg>

      <p className="mt-1 min-h-[20px] font-mono text-[12px] text-ink-2">
        {shown ? (
          <>
            <span className="font-semibold text-ink">{shown.code}</span>: {fmtK(shown.lossK)}, {shown.count} incident{shown.count === 1 ? '' : 's'}, cumulative{' '}
            {shown.cumPct.toFixed(0)}%
          </>
        ) : (
          <>
            <span className="font-semibold text-ink">{rows.slice(0, vital).map((r) => r.code).join(', ')}</span> account for {rows[vital - 1].cumPct.toFixed(0)}% of{' '}
            {fmtK(total)} ({vital} of {rows.length} types)
          </>
        )}
      </p>
    </div>
  )
}
