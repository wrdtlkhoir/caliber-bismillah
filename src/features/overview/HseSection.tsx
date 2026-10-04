import { Link } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { StatusLabel } from '@/components/ui/StatusLabel'
import type { OperationalIncident } from '@/data/plant'
import { fmtDate } from '@/lib/asOf'

/** Metrik lingkungan yang hanya bisa diisi dari sistem HSE/Energy di masa depan. Tanpa angka. */
const FUTURE_METRICS = ['Emissions', 'Waste', 'Water', 'Environmental incidents', 'Energy intensity']

const Label = ({ children }: { children: string }) => <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-2">{children}</h3>

/**
 * HSE & Safety. Baseline lomba tidak berisi data HSE, jadi bagian ini menyatakan
 * ketersediaan data dengan jujur (netral, tanpa status "safe") dan hanya menampilkan
 * insiden operasional yang memang ada di Incident Database sebagai konteks.
 */
export function HseSection({ incidents, asOf }: { incidents: OperationalIncident[]; asOf: string }) {
  return (
    <Card className="p-5" aria-labelledby="hse-title">
      <header>
        <h2 id="hse-title" className="text-lg font-medium text-ink">
          HSE &amp; Safety
        </h2>
        <p className="text-[13px] text-ink-2">Safety and environmental context alongside operational and reliability decisions</p>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-0 lg:divide-x lg:divide-line">
        {/* 1. Status */}
        <section className="lg:pr-6">
          <Label>HSE status</Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[22px] font-medium text-ink-2">Phase 2</span>
            <StatusLabel>Not in baseline</StatusLabel>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">Dedicated HSE data is not included in the competition baseline.</p>
        </section>

        {/* 2. Ketersediaan data */}
        <section className="lg:px-6">
          <Label>Safety data availability</Label>
          <dl className="mt-2 space-y-1.5 text-[13.5px]">
            <div className="flex gap-3">
              <dt className="w-[68px] shrink-0 text-ink-2">HSE data</dt>
              <dd className="text-ink">
                <StatusLabel dashed>Not connected</StatusLabel>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-[68px] shrink-0 text-ink-2">Source</dt>
              <dd className="text-ink">Dedicated HSE / safety management system (future, conceptual)</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-[68px] shrink-0 text-ink-2">Purpose</dt>
              <dd className="text-ink">Safety incidents, environmental events, inspections, permits, and other HSE indicators.</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-ink-2">Future / Phase 2, no values shown:</p>
          <p className="mt-0.5 text-[13px] text-ink">{FUTURE_METRICS.join(' · ')}</p>
          <Link to="/data-sources" className="mt-3 inline-block text-[13px] font-medium text-navy-700 hover:underline">
            View data sources
          </Link>
        </section>

        {/* 3. Konteks insiden operasional */}
        <section className="min-w-0 lg:pl-6">
          <Label>Operational incident context</Label>
          <p className="mt-1 text-[12.5px] text-ink-2">
            Monitored-asset incidents from the Incident Database up to {fmtDate(asOf)}. Equipment failures, not classified as HSE events in the baseline.
          </p>
          {incidents.length ? (
            <table className="mt-2 w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-ink-2">
                  <th className="py-1.5 pr-3 font-medium">Incident</th>
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Operational impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {incidents.map((i) => (
                  <tr key={i.tag}>
                    <td className="py-1.5 pr-3">
                      <Link to={`/investigation/${i.tag}`} className="font-mono font-semibold text-navy-700 hover:underline">
                        {i.tag}
                      </Link>{' '}
                      <span className="text-ink">{i.title.replace(/^.*?:\s*/, '')}</span>
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3">
                      <Mono className="text-ink-2">{fmtDate(i.date)}</Mono>
                    </td>
                    <td className="py-1.5 text-ink">
                      {i.impact}, {i.downtimeH} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-[13.5px] text-ink-3">No HSE evidence available for this replay date.</p>
          )}
        </section>
      </div>
    </Card>
  )
}
