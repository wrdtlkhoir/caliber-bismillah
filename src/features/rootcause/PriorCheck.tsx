import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import type { RootCauseCase } from '@/data/rootCause'

export function PriorCheck({ prior, problemId }: { prior: NonNullable<RootCauseCase['prior']>; problemId: string }) {
  const [open, setOpen] = useState(false)
  const t = prior.twin

  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-soft text-teal">
        <Lightbulb className="size-5" />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        <h2 className="text-[17px] font-medium text-ink">{prior.title}</h2>
        <p className="text-[15px] leading-snug text-ink-2">{prior.text}</p>
      </div>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-[13.5px] font-semibold text-navy-700 hover:bg-slate-200">
        Compare Twins
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title={`Twin comparison: ${problemId} vs ${t.id}`}>
        <p className="text-[14px] text-ink-2">
          Sister unit event <Mono className="font-semibold text-ink">{t.id}</Mono> ({t.when}) is used as the Bayesian prior for the current hypothesis ranking.
        </p>
        <table className="mt-4 w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-2 font-medium">Signal</th>
              <th className="py-2 text-right font-medium">{problemId} (now)</th>
              <th className="py-2 text-right font-medium">
                {t.id} ({t.when})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {t.rows.map((r) => (
              <tr key={r.signal}>
                <td className="py-2.5 text-ink">{r.signal}</td>
                <td className="py-2.5 text-right font-mono text-[13px] font-semibold text-critical">{r.current}</td>
                <td className="py-2.5 text-right font-mono text-[13px] text-ink">{r.twin}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 rounded-lg bg-good-soft p-4 text-[14px] text-ink">
          <p className="text-[13px] font-medium text-good">Confirmed outcome</p>
          <p className="mt-1">{t.outcome}</p>
        </div>
      </Drawer>
    </Card>
  )
}
