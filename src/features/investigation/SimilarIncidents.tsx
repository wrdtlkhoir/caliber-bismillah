import clsx from 'clsx'
import { SquareArrowOutUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import type { Investigation, Tone } from '@/data/investigation'

const HIGH_SIMILARITY = 90

const SIGNAL_PILL: Record<Tone, string> = {
  critical: 'border-critical/30 text-critical',
  high: 'border-high/30 text-high',
  medium: 'border-medium/40 text-[#b7860b]',
  neutral: 'border-transparent bg-slate-100 text-ink-2',
}

export function SimilarIncidents({ inv }: { inv: Investigation }) {
  const [filter, setFilter] = useState('all')
  const match = (key: string) => (i: Investigation['incidents'][number]) =>
    key === 'all' || (key === 'high' ? i.similarity >= HIGH_SIMILARITY : i.tags.includes(key))
  const rows = inv.incidents.filter(match(filter))
  const filters = [{ key: 'all', label: 'All' }, ...inv.incidentFilters]

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Similar Historical Incidents (Incident DB &amp; RCA Repository)</h2>
          <p className="mt-0.5 text-[15px] text-ink-2">Matched using failure mechanism, vibration spectrum signature, and operating parameters</p>
        </div>
        <div className="flex max-w-sm flex-wrap justify-end gap-2" role="tablist">
          {filters.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[13.5px] transition',
                filter === f.key ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink hover:border-slate-300',
              )}
            >
              {f.label} ({inv.incidents.filter(match(f.key)).length})
            </button>
          ))}
        </div>
      </header>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left">
          <thead>
            <tr className="bg-slate-100 text-[14.5px] text-ink">
              <th className="rounded-l-lg px-4 py-3 font-medium">Incident ID</th>
              <th className="px-4 py-3 font-medium">Equipment</th>
              <th className="px-4 py-3 font-medium">Failure mechanism</th>
              <th className="px-4 py-3 font-medium">Similarity</th>
              <th className="px-4 py-3 font-medium">Signals matched</th>
              <th className="w-[26%] rounded-r-lg px-4 py-3 font-medium">Verified RCA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="align-middle transition hover:bg-slate-50/70">
                <td className="px-4 py-5">
                  <Link to={`/knowledge?id=${r.id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[13.5px] font-semibold text-navy-700 hover:underline">
                    {r.id}
                    <SquareArrowOutUpRight className="size-3.5" />
                  </Link>
                </td>
                <td className="px-4 py-5">
                  <Mono className="whitespace-nowrap text-[13.5px] text-ink">
                    {r.equipment} ({r.location})
                  </Mono>
                </td>
                <td className="px-4 py-5 text-[15px] text-ink">{r.mechanism}</td>
                <td className="px-4 py-5">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[14px]',
                      r.similarity >= HIGH_SIMILARITY ? 'border-good/30 bg-good-soft text-good' : 'border-info/20 bg-info-soft text-navy-700',
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {r.similarity}% match
                  </span>
                </td>
                <td className="px-4 py-5">
                  <div className="flex flex-wrap gap-2">
                    {r.signals.map((s) => (
                      <Mono key={s.label} className={clsx('rounded border px-2 py-0.5 text-[12.5px]', SIGNAL_PILL[s.tone])}>
                        {s.label}
                      </Mono>
                    ))}
                  </div>
                </td>
                <td className="space-y-3 px-4 py-5 text-[14px] leading-snug text-ink">
                  <p>{r.rca.cause}</p>
                  <p className="text-ink-2">
                    <span className="font-medium text-ink">Fix: </span>
                    {r.rca.fix}
                  </p>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-ink-3">
                  No incidents in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
