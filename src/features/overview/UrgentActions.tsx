import clsx from 'clsx'
import { AlarmClock, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import type { UrgentAction } from '@/data/types'
import { actionStatusStyle } from '@/lib/severity'

export function UrgentActions({ actions, onSelect }: { actions: UrgentAction[]; onSelect: (id: string) => void }) {
  return (
    <Card className="p-5">
      <header className="flex items-center gap-3">
        <h2 className="whitespace-nowrap text-lg font-medium text-ink">Urgent Actions</h2>
        <Mono className="whitespace-nowrap rounded bg-critical-soft px-1.5 py-0.5 text-[11.5px] font-medium text-critical">{actions.length} Active</Mono>
        <span className="ml-auto whitespace-nowrap text-[13px] text-ink-3">Assignee tracking</span>
      </header>

      <ul className="mt-4 space-y-3">
        {actions.map((a) => {
          const s = actionStatusStyle[a.status]
          return (
            <li key={a.problemId}>
              <button
                onClick={() => onSelect(a.problemId)}
                className={clsx('w-full rounded-lg border border-l-[3px] border-line px-3 py-2.5 text-left transition hover:shadow-card', s.card, s.border)}
              >
                <div className="flex items-center justify-between text-[13px]">
                  <Mono className="font-medium text-ink">{a.problemId}</Mono>
                  <span className={clsx('flex items-center gap-1', a.overdue ? 'font-medium text-critical' : 'text-ink')}>
                    {a.overdue && <AlarmClock className="size-3.5" />}
                    Due: {a.due}
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] leading-snug text-ink">{a.task}</p>
                <div className="mt-2 flex items-center justify-between text-[13px]">
                  <span className="text-ink-3">
                    Owner: <span className="font-medium text-ink">{a.owner}</span>
                  </span>
                  <span className={clsx('rounded px-1.5 py-0.5', s.pill)}>{a.status}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <Link
        to="/actions"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2.5 text-[15px] font-medium text-navy-900 transition hover:bg-slate-200"
      >
        View All Actions <ArrowUpRight className="size-4" />
      </Link>
    </Card>
  )
}
