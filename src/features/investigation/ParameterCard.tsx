import clsx from 'clsx'
import { Mono } from '@/components/ui/Card'
import type { Tone, TrendParam } from '@/data/investigation'
import { fmtDate } from '@/lib/asOf'
import { TrendChart } from './TrendChart'

export const TONE_TEXT: Record<Tone, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-[#b7860b]',
  neutral: 'text-ink-2',
}

export const PILL: Record<Tone, string> = {
  critical: 'border-critical/30 bg-critical-soft text-critical',
  high: 'border-high/30 bg-high-soft text-high',
  medium: 'border-medium/30 bg-medium-soft text-[#b7860b]',
  neutral: 'border-line bg-slate-100 text-ink-2',
}

export function ParameterCard({ param }: { param: TrendParam }) {
  const last = param.points[param.points.length - 1]
  const valueColor = param.color === 'critical' ? 'text-critical' : param.color === 'high' ? 'text-high' : 'text-ink'

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14.5px] text-ink">{param.label}</h3>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <Mono className={clsx('text-[28px] font-bold leading-none', valueColor)}>{last ? Number(last.value.toFixed(param.digits)) : 'n/a'}</Mono>
            <Mono className="text-[15px] text-ink-2">{param.unit}</Mono>
            <Mono className={clsx('text-[12.5px]', TONE_TEXT[param.delta.tone])}>
              <span aria-hidden>{param.delta.dir === 'up' ? '▲' : '▼'}</span> {param.delta.text}
            </Mono>
          </p>
        </div>
        <dl className="shrink-0 text-right font-mono text-[12px] leading-relaxed text-ink-2">
          {param.limits.map((l) => (
            <div key={l.label}>
              <dt className="inline">{l.label}: </dt>
              <dd className="inline">{l.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-4 flex-1">
        <TrendChart
          points={param.points.map((p) => ({ label: fmtDate(p.date), value: p.value }))}
          color={param.color}
          unit={param.unit}
          digits={param.digits}
          band={param.normal}
          lines={[
            { value: param.alarm, kind: 'alarm' },
            { value: param.trip, kind: 'trip' },
          ]}
          ariaLabel={`${param.label} weekly trend`}
          statusNode={<span className={clsx('rounded border px-2 py-0.5 text-[12.5px]', PILL[param.status.tone])}>{param.status.label}</span>}
        />
      </div>

      <footer className="mt-4 flex items-center justify-between text-[13px] text-ink-2">
        <span>{param.normalText}</span>
        <Mono className="text-[12px] text-ink-3">{param.points.length} weekly readings</Mono>
      </footer>
    </article>
  )
}
