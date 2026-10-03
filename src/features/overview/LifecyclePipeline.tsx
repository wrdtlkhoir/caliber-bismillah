import clsx from 'clsx'
import { CircleCheck } from 'lucide-react'
import { Fragment } from 'react'
import { Card } from '@/components/ui/Card'
import type { LifecycleStage } from '@/data/types'

/** Alur lifecycle masalah: Detected → … → Closed. */
export function LifecyclePipeline({ stages }: { stages: LifecycleStage[] }) {
  return (
    <Card className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-3 px-5 py-3.5">
        {stages.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && <li aria-hidden className="h-px w-6 shrink-0 bg-slate-300 xl:flex-1" />}
            <li
              className={clsx(
                'flex shrink-0 items-center gap-2.5 text-[15px]',
                s.state === 'active' ? 'font-medium text-navy-700' : 'text-ink',
              )}
              aria-current={s.state === 'active' ? 'step' : undefined}
            >
              {s.state === 'closed' ? (
                <CircleCheck className="size-[18px] text-good" />
              ) : (
                <span
                  className={clsx(
                    'size-2.5 rounded-full',
                    s.state === 'active' && 'bg-navy-700 ring-4 ring-navy-700/15',
                    s.state === 'done' && 'bg-navy-950',
                    s.state === 'pending' && 'bg-ink-3',
                  )}
                />
              )}
              {s.label}
              <span
                className={clsx(
                  'rounded px-1.5 py-0.5 font-mono text-xs',
                  s.state === 'active' ? 'bg-info-soft text-navy-700' : 'bg-slate-100 text-ink-2',
                )}
              >
                {s.count}
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
    </Card>
  )
}
