import clsx from 'clsx'
import { useState, type PointerEvent, type ReactNode } from 'react'
import type { TrendParam } from '@/data/investigation'
import { useElementWidth } from '@/lib/useElementWidth'

const H = 112
const PAD_Y = 10

const STROKE: Record<TrendParam['color'], string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  navy: 'var(--color-navy-700)',
}

export function formatAgo(hours: number) {
  if (hours < 0.05) return 'now'
  if (hours >= 72) return `-${(hours / 24).toFixed(hours >= 240 ? 0 : 1)}d`
  return `-${hours.toFixed(hours < 10 ? 1 : 0)}h`
}

/**
 * Line chart satu series: pita hijau = rentang normal, garis merah putus-putus = alarm.
 * Hover menampilkan crosshair + tooltip nilai.
 */
export function TrendChart({ param, series, statusNode }: { param: TrendParam; series: number[]; statusNode?: ReactNode }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const lo0 = Math.min(...series, param.normal[0], param.alarmDir === 'low' ? param.alarm : Infinity)
  const hi0 = Math.max(...series, param.normal[1], param.alarmDir === 'high' ? param.alarm : -Infinity)
  const pad = (hi0 - lo0) * 0.12 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad

  const n = series.length
  const x = (i: number) => (i / (n - 1)) * width
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - PAD_Y * 2)

  const path = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const last = series[n - 1]

  const onMove = (e: PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref} className="relative overflow-hidden rounded-md border border-line bg-surface" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} className="block" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${param.label} trend, last ${param.windowH} hours`}>
          <rect
            x={0}
            width={width}
            y={y(param.normal[1])}
            height={Math.max(0, y(param.normal[0]) - y(param.normal[1]))}
            fill="var(--color-good-soft)"
          />
          <line x1={0} x2={width} y1={y(param.alarm)} y2={y(param.alarm)} stroke="var(--color-critical)" strokeOpacity={0.7} strokeDasharray="4 4" />
          <path d={path} fill="none" stroke={STROKE[param.color]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(n - 1) - 3} cy={y(last)} r={3.5} fill={STROKE[param.color]} stroke="white" strokeWidth={1.5} />

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--color-ink-3)" strokeDasharray="2 3" />
              <circle cx={x(hover)} cy={y(series[hover])} r={4} fill={STROKE[param.color]} stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1.5 z-10 whitespace-nowrap rounded bg-ink px-2 py-1 font-mono text-[11.5px] text-white shadow-lg"
          style={{ left: Math.min(Math.max(x(hover) - 50, 4), width - 112) }}
        >
          {formatAgo(param.windowH * (1 - hover / (n - 1)))} · {series[hover].toFixed(param.digits)} {param.unit}
        </div>
      )}

      {statusNode && <div className={clsx('pointer-events-none absolute bottom-2 right-2 transition-opacity', hover !== null && 'opacity-0')}>{statusNode}</div>}
    </div>
  )
}
