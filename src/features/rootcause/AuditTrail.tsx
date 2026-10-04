import clsx from 'clsx'
import { History } from 'lucide-react'
import { Card, Mono } from '@/components/ui/Card'
import type { AuditActor, AuditEntry } from '@/data/rootCause'

const ACTOR: Record<AuditActor, { dot: string; pill: string }> = {
  Automated: { dot: 'bg-teal', pill: 'bg-teal-soft text-teal' },
  'Lead Engineer': { dot: 'bg-navy-900', pill: 'bg-slate-100 text-navy-900' },
  'Online Sync': { dot: 'bg-good', pill: 'bg-good-soft text-good' },
  'Engineer Decision': { dot: 'bg-high', pill: 'bg-high-soft text-high' },
}

export function AuditTrail({ entries, eventNo, unitLabel }: { entries: AuditEntry[]; eventNo: string; unitLabel: string }) {
  return (
    <Card className="p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[19px] font-medium text-ink">
          <History className="size-5 text-ink-2" /> Decision Audit Trail
        </h2>
        <Mono className="text-[13px] text-ink-2">
          {unitLabel} {eventNo}
        </Mono>
      </header>
      <ol className="mt-4 space-y-4">
        {entries.map((e, i) => (
          <li key={i} className={clsx('relative pl-6', i === entries.length - 1 && i > 2 && 'animate-fade-up')}>
            {i < entries.length - 1 && <span className="absolute left-[5px] top-4 h-[calc(100%+4px)] w-px bg-line" aria-hidden />}
            <span className={clsx('absolute left-0 top-1.5 size-[11px] rounded-full', ACTOR[e.actor].dot)} />
            <div className="flex items-center justify-between gap-2">
              <Mono className="text-[13px] text-ink-2">{e.time}{e.time.includes(':') ? ' WIB' : ''}</Mono>
              <span className={clsx('rounded px-1.5 py-0.5 text-[12.5px] font-medium', ACTOR[e.actor].pill)}>{e.actor}</span>
            </div>
            <p className="mt-1 text-[14px] leading-snug text-ink">{e.text}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}
