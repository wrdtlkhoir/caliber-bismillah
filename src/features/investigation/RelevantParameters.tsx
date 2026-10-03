import clsx from 'clsx'
import { ArrowRight, Info, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import type { Investigation } from '@/data/investigation'
import { ParameterCard } from './ParameterCard'

const STATE_STYLE = {
  normal: 'bg-good-soft text-good',
  watch: 'bg-medium-soft text-[#b7860b]',
  offline: 'bg-slate-100 text-ink-3',
} as const

export function RelevantParameters({ inv, series, live }: { inv: Investigation; series: Record<string, number[]>; live: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const nominal = inv.liveSensors - inv.params.length - inv.extraSignals.length

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-semibold text-ink">
            Relevant Parameters
            <span className="flex items-center gap-1 rounded bg-teal-soft px-2 py-0.5 text-[12.5px] font-normal text-teal">
              <Sparkles className="size-3.5" /> AI Filtered
            </span>
          </h2>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Auto-selected for failure mode: <span className="font-medium text-ink">{inv.failureMode}</span> ({inv.params.length} of {inv.liveSensors} live sensors)
          </p>
        </div>
        <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1 text-[15px] font-medium text-navy-700 hover:underline" aria-expanded={showAll}>
          {showAll ? 'Show relevant only' : `Show all ${inv.liveSensors} signals`}
          <ArrowRight className={clsx('size-4 transition-transform', showAll && 'rotate-90')} />
        </button>
      </header>

      <div className="mt-4 flex gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3 text-[15px] text-ink">
        <Info className="mt-0.5 size-5 shrink-0 text-navy-700" />
        <p>
          <span className="font-semibold">Degradation detected:</span> {inv.banner.lead} <span className="font-medium text-critical">{inv.banner.delta}</span> {inv.banner.rest}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {inv.params.map((p) => (
          <ParameterCard key={p.key} param={p} series={series[p.key]} live={live} />
        ))}
      </div>

      {showAll && (
        <div className="mt-4 animate-fade-up overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[480px] text-left text-[13.5px]">
            <thead className="bg-slate-50 text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">Tag</th>
                <th className="px-4 py-2 font-medium">Signal</th>
                <th className="px-4 py-2 text-right font-medium">Value</th>
                <th className="px-4 py-2 text-right font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inv.extraSignals.map((s) => (
                <tr key={s.tag}>
                  <td className="px-4 py-2"><Mono className="text-ink">{s.tag}</Mono></td>
                  <td className="px-4 py-2 text-ink">{s.label}</td>
                  <td className="px-4 py-2 text-right"><Mono>{s.value}</Mono></td>
                  <td className="px-4 py-2 text-right">
                    <span className={clsx('rounded px-1.5 py-0.5 text-[12px] capitalize', STATE_STYLE[s.state])}>{s.state}</span>
                  </td>
                </tr>
              ))}
              {nominal > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-center text-ink-3">
                    + {nominal} other signals within normal range (not correlated with {inv.failureMode.toLowerCase()})
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
