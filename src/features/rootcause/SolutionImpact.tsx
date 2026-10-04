import clsx from 'clsx'
import { CircleAlert, Pencil, ThumbsDown, ThumbsUp, Wrench } from 'lucide-react'
import { Card, Mono } from '@/components/ui/Card'
import type { Asset } from '@/data/dataset'
import type { Hypothesis } from '@/data/rootCause'
import { fmtDate } from '@/lib/asOf'
import type { DecisionConstraint } from '@/lib/constraints'
import { solutionImpacts } from '@/lib/solutionImpact'
import { useRole } from '@/lib/role'

const KIND: Record<string, { label: string; cls: string }> = {
  corrective: { label: 'Corrective', cls: 'bg-info-soft text-navy-700' },
  preventive: { label: 'Preventive', cls: 'bg-teal-soft text-teal' },
  proactive: { label: 'Pro-active', cls: 'bg-good-soft text-good' },
}

interface Props {
  asset: Asset
  hypothesis: Hypothesis
  constraints: DecisionConstraint[]
  onEditConstraints: () => void
}

export function SolutionImpact({ asset, hypothesis, constraints, onEditConstraints }: Props) {
  const items = solutionImpacts(asset, hypothesis.rcIds, constraints)
  const { can, viewOnly } = useRole()
  const totals = items.reduce((t, i) => ({ good: t.good + i.good.length, bad: t.bad + i.bad.length, conflicts: t.conflicts + i.conflicts.length }), { good: 0, bad: 0, conflicts: 0 })

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[19px] font-medium text-ink">
            <Wrench className="size-5 text-navy-700" /> Solution impact report
          </h2>
          <p className="text-[13.5px] text-ink-2">
            Good and bad effects of each fix for {hypothesis.id}, checked against {constraints.length} constraint{constraints.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={onEditConstraints}
          disabled={!can('editConstraints')}
          title={can('editConstraints') ? undefined : viewOnly}
          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[13.5px] font-medium text-navy-800 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
        >
          <Pencil className="size-3.5" /> Constraints
        </button>
      </header>

      {items.length ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-ink">{items.length} solutions</span>
            <span className="rounded-full bg-good-soft px-3 py-1 text-good">{totals.good} benefits</span>
            <span className="rounded-full bg-critical-soft px-3 py-1 text-critical">{totals.bad} drawbacks</span>
            <span className={clsx('rounded-full px-3 py-1', totals.conflicts ? 'bg-high-soft text-high' : 'bg-slate-100 text-ink-2')}>
              {totals.conflicts} constraint conflict{totals.conflicts === 1 ? '' : 's'}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {items.map(({ action: x, good, bad, conflicts, notes }) => (
              <li key={x.text} className={clsx('rounded-xl border p-4', conflicts.length ? 'border-high/40' : 'border-line')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[15px] font-medium leading-snug text-ink">{x.text}</p>
                  <span className={clsx('shrink-0 rounded px-2 py-0.5 text-[12.5px]', KIND[x.kind].cls)}>{KIND[x.kind].label}</span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-2">
                  <Mono>{x.rc}</Mono>, owner {x.pic}, planned {fmtDate(x.planDate)}
                  {x.status ? `, ${x.status.toLowerCase()}` : ''}
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-good-soft/50 p-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-wide text-good">
                      <ThumbsUp className="size-3.5" /> Good impact
                    </p>
                    <ul className="mt-1.5 space-y-1.5 text-[13.5px] leading-snug text-ink">
                      {good.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-critical-soft/50 p-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-wide text-critical">
                      <ThumbsDown className="size-3.5" /> Bad impact
                    </p>
                    <ul className="mt-1.5 space-y-1.5 text-[13.5px] leading-snug text-ink">
                      {bad.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {(conflicts.length > 0 || notes.length > 0) && (
                  <ul className="mt-3 space-y-1 text-[13px]">
                    {conflicts.map((c) => (
                      <li key={c} className="flex items-start gap-1.5 text-high">
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {c}
                      </li>
                    ))}
                    {notes.map((n) => (
                      <li key={n} className="pl-5 text-ink-2">
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-[14px] text-ink-2">
          {hypothesis.id} was ruled out in the RCA verification, so no solution is proposed for it. Select another hypothesis to see its fixes.
        </p>
      )}
    </Card>
  )
}
