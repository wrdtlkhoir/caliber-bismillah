import clsx from 'clsx'
import { FileUp } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { StatusLabel } from '@/components/ui/StatusLabel'
import { UPLOAD_DOMAINS, useRole, type UploadDomain } from '@/lib/role'

const MAX_MB = 20

export interface UploadMeta {
  id: string
  name: string
  type: 'XLSX' | 'CSV'
  sizeKB: number
  sheets: { name: string; rows: number; columns: string[] }[]
}

export interface PendingUpload extends UploadMeta {
  domain: UploadDomain
  by: string
  at: string
}

/**
 * Baca metadata file di browser (SheetJS di-lazy-load). Hanya nama sheet, jumlah baris
 * terisi, dan baris pertama dengan ≥ 2 sel terisi sebagai kolom terdeteksi; tidak ada skema yang ditebak.
 */
async function readMeta(file: File): Promise<UploadMeta> {
  const XLSX = await import('xlsx')
  const csv = /\.csv$/i.test(file.name)
  const wb = csv ? XLSX.read(await file.text(), { type: 'string' }) : XLSX.read(await file.arrayBuffer())
  const sheets = wb.SheetNames.map((name) => {
    const rows = (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false }) as unknown[][]).filter((r) => r.some((c) => String(c).trim() !== ''))
    // baris pertama dengan ≥ 2 sel terisi (melewati baris judul seperti "INCIDENT DATABASE — …")
    const header = rows.find((r) => r.filter((c) => String(c).trim() !== '').length >= 2) ?? rows[0] ?? []
    const columns = header.map((c) => String(c).trim()).filter(Boolean)
    return { name, rows: rows.length, columns }
  })
  return { id: `${Date.now().toString(36)}`, name: file.name, type: csv ? 'CSV' : 'XLSX', sizeKB: Math.max(1, Math.round(file.size / 1024)), sheets }
}

const STEPS = ['Select file', 'Preview', 'Classify', 'Pending validation']

export function UploadModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (u: PendingUpload) => void }) {
  const { role, uploadDomains } = useRole()
  const [meta, setMeta] = useState<UploadMeta | null>(null)
  const [domain, setDomain] = useState<UploadDomain | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const step = done ? 3 : domain ? 2 : meta ? 1 : 0

  const reset = () => {
    setMeta(null)
    setDomain(null)
    setDone(false)
    setError(null)
  }
  const close = () => {
    reset()
    onClose()
  }

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (!/\.(xlsx|csv)$/i.test(file.name)) return setError('Only XLSX and CSV files are supported.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`File is larger than ${MAX_MB} MB.`)
    setBusy(true)
    try {
      setMeta(await readMeta(file))
    } catch {
      setError('The file could not be read. Check that it is a valid XLSX or CSV file.')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    if (!meta || !domain) return
    onSubmit({ ...meta, domain, by: role, at: new Date().toISOString() })
    setDone(true)
  }

  return (
    <Modal open={open} onClose={close} title="Upload data" subtitle="Add a dataset for review. Uploads are not used by CALIBER analytics." className="max-w-2xl">
      <ol className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx(i === step ? 'font-medium text-navy-800' : i < step ? 'text-ink' : 'text-ink-3')}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {done && meta && domain ? (
        <div className="mt-5 space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-[15px] text-ink">
            <span className="font-medium">{meta.name}</span> <StatusLabel tone="medium">Pending validation</StatusLabel>
          </p>
          <p className="text-[14px] leading-relaxed text-ink-2">
            Uploaded data is not automatically used by CALIBER analytics until it is validated and mapped to an approved data schema. Baseline data is not modified.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={reset} className="rounded-[7px] border border-slate-300 px-4 py-2 text-[14px] font-medium text-navy-800 hover:bg-slate-50">
              Upload another
            </button>
            <button onClick={close} className="rounded-[7px] bg-navy-800 px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-700">
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. pilih file */}
          <label
            className={clsx(
              'mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-[14px] text-ink-2 transition hover:border-navy-700',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            <FileUp className="size-5 text-navy-700" />
            <span className="flex-1">{busy ? 'Reading file…' : meta ? `Selected: ${meta.name}. Choose another file` : 'Choose an XLSX or CSV file'}</span>
            <span className="text-[12px] text-ink-3">Max {MAX_MB} MB</span>
            <input type="file" accept=".xlsx,.csv" onChange={pick} className="sr-only" />
          </label>
          {error && <p className="mt-2 text-[13px] text-critical">{error}</p>}

          {/* 2. preview metadata */}
          {meta && (
            <section className="mt-5">
              <h3 className="text-[13px] font-medium text-ink-2">File metadata</h3>
              <dl className="mt-2 grid grid-cols-3 gap-3 text-[13.5px]">
                <div>
                  <dt className="text-ink-2">Type</dt>
                  <dd className="font-mono text-ink">{meta.type}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Size</dt>
                  <dd className="font-mono text-ink">{meta.sizeKB.toLocaleString('en-US')} KB</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Sheets</dt>
                  <dd className="font-mono text-ink">{meta.sheets.length}</dd>
                </div>
              </dl>
              <table className="mt-3 w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-2">
                    <th className="py-1.5 pr-3 font-medium">Sheet</th>
                    <th className="py-1.5 pr-3 font-medium">Rows</th>
                    <th className="py-1.5 font-medium">Detected columns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {meta.sheets.map((s) => (
                    <tr key={s.name} className="align-top">
                      <td className="py-1.5 pr-3 text-ink">{s.name}</td>
                      <td className="py-1.5 pr-3 font-mono text-ink">{s.rows.toLocaleString('en-US')}</td>
                      <td className="py-1.5 text-ink-2">{s.columns.length ? s.columns.slice(0, 12).join(', ') + (s.columns.length > 12 ? ` +${s.columns.length - 12} more` : '') : 'None detected'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 text-[12px] text-ink-3">Detected columns are the first row with at least two filled cells in each sheet, as read. They are not validated against a schema.</p>
            </section>
          )}

          {/* 3. klasifikasi */}
          {meta && (
            <section className="mt-5">
              <h3 className="text-[13px] font-medium text-ink-2">Classify dataset</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {UPLOAD_DOMAINS.map((d) => {
                  const allowed = uploadDomains.includes(d)
                  return (
                    <label
                      key={d}
                      title={allowed ? undefined : `Not available for ${role}`}
                      className={clsx(
                        'flex items-center gap-2 rounded-[7px] border px-3 py-2 text-[13.5px]',
                        !allowed ? 'cursor-not-allowed border-line text-ink-3' : domain === d ? 'border-navy-700 bg-info-soft text-navy-800' : 'cursor-pointer border-slate-300 text-ink hover:border-slate-400',
                      )}
                    >
                      <input type="radio" name="domain" disabled={!allowed} checked={domain === d} onChange={() => setDomain(d)} className="accent-navy-700" />
                      {d}
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={close} className="rounded-[7px] px-4 py-2 text-[14px] text-ink-2 hover:bg-slate-100">
              Cancel
            </button>
            <button
              disabled={!meta || !domain}
              onClick={submit}
              className="rounded-[7px] bg-navy-800 px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-700 disabled:opacity-40"
            >
              Submit for validation
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
