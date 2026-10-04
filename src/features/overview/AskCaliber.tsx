import { MessageSquareText, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Mono } from '@/components/ui/Card'
import type { UrgentAction } from '@/data/types'
import { ahpBreakdown, type RankedProblem } from '@/lib/ahp'

const QUESTIONS = ['Why prioritized?', 'What changed?', 'Show evidence', 'Next step?'] as const
type Question = (typeof QUESTIONS)[number]

/**
 * Asisten kontekstual. Saat ini jawaban dirangkai dari data (rule-based) supaya
 * demo bisa offline; endpoint LLM bisa dipasang di `answer()` nanti.
 */
function answer(q: Question, p: RankedProblem, rank: number, total: number, action?: UrgentAction): string[] {
  switch (q) {
    case 'Why prioritized?': {
      const top = ahpBreakdown(p.criteria).slice(0, 3)
      return [
        `${p.id} ranks #${rank} of ${total} with a risk priority score of ${p.ahp.toFixed(2)}.`,
        `Largest drivers: ${top.map((t) => `${t.label} (${Math.round(t.score * 100)} × ${Math.round(t.weight * 100)}% = ${(t.contribution * 100).toFixed(1)} pts)`).join(', ')}.`,
      ]
    }
    case 'What changed?':
      return [
        `Detected ${new Date(p.detectedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`,
        ...p.signals.filter((s) => s.tone !== 'neutral').map((s) => s.label),
      ]
    case 'Show evidence':
      return [`Evidence linked to ${p.equipment}:`, ...p.signals.map((s) => s.label), `Area: ${p.area}`]
    case 'Next step?':
      return action
        ? [`${action.task}.`, `Owner ${action.owner}, due ${action.due}, status ${action.status}.`]
        : [`No action assigned yet. Recommend lead ${p.lead} to complete diagnosis and raise a work order.`]
  }
}

interface Props {
  problem?: RankedProblem
  rank: number
  total: number
  action?: UrgentAction
}

export function AskCaliber({ problem, rank, total, action }: Props) {
  const [q, setQ] = useState<Question | null>(null)
  const [typing, setTyping] = useState(false)

  useEffect(() => setQ(null), [problem?.id])

  const ask = (next: Question) => {
    setQ(next)
    setTyping(true)
    setTimeout(() => setTyping(false), 450)
  }

  return (
    <section className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <MessageSquareText className="size-5 shrink-0 text-navy-700" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-3 text-[15px] font-medium text-ink">
            Ask CALIBER Intelligence
            {problem && (
              <Mono className="text-[12.5px] font-normal text-ink-2">
                Active Context: <span className="font-medium text-ink">{problem.id}</span>
              </Mono>
            )}
          </p>
          {problem && <Mono className="text-[12.5px] text-ink-2">({problem.equipment})</Mono>}
        </div>
        <div className="flex max-w-[260px] flex-wrap gap-2">
          {QUESTIONS.map((item) => (
            <button
              key={item}
              disabled={!problem}
              onClick={() => ask(item)}
              className={
                'rounded-md border px-2.5 py-1 text-[13px] transition disabled:opacity-40 ' +
                (q === item ? 'border-navy-800 bg-navy-800 text-white' : 'border-line bg-white text-ink hover:border-slate-300')
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {problem && q && (
        <div className="relative mt-3 animate-fade-up rounded-lg border border-line bg-white p-3 pr-9 text-[13.5px] leading-relaxed text-ink">
          <button onClick={() => setQ(null)} className="absolute right-2 top-2 rounded p-1 text-ink-3 hover:bg-slate-100" aria-label="Close answer">
            <X className="size-4" />
          </button>
          {typing ? (
            <span className="inline-flex gap-1" aria-label="Thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-teal" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
          ) : (
            answer(q, problem, rank, total, action).map((line) => <p key={line}>{line}</p>)
          )}
        </div>
      )}
    </section>
  )
}
