/**
 * Akses tipe-aman ke dataset lomba hasil ETL (`npm run data` → generated/dataset.json).
 */
import raw from './generated/dataset.json'

export interface CmParam {
  key: string
  label: string
  unit: string
  alarm: number
  trip: number
  direction: 'high' | 'low'
}

export interface CmReading {
  week: number
  date: string
  values: Record<string, number>
  status: 'NORMAL' | 'ALARM' | 'TRIP' | string
  remark: string
}

export interface PiTag {
  Name: string
  Description: string
  engunits: string
  span: number
  typicalvalue: number
  instrumenttag: string
}

export interface ProductionData {
  tags: PiTag[]
  start: string
  stepMinutes: number
  columns: string[]
  rawColumns: string[]
  values: (number | null)[][]
  running: number[]
}

export interface VerificationRow {
  id: string
  item: string
  result: 'NG' | 'G' | string
  evidence: string
}

export interface RcaAction {
  kind: 'corrective' | 'proactive' | 'preventive'
  rc: string
  text: string
  planDate: string
  pic: string
  status: 'Closed' | 'In Progress' | 'Open' | null
  cause?: string
}

export interface RcaReport {
  arNo: string
  title: string
  arType: string
  plant: string
  discipline: string
  dateOccurrence: string
  dateReported: string
  immediateAction: string
  severity: string
  preRisk: string
  problemStatement: string
  chronology: { date: string; time: string | null; text: string }[]
  historicalEvidence: string
  impact: { what: string; when: string; scope: string; downtimeH: number; productionLossT: number; lossK: number }
  actualCondition: string
  targetCondition: string
  parameterVerification: VerificationRow[]
  fourMVerification: VerificationRow[]
  rootCause: string
  priorityRootCauses: string[]
  actions: RcaAction[]
  risks: { action: string; risk: string; countermeasure: string; planDate: string; pic: string }[]
  pmSchedule: { no: string; description: string; group: string; interval: string }[]
}

export interface Asset {
  tag: string
  name: string
  type: string
  eqClass: string
  plantName: string
  plant: string
  discipline: string
  criticality: string
  designLife: string
  monitoring: string
  arNo: string
  failureDate: string
  failureMode: string
  params: CmParam[]
  history: CmReading[]
  summary: {
    weeks: number
    downtimeH: number
    periodH: number
    availability: number
    failures: number
    mtbfH: number
    mttrH: number
    alarmReadings: number
    tripReadings: number
    normalReadings: number
    pmCompliance: number
    productionLossT: number
    lossK: number
  }
  production: ProductionData | null
  rca: RcaReport | null
}

export interface Incident {
  serial: number
  mto: string
  ar: string | null
  plant: string
  tag: string
  eqClass: string
  date: string
  title: string
  impact: string
  preRisk: string
  riskScore: number
  pic: string
  status: string
  discipline: string
  eqType: string
  component: string
  mechanism: string
  downtimeH: number
  actLossK: number
  potLossK: number
  totalLossK: number
  rcaDue: string | null
}

interface Dataset {
  generatedAt: string
  source: string
  assets: Asset[]
  incidents: Incident[]
}

/** Rapikan teks sumber untuk tampilan: " — " di laporan RCA/insiden ditampilkan sebagai ": ". File asli tidak diubah. */
function tidy<T>(v: T): T {
  if (typeof v === 'string') return v.replace(/\s+—\s+/g, ': ') as T
  if (Array.isArray(v)) return v.map(tidy) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x)])) as T
  return v
}

export const dataset = tidy(raw as unknown as Dataset)
export const assets = dataset.assets
export const incidents = dataset.incidents

export const assetByTag = (tag: string | undefined) => assets.find((a) => a.tag === tag)
export const incidentOf = (a: Asset) => incidents.find((i) => i.ar === a.arNo || i.tag === a.tag)

/** Rentang tanggal data kondisi (untuk kontrol replay "as of"). */
export const DATA_RANGE = (() => {
  const dates = assets.flatMap((a) => a.history.map((h) => h.date)).sort()
  return { min: dates[0], max: dates[dates.length - 1] }
})()
