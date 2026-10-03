/**
 * Analitik CALIBER di atas dataset asli — tanpa model yang perlu di-training:
 *  - Health & early warning : posisi nilai terhadap baseline/alarm/trip + regresi tren → proyeksi hari ke alarm/trip
 *  - Similar incident retrieval : skor kemiripan berbobot (tipe equipment, komponen, mekanisme, disiplin, plant)
 *  - Prioritas : kriteria AHP dihitung dari konsekuensi (loss, risk), kelas aset, degradasi, dan rekurensi
 *  - KPI : agregasi Incident Database per jendela waktu yang berakhir di tanggal "as of"
 */
import { assets, incidentOf, incidents, type Asset, type CmParam, type CmReading, type Incident } from '@/data/dataset'
import { addDays, daysBetween } from './asOf'

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)))

/* ------------------------------------------------------------------ */
/* Parameter health                                                     */
/* ------------------------------------------------------------------ */

export type ParamState = 'normal' | 'alarm' | 'trip'

const beyond = (p: CmParam, v: number, limit: number) => (p.direction === 'high' ? v >= limit : v <= limit)
export const paramState = (p: CmParam, v: number): ParamState => (beyond(p, v, p.trip) ? 'trip' : beyond(p, v, p.alarm) ? 'alarm' : 'normal')

/** Baseline = 6 pembacaan NORMAL pertama; band normal = mean ± 2σ. */
export function baseline(a: Asset, p: CmParam) {
  const xs = a.history.filter((h) => h.status === 'NORMAL').slice(0, 6).map((h) => h.values[p.key])
  const m = mean(xs)
  const s = Math.max(sd(xs), Math.abs(m) * 0.01)
  return { mean: m, band: [m - 2 * s, m + 2 * s] as [number, number] }
}

/** 0 = baseline, 1 = trip (berlaku untuk arah high maupun low). */
export const degradationIndex = (p: CmParam, v: number, baseMean: number) => clamp((v - baseMean) / (p.trip - baseMean || 1), 0, 1.2)

/** Regresi linear (least squares) nilai terhadap hari. */
export function linearTrend(points: { date: string; value: number }[]) {
  if (points.length < 2) return { slopePerDay: 0, r2: 0 }
  const x = points.map((p) => daysBetween(points[0].date, p.date))
  const y = points.map((p) => p.value)
  const mx = mean(x)
  const my = mean(y)
  const sxy = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0)
  const sxx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0) || 1
  const slope = sxy / sxx
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0) || 1
  const ssRes = y.reduce((s, yi, i) => s + (yi - (my + slope * (x[i] - mx))) ** 2, 0)
  return { slopePerDay: slope, r2: 1 - ssRes / ssTot }
}

/** Proyeksi hari sampai nilai menyentuh limit, berdasarkan tren 6 pembacaan terakhir. */
function daysToLimit(p: CmParam, pts: { date: string; value: number }[], limit: number) {
  const last = pts[pts.length - 1]?.value
  if (last === undefined) return null
  if (beyond(p, last, limit)) return 0
  const { slopePerDay } = linearTrend(pts.slice(-6))
  const towards = p.direction === 'high' ? slopePerDay > 0 : slopePerDay < 0
  if (!towards || slopePerDay === 0) return null
  const d = (limit - last) / slopePerDay
  // Proyeksi > 180 hari dianggap noise, tidak ditampilkan
  return d > 0 && d <= 180 ? Math.round(d) : null
}

export interface ParamHealth {
  param: CmParam
  value: number
  prev: number
  changePct: number
  state: ParamState
  index: number
  base: ReturnType<typeof baseline>
  slopePerWeek: number
  daysToAlarm: number | null
  daysToTrip: number | null
  points: { date: string; value: number }[]
}

export type Phase = 'no-data' | 'healthy' | 'early-warning' | 'alarm' | 'trip' | 'post-repair'

export interface AssetHealth {
  asset: Asset
  readings: CmReading[]
  latest: CmReading | null
  params: ParamHealth[]
  worst: ParamHealth | null
  phase: Phase
}

export const readingsUpTo = (a: Asset, asOf: string) => a.history.filter((h) => h.date <= asOf)

