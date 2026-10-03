import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import type { Kpi, TimeRange } from '@/data/types'
import type { RankedProblem } from '@/lib/ahp'
import { useCountUp } from '@/lib/useCountUp'

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function Tile({ label, children, foot, extra, className }: { label: string; children: ReactNode; foot: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex min-w-0 flex-col justify-between gap-3 px-4 py-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium xl:whitespace-nowrap uppercase tracking-wide text-ink-2">{label}</p>
        {extra}
      </div>
      <div className="font-mono text-[34px] font-bold leading-none tracking-tight text-ink tabular">{children}</div>
      <div className="font-mono text-[12px] tabular xl:whitespace-nowrap">{foot}</div>
    </div>
  )
}

const Unit = ({ children }: { children: ReactNode }) => (
  <span className="ml-1.5 font-sans text-lg font-normal text-ink-2">{children}</span>
)

function Delta({ value, unit, goodWhen, suffix }: { value: number; unit: string; goodWhen: 'up' | 'down'; suffix: string }) {
  const up = value >= 0
  const good = (up && goodWhen === 'up') || (!up && goodWhen === 'down')
  return (
    <span className={good ? 'text-good' : 'text-high'}>
      <span aria-hidden>{up ? '▲' : '▼'}</span> {up ? '+' : ''}
      {fmt(value, unit === '%' ? 1 : 0)}
      {unit} <span className="text-ink-2">{suffix}</span>
    </span>
  )
}

export function KpiStrip({ kpi, range, critical, activeCount }: { kpi: Kpi; range: TimeRange; critical: RankedProblem[]; activeCount: number }) {
  const availability = useCountUp(kpi.availability.value)
  const downtime = useCountUp(kpi.downtime.value)
  const loss = useCountUp(kpi.productionLoss.value)
  const exposure = useCountUp(kpi.financialExposure.value)
  const prev = range === '7d' ? 'last wk' : range === '30d' ? 'last mo' : 'last qtr'

  return (
    <Card className="grid grid-cols-2 divide-line md:grid-cols-3 xl:grid-cols-6 xl:divide-x [&>*]:border-line max-xl:[&>*]:border-b">
      <Tile label="Plant Availability" foot={<Delta value={kpi.availability.delta} unit="%" goodWhen="up" suffix={`vs ${range} target`} />}>
        {fmt(availability, 1)}
        <Unit>%</Unit>
      </Tile>
      <Tile label="Unplanned Downtime" foot={<Delta value={kpi.downtime.delta} unit="h" goodWhen="down" suffix={`vs ${prev}`} />}>
        {fmt(downtime)}
        <Unit>h</Unit>
      </Tile>
      <Tile label="Production Loss" foot={<Delta value={kpi.productionLoss.delta} unit=" t" goodWhen="down" suffix="risk delta" />}>
        {fmt(loss)}
        <Unit>t</Unit>
      </Tile>
      <Tile label="Financial Exposure" foot={<span className="text-ink-2">Est. {range} risk pool</span>}>
        <span className="mr-0.5 font-sans text-xl font-normal text-ink-2">$</span>
        {fmt(exposure, 1)}
        <Unit>M</Unit>
      </Tile>
      <Tile label="Active Problems" foot={<span className="text-teal">{kpi.rawAlerts} raw alerts grouped</span>}>
        {activeCount}
      </Tile>
      <Tile
        label="Critical Risk"
        className="bg-gradient-to-b from-critical-soft/40 to-transparent"
        extra={<span className="whitespace-nowrap rounded bg-critical-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-critical">Attn Req</span>}
        foot={<span className="text-critical">{critical.map((p) => p.id).join(' · ') || '—'}</span>}
      >
        <span className="inline-flex items-center gap-3 text-critical">
          {critical.length}
          <span className="size-3 animate-pulse rounded-full bg-critical" />
        </span>
      </Tile>
    </Card>
  )
}
