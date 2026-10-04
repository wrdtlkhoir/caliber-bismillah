import clsx from 'clsx'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { useElementWidth } from '@/lib/useElementWidth'

export type ChartColor = 'critical' | 'high' | 'navy' | 'teal'

const STROKE: Record<ChartColor, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  navy: 'var(--color-navy-700)',
  teal: 'var(--color-teal)',
}

interface Props {
  points: { label: string; value: number | null }[]
  color: ChartColor
  unit: string
  digits: number
  /** pita hijau rentang normal */
  band?: [number, number]
  /** garis referensi (alarm, trip) */
  lines?: { value: number; kind: 'alarm' | 'trip' }[]
  /** index titik yang dianggap "mati" (mis. RUN_STATUS OFF) — diarsir abu-abu */
  offMask?: boolean[]
  height?: number
  statusNode?: ReactNode
  ariaLabel: string
}

/** Line chart satu series dengan crosshair + tooltip. Nilai null = gap. */
export function TrendChart({ points, color, unit, digits, band, lines = [], offMask, height = 112, statusNode, ariaLabel }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const PAD_Y = 10

  const vals = points.map((p) => p.value).filter((v): v is number => v !== null)
  const refs = [...lines.map((l) => l.value), ...(band ?? [])]
  const lo0 = Math.min(...vals, ...refs)
  const hi0 = Math.max(...vals, ...refs)
  const pad = (hi0 - lo0) * 0.1 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad

  const n = points.length
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : width / 2)
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (height - PAD_Y * 2)

  let path = ''
  points.forEach((p, i) => {
    if (p.value === null) return
    const prev = points[i - 1]
    path += `${!prev || prev.value === null ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
  })
  const lastIdx = points.map((p) => p.value !== null).lastIndexOf(true)

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
  }
  const hv = hover !== null ? points[hover] : null

  return (
    <div ref={ref} className="relative overflow-hidden rounded-md border border-line bg-surface" style={{ height }}>
      {width > 0 && n > 0 && (
        <svg width={width} height={height} className="block" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={ariaLabel}>
          {offMask?.map((off, i) =>
            off ? <rect key={i} x={x(i) - width / n / 2} width={width / n + 0.5} y={0} height={height} fill="var(--color-ink-3)" opacity={0.15} /> : null,
          )}
          {band && <rect x={0} width={width} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill="var(--color-good-soft)" />}
          {lines.map((l) => (
            <line
              key={l.kind}
              x1={0}
              x2={width}
              y1={y(l.value)}
              y2={y(l.value)}
              stroke={l.kind === 'trip' ? 'var(--color-critical)' : 'var(--color-medium)'}
              strokeOpacity={0.8}
              strokeDasharray={l.kind === 'trip' ? '2 3' : '4 4'}
            />
          ))}
          <path d={path} fill="none" stroke={STROKE[color]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {lastIdx >= 0 && <circle cx={Math.min(x(lastIdx), width - 4)} cy={y(points[lastIdx].value!)} r={3.5} fill={STROKE[color]} stroke="white" strokeWidth={1.5} />}
          {hover !== null && hv?.value !== null && hv && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="var(--color-ink-3)" strokeDasharray="2 3" />
              <circle cx={x(hover)} cy={y(hv.value!)} r={4} fill={STROKE[color]} stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {hv && (
        <div
          className="pointer-events-none absolute top-1.5 z-10 whitespace-nowrap rounded bg-ink px-2 py-1 font-mono text-[11.5px] text-white shadow-lg"
          style={{ left: Math.min(Math.max(x(hover!) - 60, 4), width - 150) }}
        >
          {hv.label}: {hv.value === null ? 'n/a' : `${hv.value.toFixed(digits)} ${unit}`}
          {offMask?.[hover!] && ' (OFF)'}
        </div>
      )}

      {statusNode && <div className={clsx('pointer-events-none absolute bottom-2 right-2 transition-opacity', hover !== null && 'opacity-0')}>{statusNode}</div>}
    </div>
  )
}
