import clsx from 'clsx'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import type { Asset } from '@/data/dataset'
import { plantLabel } from '@/data/plant'
import { componentFamily, mechanismOf, type SimilarIncident } from '@/lib/analytics'
import { fmtDate } from '@/lib/asOf'

const HIGH_SIMILARITY = 0.65

const STATUS_STYLE: Record<string, string> = {
  'RISK CLOSED': 'bg-good-soft text-good',
  'CA/PA EXECUTION': 'bg-info-soft text-navy-700',
  'RCA PROCESS': 'bg-high-soft text-high',
  'MONITORING RESULT': 'bg-teal-soft text-teal',
  'NEW REGISTERED': 'bg-medium-soft text-[#b7860b]',
  'RISK CANCELED': 'bg-slate-100 text-ink-3',
}

export function SimilarIncidents({ asset, incidents }: { asset: Asset; incidents: SimilarIncident[] }) {
  const [filter, setFilter] = useState('all')
  const filters = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'high', label: 'High Similarity', test: (s: SimilarIncident) => s.score >= HIGH_SIMILARITY },
    { key: 'plant', label: `Same Plant (${asset.plant})`, test: (s: SimilarIncident) => s.incident.plant === asset.plant },
    { key: 'closed', label: 'Closed (lessons learned)', test: (s: SimilarIncident) => s.incident.status === 'RISK CLOSED' },
  ]
  const rows = incidents.filter(filters.find((f) => f.key === filter)!.test)

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Similar Historical Incidents (Incident Database)</h2>
          <p className="mt-0.5 text-[15px] text-ink-2">
            Matched against the 380-incident register on equipment type, component, failure mechanism, discipline and plant. Only incidents recorded before the selected date are used.
          </p>
        </div>
        <div className="flex max-w-md flex-wrap justify-end gap-2" role="tablist">
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
              {f.label} ({incidents.filter(f.test).length})
            </button>
          ))}
        </div>
      </header>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="bg-slate-100 text-[14.5px] text-ink">
              <th className="rounded-l-lg px-4 py-3 font-medium">Incident</th>
              <th className="px-4 py-3 font-medium">Equipment</th>
              <th className="px-4 py-3 font-medium">Failure (component, mechanism)</th>
              <th className="px-4 py-3 font-medium">Similarity</th>
              <th className="px-4 py-3 font-medium">Matched on</th>
              <th className="px-4 py-3 text-right font-medium">Downtime / loss</th>
              <th className="rounded-r-lg px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ incident: r, score, reasons }) => (
              <tr key={r.serial} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <Mono className="block whitespace-nowrap text-[13px] font-semibold text-navy-700">{r.ar ?? r.mto}</Mono>
                  <span className="text-[12.5px] text-ink-3">{fmtDate(r.date)}</span>
                </td>
                <td className="px-4 py-4">
                  <Mono className="whitespace-nowrap text-[13px] text-ink">{r.tag}</Mono>
                  <span className="block text-[12.5px] text-ink-2">{plantLabel(r.plant)}, Class {r.eqClass}</span>
                </td>
                <td className="px-4 py-4 text-[14.5px] text-ink">
                  {componentFamily(r.component)}, {mechanismOf(r)}
                  <span className="block text-[12.5px] text-ink-3">{r.title}</span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[14px]',
                      score >= HIGH_SIMILARITY ? 'border-good/30 bg-good-soft text-good' : 'border-info/20 bg-info-soft text-navy-700',
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {Math.round(score * 100)}% match
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex max-w-[220px] flex-wrap gap-1.5">
                    {reasons.map((x) => (
                      <Mono key={x} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11.5px] text-ink-2">
                        {x}
                      </Mono>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-[13px] text-ink">
                  {r.downtimeH} h, ${Math.round(r.totalLossK).toLocaleString('en-US')}k
                </td>
                <td className="px-4 py-4">
                  <span className={clsx('whitespace-nowrap rounded px-2 py-0.5 text-[12.5px]', STATUS_STYLE[r.status] ?? 'bg-slate-100 text-ink-2')}>{r.status}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-ink-3">
                  No incidents in this category before the selected date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
