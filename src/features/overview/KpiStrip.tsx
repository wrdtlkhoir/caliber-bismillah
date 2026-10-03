import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import type { Kpi } from '@/data/types'
import type { RankedProblem } from '@/lib/ahp'
import { useCountUp } from '@/lib/useCountUp'

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function Tile({ label, children, foot, extra, className }: { label: string; children: ReactNode; foot: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex min-w-0 flex-col justify-between gap-3 px-4 py-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-2 xl:whitespace-nowrap">{label}</p>
        {extra}
      </div>
      <div className="font-mono text-[32px] font-bold leading-none tracking-tight text-ink tabular">{children}</div>
      <div className="font-mono text-[12px] tabular xl:whitespace-nowrap">{foot}</div>
    </div>
  )
}

const Unit = ({ children }: { children: ReactNode }) => <span className="ml-1.5 font-sans text-lg font-normal text-ink-2">{children}</span>

function Delta({ value, unit, suffix }: { value: number; unit: string; suffix: string }) {
  if (Math.abs(value) < 0.05) return <span className="text-ink-2">= {suffix}</span>
  const up = value > 0
  return (
    <span className={up ? 'text-high' : 'text-good'}>
      <span aria-hidden>{up ? '▲' : '▼'}</span> {up ? '+' : ''}
      {fmt(value, 0)}
      {unit} <span className="text-ink-2">{suffix}</span>
    </span>
  )
}

interface Props {
  kpi: Kpi
  rangeLabel: string
  critical: RankedProblem[]
  activeCount: number
}

export function KpiStrip({ kpi, rangeLabel, critical, activeCount }: Props) {
  const availability = useCountUp(kpi.availability.value)
  const downtime = useCountUp(kpi.downtime.value)
  const loss = useCountUp(kpi.productionLoss.value)
  const exposure = useCountUp(kpi.financialExposure.valueM)

  return (
    <Card className="grid grid-cols-2 divide-line md:grid-cols-3 xl:grid-cols-6 xl:divide-x [&>*]:border-line max-xl:[&>*]:border-b">
      <Tile label="Asset Availability" foot={<span className="text-ink-2">5 monitored assets</span>}>
        {fmt(availability, 2)}
        <Unit>%</Unit>
      </Tile>
      <Tile label="Unplanned Downtime" foot={<Delta value={kpi.downtime.delta} unit="h" suffix={`vs prev ${rangeLabel}`} />}>
        {fmt(downtime)}
        <Unit>h</Unit>
      </Tile>
      <Tile label="Production Loss" foot={<Delta value={kpi.productionLoss.delta} unit=" t" suffix="RCA cases" />}>
        {fmt(loss)}
        <Unit>t</Unit>
      </Tile>
      <Tile label="Financial Exposure" foot={<span className="text-ink-2">Open-risk pot. loss</span>}>
        <span className="mr-0.5 font-sans text-xl font-normal text-ink-2">$</span>
        {fmt(exposure, 1)}
        <Unit>M</Unit>
      </Tile>
      <Tile label="Active Problems" foot={<span className="text-teal">{kpi.rawAlerts} CM breaches · 4 wk</span>}>
        {activeCount}
      </Tile>
      <Tile
        label="Critical Risk"
        className="bg-gradient-to-b from-critical-soft/40 to-transparent"
        extra={<span className="whitespace-nowrap rounded bg-critical-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-critical">Attn Req</span>}
        foot={<span className="text-critical">{critical.map((p) => p.id).join(' · ') || 'None'}</span>}
      >
        <span className={clsx('inline-flex items-center gap-3', critical.length ? 'text-critical' : 'text-ink-2')}>
          {critical.length}
          {critical.length > 0 && <span className="size-3 animate-pulse rounded-full bg-critical" />}
        </span>
      </Tile>
    </Card>
  )
}
