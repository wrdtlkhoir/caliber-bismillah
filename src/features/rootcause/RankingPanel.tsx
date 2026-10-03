import clsx from 'clsx'
import { ArrowRight, CircleCheck, CircleAlert, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import type { Hypothesis } from '@/data/rootCause'
import { CR_THRESHOLD, fraction, PAIRWISE, RC_AHP, RC_CRITERIA, rcWeight } from '@/lib/ahpPairwise'

const pct = (v: number) => `${Math.round(v * 100)}%`

export function RankingPanel({ h, rank }: { h: Hypothesis & { priority: number }; rank: number }) {
  const [matrixOpen, setMatrixOpen] = useState(false)
  const consistent = RC_AHP.cr < CR_THRESHOLD

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-medium text-navy-900">{rank === 1 ? `Why is ${h.id} Ranked First?` : `Why is ${h.id} Ranked #${rank}?`}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-2">Multi-criteria analytical hierarchy process (AHP)</p>
        </div>
        <Mono
          className={clsx(
            'flex shrink-0 items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px]',
            consistent ? 'bg-good-soft text-good' : 'bg-critical-soft text-critical',
          )}
          title={`λmax = ${RC_AHP.lambdaMax.toFixed(3)}, CI = ${RC_AHP.ci.toFixed(3)}`}
        >
          {consistent ? <CircleCheck className="mt-0.5 size-3.5" /> : <CircleAlert className="mt-0.5 size-3.5" />}
          <span>
            CR {RC_AHP.cr.toFixed(2)} (Threshold &lt;
            <br />
            {CR_THRESHOLD.toFixed(2)})
          </span>
        </Mono>
      </header>

      <ol className="mt-5 space-y-4">
        {RC_CRITERIA.map((c, i) => (
          <li key={c.key}>
            <div className="flex items-baseline justify-between text-[14.5px]">
              <span className="text-ink">
                {i + 1}. {c.label} <Mono className="text-[12.5px] text-ink-2">({pct(rcWeight(c.key))} weight)</Mono>
              </span>
              <Mono className="text-[13px] font-semibold text-ink">{pct(h.scores[c.key])}</Mono>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-navy-700 transition-[width] duration-500" style={{ width: pct(h.scores[c.key]) }} />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
        <span className="flex items-center gap-2 text-[16px] font-medium text-ink">
          <LayoutDashboard className="size-4" /> Composite Index Score
        </span>
        <Mono className="text-[19px] font-bold text-navy-800">{h.priority.toFixed(2)} / 1.00</Mono>
      </div>

      <button onClick={() => setMatrixOpen(true)} className="ml-auto mt-4 flex items-center gap-1 text-[14.5px] font-medium text-navy-700 hover:underline">
        View pairwise comparison matrix <ArrowRight className="size-4" />
      </button>

      <Modal
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        title="Pairwise Comparison Matrix (Saaty 1–9)"
        subtitle="Row vs column: how much more important the row criterion is. Weights = principal eigenvector."
        className="max-w-4xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-center text-[13px]">
            <thead>
              <tr className="text-ink-2">
                <th className="px-2 py-2 text-left font-medium">Criterion</th>
                {RC_CRITERIA.map((c, i) => (
                  <th key={c.key} className="px-2 py-2 font-medium" title={c.label}>
                    C{i + 1}
                  </th>
                ))}
                <th className="bg-info-soft px-3 py-2 font-semibold text-navy-800">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PAIRWISE.map((row, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-2 py-2 text-left text-ink">
                    <Mono className="mr-1.5 text-ink-3">C{i + 1}</Mono>
                    {RC_CRITERIA[i].label}
                  </td>
                  {row.map((v, j) => (
                    <td key={j} className={clsx('px-2 py-2 font-mono', i === j ? 'text-ink-3' : v > 1 ? 'font-semibold text-navy-800' : 'text-ink-2')}>
                      {fraction(v)}
                    </td>
                  ))}
                  <td className="bg-info-soft px-3 py-2 font-mono font-semibold text-navy-800">{pct(RC_AHP.weights[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['λmax', RC_AHP.lambdaMax.toFixed(3)],
            ['CI = (λmax−n)/(n−1)', RC_AHP.ci.toFixed(3)],
            ['RI (n = 6)', '1.24'],
            ['CR = CI / RI', RC_AHP.cr.toFixed(3)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[12px] text-ink-2">{k}</dt>
              <dd className="font-mono text-[16px] font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className={clsx('mt-4 flex items-center gap-2 text-[14px]', consistent ? 'text-good' : 'text-critical')}>
          {consistent ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
          {consistent
            ? `Judgments are consistent (CR ${RC_AHP.cr.toFixed(3)} < ${CR_THRESHOLD}). Weights can be used for ranking.`
            : `Judgments inconsistent (CR ≥ ${CR_THRESHOLD}); re-assess the pairwise comparisons.`}
        </p>
      </Modal>
    </Card>
  )
}