export function assetHealth(a: Asset, asOf: string): AssetHealth {
  const readings = readingsUpTo(a, asOf)
  const latest = readings[readings.length - 1] ?? null
  if (!latest) return { asset: a, readings, latest, params: [], worst: null, phase: 'no-data' }

  // Setelah perbaikan, tren dihitung dari data pasca-repair saja
  const failed = a.failureDate <= asOf && latest.date > a.failureDate
  const window = failed ? readings.filter((r) => r.date > a.failureDate) : readings

  const params = a.params
    .map((p): ParamHealth => {
      const points = readings.map((r) => ({ date: r.date, value: r.values[p.key] }))
      const recent = window.map((r) => ({ date: r.date, value: r.values[p.key] }))
      const base = baseline(a, p)
      const value = latest.values[p.key]
      const prev = readings[Math.max(0, readings.length - 5)].values[p.key]
      return {
        param: p,
        value,
        prev,
        changePct: prev ? ((value - prev) / Math.abs(prev)) * 100 : 0,
        state: paramState(p, value),
        index: degradationIndex(p, value, base.mean),
        base,
        slopePerWeek: linearTrend(recent.slice(-6)).slopePerDay * 7,
        daysToAlarm: daysToLimit(p, recent, p.alarm),
        daysToTrip: daysToLimit(p, recent, p.trip),
        points,
      }
    })
    .sort((x, y) => y.index - x.index)

  const worst = params[0]
  let phase: Phase
  if (latest.status === 'TRIP') phase = 'trip'
  else if (failed) phase = 'post-repair'
  else if (latest.status === 'ALARM' || params.some((p) => p.state !== 'normal')) phase = 'alarm'
  else if (worst.index >= 0.3 || (worst.index >= 0.12 && worst.daysToAlarm !== null && worst.daysToAlarm <= 60)) phase = 'early-warning'
  else phase = 'healthy'

  return { asset: a, readings, latest, params, worst, phase }
}

/* ------------------------------------------------------------------ */
/* Similar incident retrieval                                           */
/* ------------------------------------------------------------------ */

const FAMILIES: [RegExp, string][] = [
  [/bearing/i, 'Bearing'],
  [/seal/i, 'Seal'],
  [/coupling/i, 'Coupling'],
  [/tube|bundle/i, 'Tube Bundle'],
  [/rotor|shaft/i, 'Rotor/Shaft'],
  [/valve|solenoid/i, 'Valve'],
]
export const componentFamily = (c: string) => FAMILIES.find(([re]) => re.test(c))?.[1] ?? c

const MECH_FROM_TITLE: [RegExp, string][] = [
  [/vibration/i, 'High Vibration'],
  [/leak/i, 'Leakage'],
  [/overheat|temperature/i, 'Overheat'],
  [/fouling/i, 'Fouling'],
  [/worn|wear/i, 'Worn Out'],
  [/crack/i, 'Crack'],
]
const STANDARD_MECH = new Set(['Leakage', 'High Vibration', 'Worn Out', 'Malfunction', 'Low Performance', 'Crack', 'Fouling', 'Error', 'Loose', 'Stuck', 'Overheat', 'Breakage'])
export const mechanismOf = (i: Pick<Incident, 'mechanism' | 'title'>) =>
  STANDARD_MECH.has(i.mechanism) ? i.mechanism : MECH_FROM_TITLE.find(([re]) => re.test(i.title))?.[1] ?? i.mechanism

export interface SimilarIncident {
  incident: Incident
  score: number
  reasons: string[]
}

const SIM_WEIGHTS = { eqType: 0.3, component: 0.3, mechanism: 0.25, discipline: 0.1, plant: 0.05 }

