/**
 * Katalog sumber data untuk halaman Data Sources.
 *
 * Pemisahan penting: "domain data" (mis. Production) ≠ "format file baseline lomba" (XLSX).
 * Format XLSX/PPTX adalah cara panitia membagikan dataset, bukan sistem sumber di plant.
 * Coverage dan field diambil dari dataset hasil ETL; sistem "future" murni konseptual.
 */
import { fmtDate } from '@/lib/asOf'
import { assets, incidents, sourceFiles, type SourceFile } from './dataset'

export type SourceStatus = 'Available' | 'Partial' | 'Not connected' | 'Dummy'

export interface FieldGroup {
  label: string
  fields: string[]
}

export interface BaselineSource {
  id: string
  name: string
  domain: string
  purpose: string
  format: string
  granularity: string
  scope: string
  status: SourceStatus
  statusNote?: string
  /** tanggal data terakhir di baseline (bukan waktu refresh) */
  lastAvailable: string
  coverage: string
  folder: string
  files: SourceFile[]
  fieldGroups: FieldGroup[]
  usedIn: string[]
  /** integrasi masa depan — konseptual, tidak terhubung */
  future?: string
}

export interface FutureSource {
  id: string
  name: string
  purpose: string
  justification: string
}

const filesIn = (folder: string) => sourceFiles.filter((f) => f.folder === folder)
const range = (dates: string[]) => {
  const s = [...dates].sort()
  return { min: s[0], max: s[s.length - 1] }
}

const piEnd = (start: string, rows: number) => new Date(new Date(`${start}+07:00`).getTime() + (rows - 1) * 36e5).toISOString().slice(0, 10)
const prodWindows = assets
  .filter((a) => a.production)
  .map((a) => ({ tag: a.tag, from: a.production!.start.slice(0, 10), to: piEnd(a.production!.start, a.production!.running.length), hours: a.production!.running.length }))
const prodRange = range(prodWindows.flatMap((w) => [w.from, w.to]))
const cmRange = range(assets.flatMap((a) => a.history.map((h) => h.date)))
const incRange = range(incidents.map((i) => i.date))
const rcaDates = range(assets.flatMap((a) => (a.rca ? [a.failureDate] : [])))
const plants = new Set(incidents.map((i) => i.plant)).size
const sample = assets.find((a) => a.production)?.production

