import clsx from 'clsx'
import { BadgeCheck, CircleAlert, CircleCheck, Info, Radio, Check } from 'lucide-react'
import { Mono } from '@/components/ui/Card'
import type { EvidenceStatus, Hypothesis } from '@/data/rootCause'
import type { HypothesisDecision } from '@/lib/useDecision'

export const confidenceLabel = (c: number) => (c >= 80 ? 'High' : c >= 50 ? 'Medium' : 'Low')

const STATUS_ROW: Record<EvidenceStatus, { icon: typeof CircleCheck; cls: string; iconCls: string }> = {
  support: { icon: CircleCheck, cls: 'border-line bg-surface text-ink', iconCls: 'text-good' },
  missing: { icon: Info, cls: 'border-line bg-slate-50 text-ink-2', iconCls: 'text-ink-3' },
  contradict: { icon: CircleAlert, cls: 'border-critical/20 bg-critical-soft text-critical', iconCls: 'text-critical' },
}

const PARAM_TEXT = {
  critical: 'text-critical',
  high: 'text-high',
  neutral: 'text-ink',
} as const

interface Props {
  h: Hypothesis & { priority: number }
  rank: number
  selected: boolean
  decision?: HypothesisDecision
  onSelect: () => void
}

export function HypothesisCard({ h, rank, selected, decision, onSelect }: Props) {
  const rejected = decision === 'rejected'
  const accepted = decision === 'accepted'

  return (
    <article
      onClick={onSelect}
      aria-current={selected || undefined}
      className={clsx(
        'cursor-pointer rounded-xl border bg-surface transition',
        selected ? 'border-line p-5 shadow-card' : 'border-line/70 p-4 hover:border-slate-300 hover:shadow-card',
        rejected && 'opacity-60',
        accepted && 'ring-2 ring-good/40',
      )}
    >
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <Mono className={clsx('grid h-8 min-w-9 place-items-center rounded-md px-2 text-[14px] font-bold', selected ? 'bg-navy-900 text-white' : 'bg-slate-100 text-ink-2')}>
          {h.id}
        </Mono>
        <div className="min-w-0 flex-1">
          <h3 className={clsx('text-[18px] font-medium leading-snug text-ink', rejected && 'line-through')}>{h.title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {rank === 1 && !rejected && <span className="rounded bg-good-soft px-2 py-0.5 text-[13.5px] text-good">Rank #1 Recommendation</span>}
            {accepted && (
              <span className="flex items-center gap-1 rounded bg-good px-2 py-0.5 text-[13px] font-medium text-white">
                <Check className="size-3.5" /> Accepted
              </span>
            )}
            {rejected && <span className="rounded bg-critical-soft px-2 py-0.5 text-[13px] font-medium text-critical">Rejected</span>}
          </div>
        </div>

        {selected ? (
          <div className="text-right">
            <p className="text-[14px] text-ink-2">
              AHP Score <Mono className="text-[20px] font-bold text-navy-900">{h.priority.toFixed(2)}</Mono>
            </p>
            <Mono className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-[12.5px] font-semibold text-navy-700">
              <BadgeCheck className="size-3.5" />
              Confidence: {h.confidence}% ({confidenceLabel(h.confidence)})
            </Mono>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Mono className="text-[13px] leading-tight text-ink-2">
              AHP Score:
              <br />
              {h.priority.toFixed(2)}
            </Mono>
            <span className="rounded bg-slate-100 px-2 py-1 text-[13px] leading-tight text-ink-2">
              {confidenceLabel(h.confidence)}
              <br />
              Confidence
            </span>
            <Mono className="rounded bg-slate-100 px-2 py-1 text-[13px] font-semibold text-navy-700">#{rank}</Mono>
          </div>
        )}
      </header>

      {selected ? (
        <div className="animate-fade-up">
          <p className="mt-3 max-w-[460px] text-[15.5px] leading-relaxed text-ink-2">{h.summary}</p>

          <p className="mt-4 text-[13px] text-ink-2">Corroborated telemetry &amp; institutional evidence</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {h.evidence.map((e) => {
              const S = STATUS_ROW[e.status]
              return (
                <li key={e.text} className={clsx('flex gap-3 rounded-lg px-4 py-3', e.status === 'support' ? 'bg-slate-50' : S.cls)}>
                  <S.icon className={clsx('mt-1 size-4 shrink-0', S.iconCls)} />
                  <div>
                    <p className="text-[15px] leading-snug text-ink">{e.text}</p>
                    <Mono className="mt-1 block text-[12.5px] text-ink-2">{e.source}</Mono>
                  </div>
                </li>
              )
            })}
          </ul>

          {h.correlated && h.correlated.length > 0 && (
            <div className="mt-2 rounded-lg bg-info-soft/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 font-mono text-[12.5px] text-ink-2">
                  <Radio className="size-4 text-navy-700" />
                  Signals at failure:
                </span>
                {h.correlated.map((c) => (
                  <Mono key={c.label} className={clsx('rounded-md bg-surface px-2.5 py-1 text-[12.5px] font-semibold', PARAM_TEXT[c.tone])}>
                    {c.label} ({c.value})
                  </Mono>
                ))}
              </div>
              {h.causalLoopValidated && (
                <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-good">
                  <span className="size-1.5 rounded-full bg-good" /> Causal loop verified in RCA (4P + 4M+1E)
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-3 flex flex-col items-start gap-2">
          {h.evidence.map((e) => {
            const S = STATUS_ROW[e.status]
            return (
              <li key={e.text} className={clsx('flex items-center gap-2 rounded-md border px-2.5 py-1 text-[13.5px]', S.cls)}>
                <S.icon className={clsx('size-4 shrink-0', S.iconCls)} />
                {e.text}
                <Mono className="text-[12.5px] text-ink-2">[{e.source}]</Mono>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
