import clsx from 'clsx'
import { Card, Mono } from '@/components/ui/Card'
import type { Problem, Severity, TimeRange, UnitImpact } from '@/data/types'

const RANGE_LABEL: Record<TimeRange, string> = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days' }
const SEV_ORDER: Severity[] = ['critical', 'high', 'medium']
const SEV_TEXT: Record<Severity, string> = { critical: 'text-critical', high: 'text-high', medium: 'text-[#b7860b]' }
const PLOT_H = 120

interface Props {
  units: UnitImpact[]
  problems: Problem[]
  threshold: { downtimeH: number; lossT: number }
  range: TimeRange
  selectedUnit: string | null
  onSelectUnit: (id: string | null) => void
}

/**
 * Downtime (jam) dan Production Loss (ton) per unit. Dua ukuran beda satuan,
 * jadi tiap bar diskalakan ke maksimum metriknya sendiri dan nilai selalu
 * ditulis langsung di atas bar (tidak ada sumbu-y ganda yang menyesatkan).
 */
export function UnitImpactChart({ units, problems, threshold, range, selectedUnit, onSelectUnit }: Props) {
  const maxD = Math.max(threshold.downtimeH * 1.25, ...units.map((u) => u.downtimeH))
  const maxL = Math.max(threshold.lossT * 1.25, ...units.map((u) => u.lossT))
  const thresholdY = (threshold.downtimeH / maxD) * PLOT_H

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-ink">Downtime vs Production Loss by Unit — {RANGE_LABEL[range]}</h2>
          <p className="text-[13px] text-ink-2">
            Click unit column to isolate contributing operational problems
            {selectedUnit && (
              <button onClick={() => onSelectUnit(null)} className="ml-2 font-medium text-navy-700 underline-offset-2 hover:underline">
                Clear selection
              </button>
            )}
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-5 text-[13px] text-ink-2">
          <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-navy-900" />Downtime (Hours)</li>
          <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-teal" />Production Loss (Tons)</li>
          <li className="flex items-center gap-2"><span className="h-0.5 w-4 bg-critical" />Threshold Limit</li>
        </ul>
      </header>

      <div className="-mx-1 mt-5 overflow-x-auto pb-1">
        <div className="grid min-w-[760px] grid-cols-6 gap-2 px-1">
          {units.map((u, i) => {
            const unitProblems = problems.filter((p) => p.unitId === u.id)
            const worst = SEV_ORDER.find((s) => unitProblems.some((p) => p.severity === s))
            const top = [...unitProblems].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))[0]
            const active = selectedUnit === u.id
            const dimmed = selectedUnit !== null && !active
            const dH = Math.max(4, (u.downtimeH / maxD) * PLOT_H)
            const lH = Math.max(4, (u.lossT / maxL) * PLOT_H)
            const over = u.downtimeH > threshold.downtimeH || u.lossT > threshold.lossT

            return (
              <button
                key={u.id}
                onClick={() => onSelectUnit(active ? null : u.id)}
                aria-pressed={active}
                className={clsx(
                  'group rounded-lg p-3 text-left transition',
                  active ? 'bg-slate-100 ring-1 ring-slate-200' : 'hover:bg-slate-50',
                  dimmed && 'opacity-45',
                )}
              >
                <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-2">{u.code}</p>
                <p className="mt-1 truncate text-[16px] font-medium text-ink">{u.name}</p>

                <div className="relative mt-5 flex items-end gap-2 border-b border-slate-300" style={{ height: PLOT_H + 28 }}>
                  <div
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-critical/60"
                    style={{ bottom: thresholdY }}
                    aria-hidden
                  />
                  <Bar value={`${u.downtimeH}h`} height={dH} color="bg-navy-900" delay={i * 60} tip={`${u.name}: ${u.downtimeH} h downtime`} />
                  <Bar
                    value={`${u.lossT.toLocaleString('en-US')}t`}
                    height={lH}
                    color="bg-teal"
                    valueClass="text-teal"
                    delay={i * 60 + 80}
                    tip={`${u.name}: ${u.lossT.toLocaleString('en-US')} t production loss`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-[12.5px]">
                  {worst ? (
                    <span className={clsx('font-medium', SEV_TEXT[worst])}>
                      {unitProblems.length} Problem{unitProblems.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="font-medium text-good">Stable</span>
                  )}
                  <span className="text-ink-2">{top ? top.id : '0 Active'}</span>
                </div>
                {over && <span className="sr-only">Exceeds threshold</span>}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function Bar({ value, height, color, valueClass, delay, tip }: { value: string; height: number; color: string; valueClass?: string; delay: number; tip: string }) {
  return (
    <div className="group/bar relative flex flex-1 flex-col items-center justify-end">
      <Mono className={clsx('mb-1 text-[12px] font-medium', valueClass ?? 'text-ink')}>{value}</Mono>
      <div
        className={clsx('w-full origin-bottom animate-grow rounded-t-[4px] transition-[height] duration-500 group-hover/bar:brightness-110', color)}
        style={{ height, animationDelay: `${delay}ms` }}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full z-10 mb-6 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] text-white opacity-0 shadow-lg transition group-hover/bar:opacity-100"
      >
        {tip}
      </span>
    </div>
  )
}