export const BASELINE_SOURCES: BaselineSource[] = [
  {
    id: 'production',
    name: 'Production Data',
    domain: 'Production',
    purpose: 'Monitor production output and performance',
    format: 'XLSX',
    granularity: 'Hourly',
    scope: `${prodWindows.length} monitored assets, one PI extract window each`,
    status: 'Partial',
    statusNote: `Hourly data covers about ${Math.round(prodWindows[0]?.hours / 24)} days per asset around each failure, not the full condition-monitoring period.`,
    lastAvailable: prodRange.max,
    coverage: prodWindows.map((w) => `${w.tag}: ${fmtDate(w.from)} – ${fmtDate(w.to)}`).join('; '),
    folder: 'Production Data',
    files: filesIn('Production Data'),
    fieldGroups: [
      { label: 'PI Tag sheet', fields: ['Name', 'Description', 'digitalset', 'engunits', 'span', 'typicalvalue', 'zero', 'instrumenttag'] },
      {
        label: 'Hourly sheet',
        fields: ['Timestamp', ...(sample ? sample.rawColumns.map((c) => c.replace(/^[A-Z0-9]+_(?!RATE)/, '<TAG>_')) : []), 'RUN_STATUS'],
      },
    ],
    usedIn: ['Problem Investigation: Historical PI Telemetry'],
    future: 'PI / historian integration',
  },
  {
    id: 'equipment',
    name: 'Equipment Performance',
    domain: 'Reliability',
    purpose: 'Monitor equipment condition and performance trends',
    format: 'XLSX',
    granularity: 'Weekly',
    scope: `${assets.length} monitored assets, ${assets[0]?.history.length ?? 0} weekly readings each`,
    status: 'Available',
    lastAvailable: cmRange.max,
    coverage: `${fmtDate(cmRange.min)} – ${fmtDate(cmRange.max)} (per-asset 26-week windows)`,
    folder: 'Equipment Performance',
    files: filesIn('Equipment Performance'),
    fieldGroups: [
      {
        label: 'Equipment Info',
        fields: [
          'Equipment Tag',
          'Equipment Name',
          'Equipment Type',
          'Equipment Class',
          'Plant / Unit',
          'Discipline',
          'Criticality',
          'Design Life',
          'Monitoring Method',
          'Linked RCA / AR No.',
          'Failure Date',
          'Dominant Failure Mode',
          'Monitored parameters & Alarm / Trip limits',
        ],
      },
      { label: 'Condition History', fields: ['Week', 'Date', '4 condition parameters (asset-specific)', 'Health Status', 'Remark'] },
      {
        label: 'Performance Summary',
        fields: ['Availability', 'No. of Failures', 'MTBF', 'MTTR', 'ALARM / TRIP / NORMAL readings', 'PM Compliance', 'Production Loss', 'Estimated Loss'],
      },
    ],
    usedIn: ['Plant Intelligence: health, early warning, Problem Tank', 'Problem Investigation: parameter trends', 'Action & Reliability: before/after verification'],
  },
  {
    id: 'incidents',
    name: 'Incident Database',
    domain: 'Reliability / Incident',
    purpose: 'Trace and analyze past incidents',
    format: 'XLSX',
    granularity: 'Incident-level',
    scope: `${incidents.length} incidents across ${plants} plants`,
    status: 'Available',
    lastAvailable: incRange.max,
    coverage: `${fmtDate(incRange.min)} – ${fmtDate(incRange.max)}`,
    folder: 'Incident Database',
    files: filesIn('Incident Database'),
    fieldGroups: [
      {
        label: 'Incident Database sheet',
        fields: [
          'Serial No',
          'MTO No.',
          'AR No.',
          'Plant',
          'Tag Number',
          'Eq. Class',
          'Date of Occur.',
          'Risk Case Title',
          'Highest Impact',
          'Pre-Risk',
          'Risk Score',
          'PIC (RCA)',
          'Overall Status',
          'Discipline',
          'Eq. Type',
          'Component',
          'F Mechanism',
          'Downtime (hrs)',
          'Act. Loss (k US$)',
          'Pot. Loss (k US$)',
          'Total Loss (k US$)',
          'RCA Due Date',
          'Month - Year',
        ],
      },
      { label: 'Dashboard sheet', fields: ['Summary by status, discipline, plant and equipment type'] },
    ],
    usedIn: ['Plant Intelligence: KPI, lifecycle, Pareto, downtime vs loss', 'Problem Investigation: similar incidents', 'Action & Reliability: closure KPIs'],
  },
  {
    id: 'rca',
    name: 'RCA - Downtime Data',
    domain: 'Downtime / RCA & CAPA',
    purpose: 'Track downtime causes and duration; RCA and CAPA records',
    format: 'PPTX',
    granularity: 'Event-level (one report per failure)',
    scope: `${filesIn('RCA - Downtime Data').length} RCA reports, one per monitored asset`,
    status: 'Available',
    lastAvailable: rcaDates.max,
    coverage: `Failures ${fmtDate(rcaDates.min)} – ${fmtDate(rcaDates.max)}`,
    folder: 'RCA - Downtime Data',
    files: filesIn('RCA - Downtime Data'),
    fieldGroups: [
      {
        label: 'Report sections',
        fields: [
          'AR details & problem statement',
          'Chronology of events',
          'Past performance analysis & impact (4W)',
          'Actual vs target condition',
          'Parameter verification (4P)',
          '4M + 1E verification',
          'Impact vs control prioritization',
          'Corrective & pro-active action (CAPAA)',
          'Preventive action & risk analysis',
          'Downtime & closure summary',
        ],
      },
    ],
    usedIn: ['Root Cause & Decision: hypotheses, evidence, audit trail', 'Action & Reliability: CAPA, PM schedule, risk analysis'],
  },
]

/** Sumber tambahan yang diusulkan. Semua "Future / Conceptual" dan tidak terhubung. */
export const FUTURE_SOURCES: FutureSource[] = [
  {
    id: 'pi',
    name: 'Future PI / Historian Integration',
    purpose: 'Near-real-time equipment and process telemetry',
    justification: 'Baseline PI data is a historical ~30-day extract per asset; continuous telemetry would extend early warning beyond the failure windows.',
  },
  {
    id: 'hse',
    name: 'HSE Management System',
    purpose: 'Safety incidents, inspections, environmental events, permits, and HSE performance indicators',
    justification: 'The baseline has no HSE classification, so the HSE KPI and status on Plant Intelligence remain Phase 2.',
  },
  {
    id: 'energy',
    name: 'Energy Management System',
    purpose: 'Energy consumption and energy intensity',
    justification: 'Baseline PI data only includes motor ampere, which is not enough to compute energy consumption.',
  },
  {
    id: 'emissions',
    name: 'Emissions',
    purpose: 'HSE/Energy system data required',
    justification: 'No emission data exists in the baseline; no values are shown.',
  },
  {
    id: 'erp',
    name: 'Financial / ERP System',
    purpose: 'Financial reconciliation and business impact',
    justification: 'Loss values in the baseline are operational estimates; no accounting records or CoA exist.',
  },
]