export function similarIncidents(a: Asset, asOf: string, limit = 8): SimilarIncident[] {
  const own = incidentOf(a)
  if (!own) return []
  const q = { eqType: own.eqType, comp: componentFamily(own.component), mech: mechanismOf(own), disc: own.discipline, plant: own.plant }
  return incidents
    .filter((i) => i !== own && i.date <= asOf)
    .map((i) => {
      const checks: [boolean, number, string][] = [
        [i.eqType === q.eqType, SIM_WEIGHTS.eqType, 'Same eq. type'],
        [componentFamily(i.component) === q.comp, SIM_WEIGHTS.component, q.comp],
        [mechanismOf(i) === q.mech, SIM_WEIGHTS.mechanism, q.mech],
        [i.discipline === q.disc, SIM_WEIGHTS.discipline, q.disc],
        [i.plant === q.plant, SIM_WEIGHTS.plant, q.plant],
      ]
      const hits = checks.filter(([ok]) => ok)
      return { incident: i, score: sum(hits, ([, w]) => w), reasons: hits.map(([, , r]) => r) }
    })
    .filter((s) => s.score >= 0.4)
    .sort((x, y) => y.score - x.score || y.incident.totalLossK - x.incident.totalLossK)
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* Incident Database KPI                                                */
/* ------------------------------------------------------------------ */

export const OPEN_STATUSES = new Set(['NEW REGISTERED', 'RCA PROCESS', 'CA/PA EXECUTION', 'MONITORING RESULT'])

export const incidentsInWindow = (asOf: string, days: number) => {
  const from = addDays(asOf, -days)
  return incidents.filter((i) => i.date > from && i.date <= asOf)
}

const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)

export function kpis(asOf: string, days: number) {
  const cur = incidentsInWindow(asOf, days)
  const prev = incidentsInWindow(addDays(asOf, -days), days)
  const failuresIn = (end: string) => assets.filter((a) => a.failureDate > addDays(end, -days) && a.failureDate <= end)
  const assetDowntime = sum(failuresIn(asOf), (a) => a.summary.downtimeH)
  const prodLoss = (end: string) => sum(failuresIn(end), (a) => a.rca?.impact.productionLossT ?? 0)
  return {
    incidents: cur.length,
    downtimeH: sum(cur, (i) => i.downtimeH),
    downtimeDelta: sum(cur, (i) => i.downtimeH) - sum(prev, (i) => i.downtimeH),
    actLossK: sum(cur, (i) => i.actLossK),
    exposureK: sum(
      incidents.filter((i) => i.date <= asOf && OPEN_STATUSES.has(i.status)),
      (i) => i.potLossK,
    ),
    availability: 100 * (1 - assetDowntime / (assets.length * days * 24)),
    productionLossT: prodLoss(asOf),
    productionLossDelta: prodLoss(asOf) - prodLoss(addDays(asOf, -days)),
  }
}

export function plantImpact(asOf: string, days: number) {
  const m = new Map<string, { plant: string; downtimeH: number; lossK: number; count: number }>()
  for (const i of incidentsInWindow(asOf, days)) {
    const e = m.get(i.plant) ?? { plant: i.plant, downtimeH: 0, lossK: 0, count: 0 }
    e.downtimeH += i.downtimeH
    e.lossK += i.totalLossK
    e.count += 1
    m.set(i.plant, e)
  }
  return [...m.values()]
}

export function statusCounts(asOf: string) {
  const counts: Record<string, number> = {}
  for (const i of incidents) if (i.date <= asOf) counts[i.status] = (counts[i.status] ?? 0) + 1
  return counts
}

/* ------------------------------------------------------------------ */
/* Statistik pendukung                                                  */
/* ------------------------------------------------------------------ */

export function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return 0
  const x = a.slice(0, n)
  const y = b.slice(0, n)
  const mx = mean(x)
  const my = mean(y)
  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0)
  const den = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) * y.reduce((s, yi) => s + (yi - my) ** 2, 0)) || 1
  return num / den
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0
}

/* ------------------------------------------------------------------ */
/* PI hourly data                                                       */
/* ------------------------------------------------------------------ */

export function piTimeAt(a: Asset, i: number) {
  const p = a.production!
  return new Date(new Date(`${p.start}+07:00`).getTime() + i * p.stepMinutes * 60_000)
}

/** Index jam PI terakhir yang ≤ akhir hari "as of" (dibatasi ke rentang data). */
export function piIndexAt(a: Asset, asOf: string) {
  const p = a.production
  if (!p) return -1
  const end = new Date(`${asOf}T23:00:00+07:00`).getTime()
  const start = new Date(`${p.start}+07:00`).getTime()
  const i = Math.floor((end - start) / (p.stepMinutes * 60_000))
  return Math.max(0, Math.min(p.running.length - 1, i))
}

export const piCovers = (a: Asset, asOf: string) => {
  const p = a.production
  if (!p) return false
  const start = p.start.slice(0, 10)
  const end = piTimeAt(a, p.running.length - 1).toISOString().slice(0, 10)
  return asOf >= start && asOf <= end
}
