import { ArrowDown, Upload } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { StatusLabel, type StatusTone } from '@/components/ui/StatusLabel'
import { useToast } from '@/components/ui/Toast'
import { BASELINE_SOURCES, FUTURE_SOURCES, type BaselineSource, type SourceStatus } from '@/data/sources'
import { fmtDate } from '@/lib/asOf'
import { useRole } from '@/lib/role'
import { usePersistentState } from '@/lib/usePersistentState'
import { UploadModal, type PendingUpload } from '@/features/datasources/UploadModal'

const TONE: Record<SourceStatus, StatusTone> = { Available: 'good', Partial: 'medium', 'Not connected': 'neutral', Dummy: 'neutral' }

const th = 'px-3 py-2.5 font-medium'
const td = 'px-3 py-3 align-top'

export default function DataSources() {
  const { uploadDomains, uploadLocked } = useRole()
  const [selected, setSelected] = useState<BaselineSource | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploads, setUploads] = usePersistentState<PendingUpload[]>('caliber.uploads', [])
  const [toast, showToast] = useToast()
  const canUpload = uploadDomains.length > 0

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-ink">Data Sources</h1>
          <p className="text-[15px] text-ink-2">Baseline datasets behind CALIBER, their coverage, and proposed future sources</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          disabled={!canUpload}
          title={canUpload ? undefined : uploadLocked}
          className="flex h-10 items-center gap-2 rounded-[7px] bg-navy-800 px-4 text-[14.5px] font-medium text-white hover:bg-navy-700 disabled:opacity-40 disabled:hover:bg-navy-800"
        >
          <Upload className="size-4" /> Upload data
        </button>
      </div>

      <Architecture />

      {/* Baseline */}
      <Card className="overflow-hidden">
        <header className="px-5 pb-3 pt-5">
          <h2 className="text-lg font-medium text-ink">Competition baseline</h2>
          <p className="text-[13px] text-ink-2">
            Formats are the files provided to participants, not the plant's source systems. CALIBER reads a snapshot built from these files; nothing is streamed live.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-[13.5px]">
            <thead>
              <tr className="border-y border-line bg-slate-50 text-[12.5px] text-ink-2">
                <th className={`${th} pl-5`}>Data source</th>
                <th className={th}>Domain</th>
                <th className={th}>Purpose</th>
                <th className={th}>Format</th>
                <th className={th}>Granularity</th>
                <th className={th}>Scope</th>
                <th className={th}>Status</th>
                <th className={`${th} pr-5`}>Last available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {BASELINE_SOURCES.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer transition hover:bg-slate-50">
                  <td className={`${td} pl-5`}>
                    <button className="text-left font-medium text-navy-800 hover:underline" onClick={() => setSelected(s)}>
                      {s.name}
                    </button>
                    <p className="text-[12px] text-ink-3">{s.files.length} file{s.files.length === 1 ? '' : 's'}</p>
                  </td>
                  <td className={`${td} text-ink`}>{s.domain}</td>
                  <td className={`${td} max-w-[240px] text-ink-2`}>{s.purpose}</td>
                  <td className={td}>
                    <Mono className="text-ink">{s.format}</Mono>
                  </td>
                  <td className={`${td} text-ink`}>{s.granularity}</td>
                  <td className={`${td} max-w-[220px] text-ink-2`}>{s.scope}</td>
                  <td className={td} title={s.statusNote}>
                    <StatusLabel tone={TONE[s.status]}>{s.status}</StatusLabel>
                  </td>
                  <td className={`${td} pr-5`}>
                    <Mono className="whitespace-nowrap text-ink">{fmtDate(s.lastAvailable)}</Mono>
                    <p className="text-[12px] text-ink-3">Historical baseline</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Future */}
      <Card className="overflow-hidden">
        <header className="px-5 pb-3 pt-5">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-medium text-ink">
            Future / additional data sources <StatusLabel dashed>Future / Conceptual</StatusLabel>
          </h2>
          <p className="text-[13px] text-ink-2">Proposed sources with a business justification. None of these are connected to CALIBER.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead>
              <tr className="border-y border-line bg-slate-50 text-[12.5px] text-ink-2">
                <th className={`${th} pl-5`}>Source</th>
                <th className={th}>Purpose</th>
                <th className={th}>Why it is needed</th>
                <th className={`${th} pr-5`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FUTURE_SOURCES.map((f) => (
                <tr key={f.id}>
                  <td className={`${td} pl-5 font-medium text-ink`}>{f.name}</td>
                  <td className={`${td} text-ink-2`}>{f.purpose}</td>
                  <td className={`${td} max-w-[420px] text-ink-2`}>{f.justification}</td>
                  <td className={`${td} pr-5`}>
                    <StatusLabel dashed>Not connected</StatusLabel>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload yang menunggu validasi */}
      {uploads.length > 0 && (
        <Card className="overflow-hidden">
          <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
            <div>
              <h2 className="text-lg font-medium text-ink">Uploads pending validation</h2>
              <p className="text-[13px] text-ink-2">Not used by CALIBER analytics until validated and mapped to an approved data schema. Stored in this browser only.</p>
            </div>
            {canUpload && (
              <button onClick={() => setUploads([])} className="text-[13px] font-medium text-navy-700 hover:underline">
                Clear list
              </button>
            )}
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="border-y border-line bg-slate-50 text-[12.5px] text-ink-2">
                  <th className={`${th} pl-5`}>File</th>
                  <th className={th}>Classified as</th>
                  <th className={th}>Size</th>
                  <th className={th}>Sheets / rows</th>
                  <th className={th}>Submitted by</th>
                  <th className={`${th} pr-5`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td className={`${td} pl-5 text-ink`}>
                      {u.name} <Mono className="text-[12px] text-ink-3">{u.type}</Mono>
                    </td>
                    <td className={`${td} text-ink`}>{u.domain}</td>
                    <td className={td}>
                      <Mono className="text-ink">{u.sizeKB.toLocaleString('en-US')} KB</Mono>
                    </td>
                    <td className={`${td} text-ink-2`}>{u.sheets.map((s) => `${s.name} (${s.rows.toLocaleString('en-US')})`).join(', ')}</td>
                    <td className={`${td} text-ink-2`}>
                      {u.by}, {fmtDate(u.at.slice(0, 10))}
                    </td>
                    <td className={`${td} pr-5`}>
                      <StatusLabel tone="medium">Pending validation</StatusLabel>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && <SourceDetail s={selected} />}
      </Drawer>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={(u) => {
          setUploads((list) => [u, ...list])
          showToast(`${u.name} submitted, pending validation`)
        }}
      />
      {toast}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
      <dd className="mt-0.5 text-[14px] leading-relaxed text-ink">{children}</dd>
    </div>
  )
}

function SourceDetail({ s }: { s: BaselineSource }) {
  return (
    <dl className="divide-y divide-line">
      <Row label="Purpose">{s.purpose}.</Row>
      <Row label="Competition baseline">
        Provided historical dataset, folder <Mono>{s.folder}</Mono>
        <ul className="mt-1.5 space-y-1">
          {s.files.map((f) => (
            <li key={f.name} className="text-[13px] text-ink-2">
              <span className="text-ink">{f.name}</span>{' '}
              <Mono className="text-[12px]">
                {f.sizeKB} KB
                {f.sheets ? `, sheets: ${f.sheets.map((x) => `${x.name} (${x.rows} rows)`).join(', ')}` : f.slides ? `, ${f.slides} slides` : ''}
              </Mono>
            </li>
          ))}
        </ul>
      </Row>
      <Row label="File format">
        <Mono>{s.format}</Mono> <span className="text-ink-2">(competition file format)</span>
      </Row>
      <Row label="Granularity">{s.granularity}</Row>
      <Row label="Scope">{s.scope}</Row>
      <Row label="Coverage">{s.coverage}</Row>
      <Row label="Available fields">
        {s.fieldGroups.map((g) => (
          <div key={g.label} className="mt-1 first:mt-0">
            <p className="text-[13px] font-medium text-ink">{g.label}</p>
            <p className="text-[13px] text-ink-2">{g.fields.join(', ')}</p>
          </div>
        ))}
      </Row>
      <Row label="Used in CALIBER">
        <ul className="list-disc pl-4 text-[13.5px]">
          {s.usedIn.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Row>
      <Row label="Current status">
        <span className="flex flex-wrap items-center gap-2">
          <StatusLabel tone={TONE[s.status]}>{s.status}</StatusLabel> Historical baseline
        </span>
        {s.statusNote && <p className="mt-1 text-[13px] text-ink-2">{s.statusNote}</p>}
      </Row>
      {s.future && (
        <Row label="Potential future integration">
          {s.future} <StatusLabel dashed>Future / Conceptual</StatusLabel>
        </Row>
      )}
    </dl>
  )
}

/** Arsitektur ringkas: baseline → snapshot → analytics → keputusan; lapisan future terpisah & tidak tersambung. */
function Architecture() {
  const box = 'rounded-[7px] border border-line bg-white px-3 py-2 text-center'
  return (
    <Card className="p-5">
      <h2 className="text-lg font-medium text-ink">Data architecture</h2>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex flex-col items-center gap-1.5">
          <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
            {BASELINE_SOURCES.map((s) => (
              <div key={s.id} className={box}>
                <p className="text-[13.5px] font-medium text-ink">{s.name}</p>
                <Mono className="text-[11.5px] text-ink-2">Baseline {s.format}</Mono>
              </div>
            ))}
          </div>
          <ArrowDown className="size-4 text-ink-3" />
          <div className={`${box} w-full max-w-md`}>
            <p className="text-[13.5px] font-medium text-ink">Build-time snapshot</p>
            <Mono className="text-[11.5px] text-ink-2">npm run data → dataset.json</Mono>
          </div>
          <ArrowDown className="size-4 text-ink-3" />
          <div className={`${box} w-full max-w-md border-navy-700/40 bg-info-soft/40`}>
            <p className="text-[13.5px] font-medium text-navy-800">CALIBER analytics</p>
            <p className="text-[11.5px] text-ink-2">Health, AHP ranking, similarity retrieval, KPI</p>
          </div>
          <ArrowDown className="size-4 text-ink-3" />
          <div className={`${box} w-full max-w-md`}>
            <p className="text-[13.5px] font-medium text-ink">Decision / RCA / Action</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <p className="flex items-center justify-between gap-2 text-[13px] font-medium text-ink-2">
            Future layer <StatusLabel dashed>Not connected</StatusLabel>
          </p>
          <ul className="mt-2 space-y-1.5">
            {['PI / Historian', 'HSE System', 'Energy System', 'ERP / Finance'].map((n) => (
              <li key={n} className="rounded-[7px] border border-dashed border-slate-300 px-3 py-1.5 text-[13px] text-ink-2">
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-ink-3">Conceptual only. Not integrated with CALIBER.</p>
        </div>
      </div>
    </Card>
  )
}
