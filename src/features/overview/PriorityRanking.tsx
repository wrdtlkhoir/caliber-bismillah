import clsx from 'clsx'
import { Card } from '@/components/ui/Card'
import { AHP_WEIGHTS, ahpBreakdown, CRITERIA_KEYS, CRITICAL_RISK_THRESHOLD, type RankedProblem } from '@/lib/ahp'
import { rankBarColor } from '@/lib/severity'

interface Props {
  ranked: RankedProblem[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export function PriorityRanking({ ranked, selectedId, hoveredId, onSelect, onHover }: Props) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-medium text-ink">Priority Ranking (AHP)</h2>
      <p className="mt-1 text-[13px] leading-snug text-ink-2">Multi-criteria weight calculation combining 6 operational dimensions:</p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {CRITERIA_KEYS.map((k) => (
          <li key={k} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11.5px] text-ink-2">
            {AHP_WEIGHTS[k].label} {Math.round(AHP_WEIGHTS[k].weight * 100)}%
          </li>
        ))}
      </ul>

      <ol className="mt-4 space-y-1">
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
    </Card>
  )
}
