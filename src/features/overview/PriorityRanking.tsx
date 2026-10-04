import clsx from 'clsx'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { ParetoRow } from '@/data/plant'
import { AHP_WEIGHTS, ahpBreakdown, CRITERIA_KEYS, CRITICAL_RISK_THRESHOLD, type RankedProblem } from '@/lib/ahp'
import { rankBarColor } from '@/lib/severity'
import { LossPareto } from './LossPareto'

interface Props {
  ranked: RankedProblem[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  pareto: ParetoRow[]
  periodLabel: string
}

type View = 'ranking' | 'pareto'

export function PriorityRanking({ ranked, selectedId, hoveredId, onSelect, onHover, pareto, periodLabel }: Props) {
  const [view, setView] = useState<View>('ranking')
  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium text-ink">Risk Priority Ranking</h2>
        <div role="tablist" aria-label="Ranking view" className="flex shrink-0 gap-3 pt-1 text-[13px]">
          {(['ranking', 'pareto'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx('border-b-2 pb-0.5 capitalize transition', view === v ? 'border-navy-800 font-medium text-navy-800' : 'border-transparent text-ink-2 hover:text-ink')}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {view === 'pareto' ? (
        <>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">Total loss (k US$) by equipment type, Incident Database, {periodLabel}</p>
          <div className="mt-3">
            <LossPareto rows={pareto} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">Weighted score from six operational criteria</p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {CRITERIA_KEYS.map((k) => (
              <li key={k} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11.5px] text-ink-2">
                {AHP_WEIGHTS[k].label} {Math.round(AHP_WEIGHTS[k].weight * 100)}%
              </li>
            ))}
          </ul>

          <ol className="mt-4 max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {ranked.map((p, i) => {
              const top = ahpBreakdown(p.criteria)[0]
              const strong = p.ahp >= CRITICAL_RISK_THRESHOLD
              return (
                <li key={p.id}>
                  <button
                    onClick={() => onSelect(p.id)}
                    onMouseEnter={() => onHover(p.id)}
                    onMouseLeave={() => onHover(null)}
                    className={clsx(
                      'group w-full rounded-md px-1.5 py-1.5 text-left transition',
                      (selectedId === p.id || hoveredId === p.id) && 'bg-slate-50',
                    )}
                    title={`Top driver: ${top.label} (${(top.contribution * 100).toFixed(1)} pts)`}
                  >
                    <div className="flex items-center justify-between font-mono text-[13px] tabular">
                      <span className="font-medium text-ink">
                        {i + 1}. {p.id}
                      </span>
                      <span className={strong ? (p.severity === 'critical' ? 'text-critical' : 'text-high') : 'text-ink'}>Score: {p.ahp.toFixed(2)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={clsx('h-full origin-left rounded-full transition-[width] duration-700', rankBarColor(p.ahp))}
                        style={{ width: `${p.ahp * 100}%` }}
                      />
                    </div>
                  </button>
                </li>
              )
            })}
            {ranked.length === 0 && <li className="py-4 text-center text-sm text-ink-3">No problems match the filter.</li>}
          </ol>
        </>
      )}
    </Card>
  )
}
