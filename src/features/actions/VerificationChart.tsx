import { useState, type PointerEvent } from 'react'
import type { ActionCase } from '@/data/actions'
import { fmtDate } from '@/lib/asOf'
import { useElementWidth } from '@/lib/useElementWidth'

const H = 170
const PAD = { top: 22, bottom: 26 }

/**
 * Before vs after dari history condition monitoring: merah sampai failure,
 * hijau sesudah perbaikan, dipisah garis vertikal di tanggal failure.
 */
export function VerificationChart({ v }: { v: ActionCase['verification'] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const all = [...v.before, ...v.after]
  const n = all.length
  const split = v.before.length - 1

  const refs = [v.alarm, v.trip, ...v.normal]
  const vals = all.map((p) => p.value)
  const lo0 = Math.min(...vals, ...refs)
  const hi0 = Math.max(...vals, ...refs)
  const pad = (hi0 - lo0) * 0.1
  const lo = lo0 - pad
  const hi = hi0 + pad

  const x = (i: number) => (i / Math.max(1, n - 1)) * width
  const y = (val: number) => PAD.top + (1 - (val - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  const line = (pts: { value: number }[], offset: number) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i + offset).toFixed(1)},${y(p.value).toFixed(1)}`).join('')

  const worst = v.alarmDir === 'low' ? Math.min(...v.before.map((p) => p.value)) : Math.max(...v.before.map((p) => p.value))
  const worstIdx = v.before.findIndex((p) => p.value === worst)
  const current = all[n - 1]?.value ?? 0
  const fmt = (val: number) => val.toFixed(v.digits)
  const hasAfter = v.after.length > 0
  const labelLeft = x(split) > width * 0.5

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
  }

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3 font-mono text-[11.5px] text-ink-2">
        <span>
          {v.title} ({v.unit}), weekly CM
        </span>
        <div className="flex gap-4">
          <span className="flex items-start gap-1.5">
            <span className="mt-1.5 h-0.5 w-2.5 bg-critical" />
            <span>
              Trip{v.alarmDir === 'low' ? ' low' : ''}
              <br />
              {v.trip}
            </span>
          </span>
          <span className="flex items-start gap-1.5">
            <span className="mt-1.5 h-0.5 w-2.5 bg-medium" />
            <span>
              Alarm{v.alarmDir === 'low' ? ' low' : ''}
              <br />
              {v.alarm}
            </span>
          </span>
        </div>
      </div>

      <div ref={ref} className="relative mt-2" style={{ height: H }}>
        {width > 0 && n > 1 && (
          <svg width={width} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${v.title} before and after repair`}>
            <rect x={0} width={width} y={y(v.normal[1])} height={Math.max(0, y(v.normal[0]) - y(v.normal[1]))} fill="var(--color-good-soft)" opacity={0.8} />
            <line x1={0} x2={width} y1={y(v.trip)} y2={y(v.trip)} stroke="var(--color-critical)" strokeDasharray="4 4" strokeOpacity={0.7} />
            <line x1={0} x2={width} y1={y(v.alarm)} y2={y(v.alarm)} stroke="var(--color-medium)" strokeDasharray="4 4" />

            <path d={line(v.before, 0)} fill="none" stroke="var(--color-critical)" strokeWidth={2} strokeLinejoin="round" />
            {hasAfter && (
              <>
                <path d={`M${x(split)},${y(v.before[split].value)} L${x(split + 1)},${y(v.after[0].value)}`} stroke="var(--color-ink-3)" strokeWidth={1.5} strokeDasharray="2 3" />
                <path d={line(v.after, split + 1)} fill="none" stroke="var(--color-good)" strokeWidth={2} strokeLinejoin="round" />
                <line x1={x(split)} x2={x(split)} y1={6} y2={H - PAD.bottom} stroke="var(--color-navy-900)" strokeDasharray="3 3" />
              </>
            )}

            <circle cx={x(worstIdx)} cy={y(worst)} r={3.5} fill="var(--color-critical)" />
            <circle cx={x(n - 1) - 3} cy={y(current)} r={3.5} fill={hasAfter ? 'var(--color-good)' : 'var(--color-critical)'} />

            <text x={x(worstIdx) - 6} y={y(worst) + (v.alarmDir === 'low' ? 14 : -7)} textAnchor="end" className="fill-critical font-mono text-[10px]">
              {v.alarmDir === 'low' ? 'Low' : 'Peak'}: {fmt(worst)}
            </text>
            {hasAfter && (
              <>
                <text
                  x={labelLeft ? x(split) - 4 : x(split) + 4}
                  y={v.alarmDir === 'low' ? 14 : H - PAD.bottom - 6}
                  textAnchor={labelLeft ? 'end' : 'start'}
                  className="fill-ink font-mono text-[9.5px] font-medium"
                >
                  {v.eventLabel}
                </text>
                <text x={width - 2} y={y(current) + (v.alarmDir === 'low' ? 14 : -8)} textAnchor="end" className="fill-good font-mono text-[10px] font-semibold">
                  Latest: {fmt(current)} {v.unit}
                </text>
              </>
            )}

            <text x={4} y={H - 8} className="fill-ink-3 font-mono text-[9.5px]">
              {fmtDate(all[0].date, { day: '2-digit', month: 'short' })}
            </text>
            <text x={width - 4} y={H - 8} textAnchor="end" className="fill-ink-3 font-mono text-[9.5px]">
              {fmtDate(all[n - 1].date, { day: '2-digit', month: 'short' })}
            </text>

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-ink-3)" strokeDasharray="2 3" />
                <circle cx={x(hover)} cy={y(all[hover].value)} r={4} fill={hover > split ? 'var(--color-good)' : 'var(--color-critical)'} stroke="white" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 whitespace-nowrap rounded bg-ink px-2 py-1 font-mono text-[11px] text-white shadow-lg"
            style={{ left: Math.min(Math.max(x(hover) - 60, 0), width - 150) }}
          >
            {fmtDate(all[hover].date, { day: '2-digit', month: 'short' })}, {hover > split ? 'after' : 'before'}: {fmt(all[hover].value)} {v.unit}
          </div>
        )}
      </div>
    </div>
  )
}
