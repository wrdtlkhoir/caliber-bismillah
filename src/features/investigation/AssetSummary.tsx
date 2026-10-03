import clsx from 'clsx'
import { Check, CircleUserRound, Copy } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import type { Investigation } from '@/data/investigation'
import type { Problem, ProblemStatus } from '@/data/types'
import { plantLabel } from '@/data/plant'
import { daysBetween, fmtDate, useAsOf } from '@/lib/asOf'
import { severityMeta } from '@/lib/severity'

const STAGES = ['Warning', 'Investigating', 'RCA', 'CA/PA', 'Monitoring', 'Closed']
const STAGE_OF: Record<ProblemStatus, number> = {
  'Early Warning': 0,
  Investigating: 1,
  'RCA in Progress': 2,
  'CA/PA Execution': 3,
  Monitoring: 4,
}

/** Selisih hari relatif terhadap tanggal replay (bukan jam komputer). */
export function relativeTime(iso: string, asOf: string) {
  const d = daysBetween(iso.slice(0, 10), asOf)
  return d <= 0 ? 'this week' : `${d} d before as-of`
}

export function formatDetected(iso: string) {
  if (iso.length <= 10) return fmtDate(iso)
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  return `${date}, ${time} WIB`
}

export function AssetSummary({ problem, inv }: { problem: Problem; inv: Investigation }) {
  const { asOf } = useAsOf()
  const [copied, setCopied] = useState(false)
  const current = STAGE_OF[problem.status]
  const sev = severityMeta[problem.severity]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(problem.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard tidak tersedia (mis. http non-localhost) */
    }
  }

  return (
    <Card className="grid items-center gap-4 px-5 py-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,232px)]">
      <div>
        <div className="flex items-center gap-2.5">
          <Mono className="text-[26px] font-bold text-navy-800">{problem.id}</Mono>
          <button onClick={copy} className="rounded p-1 text-ink-3 hover:bg-slate-100 hover:text-ink" aria-label="Copy tag">
            {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
          </button>
          <span
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium',
              inv.running.tone === 'good' ? 'bg-good-soft text-good' : inv.running.tone === 'medium' ? 'bg-medium-soft text-[#b7860b]' : 'bg-critical-soft text-critical',
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {inv.running.label}
          </span>
        </div>
        <p className="mt-1 text-[15px] font-medium text-ink">
          {inv.asset.name} · Class {inv.asset.eqClass}
        </p>
        <p className="text-[15px] text-ink-2">
          {inv.asset.type} · {plantLabel(inv.asset.plant)} ({inv.asset.plant})
        </p>
      </div>

      <ol className="flex items-start overflow-x-auto pb-1" aria-label="Problem lifecycle">
        {STAGES.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s} className="relative flex min-w-[72px] flex-1 flex-col items-center gap-2" aria-current={active ? 'step' : undefined}>
              {i > 0 && (
                <span className={clsx('absolute right-1/2 top-[13px] h-0.5 w-full', i <= current ? 'bg-navy-800' : 'bg-slate-200')} aria-hidden />
              )}
              <span
                className={clsx(
                  'relative z-10 grid size-7 place-items-center rounded-full border-2',
                  done && 'border-navy-800 bg-navy-800 text-white',
                  active && 'border-navy-600 bg-white ring-4 ring-info-soft',
                  !done && !active && 'border-slate-300 bg-white',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : <span className={clsx('size-2 rounded-full', active ? 'bg-navy-600' : 'bg-slate-300')} />}
              </span>
              <span className={clsx('whitespace-nowrap text-[12.5px]', active ? 'font-semibold text-navy-700' : done ? 'text-ink' : 'text-ink-2')}>{s}</span>
            </li>
          )
        })}
      </ol>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[14px]', sev.soft, sev.text, 'border-current/20')}>
            <span className={clsx('size-1.5 rounded-full', problem.severity === 'medium' ? 'bg-ink-2' : sev.bar)} />
            {sev.label}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-0.5 text-[14px] text-ink">
            <CircleUserRound className="size-4" />
            {problem.lead}
          </span>
        </div>
        <p className="text-[14px] leading-relaxed text-ink-2">
          Detected: <Mono className="text-ink">{formatDetected(problem.detectedAt)}</Mono> ({relativeTime(problem.detectedAt, asOf)})
        </p>
      </div>
    </Card>
  )
}
