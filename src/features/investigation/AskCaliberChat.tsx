import clsx from 'clsx'
import { SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Mono } from '@/components/ui/Card'
import type { Investigation } from '@/data/investigation'
import type { UrgentAction } from '@/data/types'
import { ahpBreakdown, type RankedProblem } from '@/lib/ahp'
import { fmtDate } from '@/lib/asOf'

/**
 * Ask CALIBER versi chat — DEMO. Tidak terhubung ke LLM/API. Setiap pertanyaan
 * dicocokkan ke salah satu intent tetap, lalu jawabannya dirangkai hanya dari data
 * kasus yang sedang tampil (problem AHP, CM, similar incidents, RCA yang sudah
 * dilaporkan per tanggal replay).
 */

type Intent = 'priority' | 'evidence' | 'change' | 'verify'

const PROMPTS: { intent: Intent; text: string }[] = [
  { intent: 'priority', text: 'Why is this problem prioritized?' },
  { intent: 'evidence', text: 'What evidence supports the diagnosis?' },
  { intent: 'change', text: 'What changed before the failure?' },
  { intent: 'verify', text: 'What should we verify next?' },
]

const KEYWORDS: [Intent, RegExp][] = [
  ['priority', /priorit|rank|why .*(first|top|high)|score|ahp|urgent/i],
  ['evidence', /evidence|support|diagnos|root cause|proof|why .*fail|cause/i],
  ['change', /chang|before|trend|history|what happened|degrad/i],
  ['verify', /verif|next|check|inspect|should we|recommend|action|do now/i],
]

const intentOf = (q: string) => PROMPTS.find((p) => p.text === q)?.intent ?? KEYWORDS.find(([, re]) => re.test(q))?.[0] ?? null

interface Ctx {
  problem: RankedProblem
  rank: number
  total: number
  inv: Investigation
  asOf: string
  action?: UrgentAction
}

function answer(intent: Intent, { problem: p, rank, total, inv, asOf, action }: Ctx): string[] {
  const a = inv.asset
  const rcaKnown = a.rca && a.rca.dateReported <= asOf ? a.rca : null
  switch (intent) {
    case 'priority': {
      const top = ahpBreakdown(p.criteria).slice(0, 3)
      return [
        `${p.id} ranks #${rank} of ${total} active problems with a risk priority score of ${p.ahp.toFixed(2)}.`,
        `Largest drivers: ${top.map((t) => `${t.label} ${(t.contribution * 100).toFixed(1)} pts`).join(', ')}.`,
        `Severity ${p.severity}, status ${p.status}.`,
      ]
    }
    case 'evidence': {
      const lines = [`${inv.impact[1].headline}. ${inv.impact[1].detail}.`]
      const breached = inv.health.params.filter((x) => x.state !== 'normal')
      if (breached.length)
        lines.push(`Condition monitoring: ${breached.map((x) => `${x.param.label} in ${x.state.toUpperCase()}`).join(', ')}.`)
      const top = inv.incidents[0]
      if (top) lines.push(`Closest precedent: ${top.incident.ar ?? top.incident.mto}, ${top.incident.title} (${Math.round(top.score * 100)}% match, ${top.incident.status}).`)
      if (rcaKnown) {
        const ng = [...rcaKnown.parameterVerification, ...rcaKnown.fourMVerification].filter((r) => r.result === 'NG').length
        lines.push(`RCA ${rcaKnown.arNo}: root cause "${rcaKnown.rootCause}", supported by ${ng} NG verification item${ng === 1 ? '' : 's'}.`)
      } else lines.push('No RCA report exists yet at this replay date, so the diagnosis is not verified.')
      return lines
    }
    case 'change': {
      const lines = [`${inv.banner.lead} ${inv.banner.delta} ${inv.banner.rest}.`.replace(/\s+/g, ' ')]
      lines.push(...inv.params.filter((x) => x.delta.tone !== 'neutral').map((x) => `${x.label}: ${x.delta.text} ${x.unit}, ${x.status.label.toLowerCase()}.`))
      lines.push(a.failureDate <= asOf ? `The failure occurred on ${fmtDate(a.failureDate)}.` : `At ${fmtDate(asOf)} the failure has not occurred yet (recorded failure date: ${fmtDate(a.failureDate)}).`)
      return lines
    }
    case 'verify': {
      const lines = [`Suggested field check: ${inv.fieldAction.replace(/^Request /, '')}.`]
      const watch = inv.health.params.filter((x) => x.daysToAlarm || x.daysToTrip)
      if (watch.length)
        lines.push(`Watch ${watch.map((x) => `${x.param.label} (${x.daysToTrip ? `trip in ~${x.daysToTrip} d` : `alarm in ~${x.daysToAlarm} d`})`).join(', ')}.`)
      lines.push(action ? `Open CAPA: ${action.task}. Owner ${action.owner}, due ${action.due}.` : 'No open CAPA action is recorded for this asset at this date.')
      return lines
    }
  }
}

interface Message {
  from: 'user' | 'caliber'
  lines: string[]
}

export function AskCaliberChat(ctx: Ctx) {
  const { problem, inv } = ctx
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
  }, [problem.id])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const ask = (q: string) => {
    const text = q.trim()
    if (!text) return
    const intent = intentOf(text)
    const reply = intent
      ? answer(intent, ctx)
      : [`This demo only answers predefined questions about ${problem.id}. Try one of the suggested questions.`]
    setMessages((m) => [...m, { from: 'user', lines: [text] }, { from: 'caliber', lines: reply }])
    setDraft('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <div className="flex min-h-full flex-col">
      <p className="text-[13.5px] text-ink-2">
        <Mono className="font-semibold text-ink">{problem.id}</Mono>, {inv.headline}
      </p>
      <p className="mt-1 text-[12px] text-ink-3">Demo: predefined responses from this case's data. Not connected to an LLM.</p>

      <div className="mt-4 flex-1 space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-[13px] font-medium text-ink-2">Suggested questions</p>
            <ul className="mt-2 space-y-1">
              {PROMPTS.map((p) => (
                <li key={p.intent}>
                  <button onClick={() => ask(p.text)} className="text-left text-[14px] text-navy-700 hover:underline">
                    {p.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={clsx(m.from === 'user' && 'flex justify-end')}>
            <div className={clsx('text-[14px] leading-relaxed', m.from === 'user' ? 'max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-ink' : 'text-ink')}>
              <p className="mb-0.5 text-[12px] font-medium text-ink-2">{m.from === 'user' ? 'You' : 'CALIBER'}</p>
              {m.lines.map((l, k) => (
                <p key={k} className={clsx(k > 0 && 'mt-1')}>
                  {l}
                </p>
              ))}
            </div>
          </div>
        ))}
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
            {PROMPTS.map((p) => (
              <button key={p.intent} onClick={() => ask(p.text)} className="text-left text-[13px] text-navy-700 hover:underline">
                {p.text}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex items-center gap-2 border-t border-line bg-surface px-5 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask about ${problem.id}…`}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-navy-600/20"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  )
}
