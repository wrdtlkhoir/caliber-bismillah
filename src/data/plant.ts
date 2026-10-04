/**
 * Builder data Page 1 (Plant Intelligence) dari dataset asli pada tanggal "as of".
 */
import {
  assetHealth,
  incidentsInWindow,
  kpis,
  mechanismOf,
  plantImpact,
  readingsUpTo,
  similarIncidents,
  statusCounts,
  type ParamHealth,
} from '@/lib/analytics'
import { addDays, daysBetween, fmtDate } from '@/lib/asOf'
import { assets, incidentOf, incidents, type Asset, type CmParam } from './dataset'
import type { Kpi, LifecycleStage, Problem, ProblemStatus, Severity, Signal, SignalIcon, UnitImpact, UrgentAction } from './types'

export const currentUser = { name: 'Dr. Aris S.', notifications: 2 }

/** Nama plant dari laporan RCA ("ZCU  (Zeta Cracker Unit)"); plant lain hanya punya kode. */
export const PLANT_NAMES: Record<string, string> = Object.fromEntries(
  assets
    .map((a) => a.rca?.plant.match(/^([A-Z0-9]+)\s*\((.*)\)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
)
export const plantLabel = (code: string) => PLANT_NAMES[code] ?? code
export const PLANT_SCOPE = `${new Set(incidents.map((i) => i.plant)).size} plants, ${incidents.length} recorded incidents`

/* ------------------------------------------------------------------ */

export const fmtValue = (p: CmParam, v: number) => {
  const digits = Math.abs(p.alarm) < 2 ? 3 : Math.abs(p.alarm) < 20 ? 2 : 1
  return Number(v.toFixed(digits)).toString()
}

const ICON: [RegExp, SignalIcon][] = [
  [/micron|mm\/s/, 'gauge'],
  [/°C/, 'temp'],
  [/ppm|L\/min/, 'drop'],
  [/bar/, 'diff'],
  [/%/, 'trend'],
]
const iconOf = (p: CmParam): SignalIcon => (p.direction === 'low' && /bar/.test(p.unit) ? 'down' : ICON.find(([re]) => re.test(p.unit))?.[1] ?? 'trend')

function paramSignal(ph: ParamHealth): Signal {
  const p = ph.param
  const limit = ph.state === 'trip' ? `Trip: ${p.trip}` : `Alarm: ${p.alarm}`
  const tone = ph.state === 'trip' ? 'critical' : ph.state === 'alarm' ? (ph.index >= 0.75 ? 'critical' : 'high') : ph.index >= 0.3 ? 'medium' : 'neutral'
  return { label: `${p.label}: ${fmtValue(p, ph.value)} ${p.unit} (${limit})`, tone, icon: iconOf(p) }
}

/** Tanggal awal episode degradasi yang sedang berjalan. */
function episodeStart(a: Asset, asOf: string) {
  const pre = readingsUpTo(a, asOf).filter((r) => r.date < a.failureDate || a.failureDate > asOf)
  let start: string | null = null
  for (let i = pre.length - 1; i >= 0; i--) {
    const ph = assetHealth(a, pre[i].date).phase
    if (ph === 'healthy' || ph === 'no-data') break
    start = pre[i].date
  }
  return start ?? pre[pre.length - 1]?.date ?? asOf
}

const PRE_RISK: Record<string, number> = { I: 1, II: 0.85, III: 0.55, IV: 0.3 }
const CLASS: Record<string, number> = { A: 1, B: 0.6, C: 0.3 }
const maxOf = (f: (a: Asset) => number) => Math.max(...assets.map(f))
const MAX_PROD = maxOf((a) => a.rca?.impact.productionLossT ?? 0)
const MAX_LOSS = maxOf((a) => a.rca?.impact.lossK ?? 0)

export function openActionsOf(a: Asset, asOf: string) {
  if (!a.rca || a.rca.dateReported > asOf) return []
  return a.rca.actions.filter((x) => x.status !== 'Closed')
}

export function buildProblem(a: Asset, asOf: string): Problem {
  const h = assetHealth(a, asOf)
  const inc = incidentOf(a)
  const [p0, p1] = h.params

  let severity: Severity = 'medium'
  if (h.phase === 'trip') severity = 'critical'
  else if (h.phase === 'alarm') severity = p0.index >= 0.75 || (p0.daysToTrip !== null && p0.daysToTrip <= 14) ? 'critical' : 'high'

  const open = openActionsOf(a, asOf)
  const status: ProblemStatus =
    h.phase === 'early-warning'
      ? 'Early Warning'
      : h.phase === 'alarm'
        ? 'Investigating'
        : h.phase === 'trip'
          ? 'RCA in Progress'
          : h.phase === 'post-repair' && open.length
            ? 'CA/PA Execution'
            : 'Monitoring'

  let title = a.failureMode
  let signals: Signal[] = []
  if (h.phase === 'post-repair') {
    const primary = h.params.find((x) => x.param.key === 'p1') ?? p0
    const total = a.rca?.actions.length ?? 0
    title = `Post-failure CAPA: ${a.failureMode}`
    signals = [
      { label: `Restored: ${primary.param.label} ${fmtValue(primary.param, primary.value)} ${primary.param.unit}`, tone: 'neutral', icon: 'check' },
      { label: `${total - open.length}/${total} CAPA actions closed`, tone: open.length ? 'medium' : 'neutral', icon: 'trend' },
      { label: `Failed ${fmtDate(a.failureDate)}, ${a.summary.downtimeH} h downtime`, tone: 'neutral' },
    ]
  } else if (p0) {
    const dir = (ph: ParamHealth) => (ph.param.direction === 'high' ? 'rising' : 'falling')
    if (h.phase === 'alarm') {
      const where = p0.state === 'normal' ? 'approaching alarm' : `${p0.param.direction === 'high' ? 'above' : 'below'} ${p0.state}`
      title = `${p0.param.label} ${where}${p1 && p1.index >= 0.3 ? ` with ${dir(p1)} ${p1.param.label}` : ''}`
    } else if (h.phase === 'early-warning') {
      title = `${p0.param.label} ${p0.param.direction === 'high' ? 'trending up' : 'trending down'}${p0.daysToAlarm ? `, alarm projected in ~${p0.daysToAlarm} days` : ''}`
    }
    signals = h.params.slice(0, 2).map(paramSignal)
    if (p0.daysToTrip && p0.daysToTrip > 0 && h.phase !== 'early-warning')
      signals.push({ label: `Trip in ~${p0.daysToTrip} d (trend)`, tone: p0.daysToTrip <= 14 ? 'critical' : 'high', icon: 'alert' })
    else if (p0.daysToAlarm && p0.daysToAlarm > 0) signals.push({ label: `Alarm in ~${p0.daysToAlarm} d (trend)`, tone: 'medium', icon: 'trend' })
  }

  const similarCount = similarIncidents(a, asOf, 30).filter((s) => s.score >= 0.6).length
  const criteria = {
    safety: Math.min(1, (PRE_RISK[inc?.preRisk ?? 'IV'] ?? 0.3) + (inc?.impact === 'Class A Eq. Breakdown' ? 0.1 : 0)),
    prodLoss: Math.sqrt((a.rca?.impact.productionLossT ?? 0) / MAX_PROD),
    financial: Math.sqrt((a.rca?.impact.lossK ?? 0) / MAX_LOSS),
    critEquip: (CLASS[a.eqClass] ?? 0.3) * (a.criticality === 'High' ? 1 : 0.85),
    degradation: h.phase === 'post-repair' ? 0.1 : Math.min(1, Math.max(p0?.index ?? 0, p0?.daysToTrip ? 1 - p0.daysToTrip / 120 : 0)),
    recurrence: Math.min(1, similarCount / 15),
  }

  return {
    id: a.tag,
    equipment: a.name,
    severity,
    phase: h.phase,
    criteria,
    area: `${plantLabel(a.plant)}, ${a.type}`,
    title,
    signals,
    status,
    lead: inc?.pic ?? 'n/a',
    unitId: a.plant,
    detectedAt: h.phase === 'post-repair' || h.phase === 'trip' ? a.failureDate : episodeStart(a, asOf),
  }
}

/** Problem aktif = aset yang tidak sehat atau masih dalam eksekusi CAPA. */
export function buildProblems(asOf: string) {
  return assets.filter((a) => ['early-warning', 'alarm', 'trip', 'post-repair'].includes(assetHealth(a, asOf).phase)).map((a) => buildProblem(a, asOf))
}

/* ------------------------------------------------------------------ */

export function urgentActionsAt(asOf: string): { items: UrgentAction[]; total: number; all: UrgentAction[] } {
  const all = assets.flatMap((a) =>
    openActionsOf(a, asOf).map((x): UrgentAction => {
      const overdue = x.planDate < asOf
      const days = daysBetween(asOf, x.planDate)
      return {
        problemId: a.tag,
        planDate: x.planDate,
        due: overdue
          ? `${fmtDate(x.planDate, { day: '2-digit', month: 'short' })} (Overdue)`
          : days <= 14
            ? `In ${days}d`
            : fmtDate(x.planDate, { day: '2-digit', month: 'short' }),
        overdue,
        task: x.text,
        owner: x.pic,
        status: overdue ? 'At Risk' : x.status === 'In Progress' ? 'In Progress' : days <= 30 ? 'Scheduled' : 'On Track',
      }
    }),
  )
  const rank = (u: UrgentAction) => (u.overdue ? 0 : u.status === 'In Progress' ? 1 : 2)
  all.sort((x, y) => rank(x) - rank(y) || x.planDate.localeCompare(y.planDate))
  return { items: all.slice(0, 4), total: all.length, all }
}

const STAGES = [
  { key: 'NEW REGISTERED', label: 'New Registered' },
  { key: 'RCA PROCESS', label: 'RCA Process' },
  { key: 'CA/PA EXECUTION', label: 'CA/PA Execution' },
  { key: 'MONITORING RESULT', label: 'Monitoring' },
  { key: 'RISK CLOSED', label: 'Risk Closed' },
]

export function lifecycleAt(asOf: string): LifecycleStage[] {
  const counts = statusCounts(asOf)
  const open = STAGES.slice(0, 4)
  const busiest = open.reduce((m, s) => ((counts[s.key] ?? 0) > (counts[m.key] ?? 0) ? s : m), open[0])
  return STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    count: counts[s.key] ?? 0,
    state: s.key === 'RISK CLOSED' ? 'closed' : s.key === busiest.key ? 'active' : 'pending',
  }))
}

export function overviewKpi(asOf: string, days: number): Kpi {
  const k = kpis(asOf, days)
  const from = addDays(asOf, -28)
  const rawAlerts = assets.reduce(
    (n, a) =>
      n +
      a.history
        .filter((r) => r.date > from && r.date <= asOf)
        .reduce((m, r) => m + a.params.filter((p) => (p.direction === 'high' ? r.values[p.key] >= p.alarm : r.values[p.key] <= p.alarm)).length, 0),
    0,
  )
  return {
    availability: { value: k.availability },
    downtime: { value: k.downtimeH, delta: k.downtimeDelta },
    productionLoss: { value: k.productionLossT, delta: k.productionLossDelta },
    financialExposure: { valueM: k.exposureK / 1000 },
    incidents: k.incidents,
    rawAlerts,
  }
}

/** Downtime & loss per plant (Incident DB), maksimal 6 kolom — plant dengan problem aktif selalu ikut. */
export function plantImpactAt(asOf: string, days: number, problemPlants: string[]): UnitImpact[] {
  const rows = plantImpact(asOf, days).sort((x, y) => y.downtimeH - x.downtimeH)
  const must = rows.filter((r) => problemPlants.includes(r.plant))
  const missing = problemPlants.filter((p) => !rows.some((r) => r.plant === p)).map((plant) => ({ plant, downtimeH: 0, lossK: 0, count: 0 }))
  const rest = rows.filter((r) => !problemPlants.includes(r.plant))
  return [...must, ...missing, ...rest]
    .slice(0, Math.max(6, must.length + missing.length))
    .sort((x, y) => y.downtimeH - x.downtimeH)
    .map((r) => ({ id: r.plant, code: r.plant, name: plantLabel(r.plant), downtimeH: r.downtimeH, lossK: r.lossK, incidents: r.count }))
}

export interface ParetoRow {
  /** kategori = mekanisme kegagalan (F Mechanism, dinormalisasi oleh mechanismOf) */
  category: string
  lossK: number
  count: number
  /** porsi kategori ini terhadap total loss (0–100) */
  sharePct: number
  /** persentase kumulatif sampai kategori ini (0–100) */
  cumPct: number
}

/**
 * Pareto Total Loss (k US$, actual + potential) Incident DB per mekanisme kegagalan,
 * untuk insiden dalam periode yang berakhir di tanggal replay. Diurutkan dari kontribusi terbesar.
 */
export function lossParetoAt(asOf: string, days: number): ParetoRow[] {
  const m = new Map<string, { lossK: number; count: number }>()
  for (const i of incidentsInWindow(asOf, days)) {
    const key = mechanismOf(i)
    const e = m.get(key) ?? { lossK: 0, count: 0 }
    e.lossK += i.totalLossK
    e.count += 1
    m.set(key, e)
  }
  const rows = [...m.entries()].map(([category, v]) => ({ category, ...v })).sort((x, y) => y.lossK - x.lossK || y.count - x.count)
  const total = rows.reduce((s, r) => s + r.lossK, 0)
  let run = 0
  return rows.map((r) => {
    run += r.lossK
    return { ...r, sharePct: total ? (r.lossK / total) * 100 : 0, cumPct: total ? (run / total) * 100 : 0 }
  })
}

/** Kontributor utama = kategori teratas sampai kumulatif pertama kali mencapai `cutoff` %. */
export function paretoHead(rows: ParetoRow[], cutoff = 80) {
  const i = rows.findIndex((r) => r.cumPct >= cutoff - 1e-9)
  return i < 0 ? rows.length : i + 1
}

export interface OperationalIncident {
  tag: string
  equipment: string
  title: string
  date: string
  impact: string
  downtimeH: number
}

/**
 * Insiden aset termonitor (Incident DB) yang sudah terjadi pada tanggal replay, terbaru dulu.
 * Ini konteks operasional, BUKAN event HSE: baseline tidak punya klasifikasi HSE.
 */
export function operationalIncidentsAt(asOf: string): OperationalIncident[] {
  return assets
    .map((a) => ({ a, inc: incidentOf(a) }))
    .filter((x): x is { a: Asset; inc: NonNullable<typeof x.inc> } => !!x.inc && x.inc.date <= asOf)
    .sort((x, y) => y.inc.date.localeCompare(x.inc.date))
    .map(({ a, inc }) => ({ tag: a.tag, equipment: a.name, title: inc.title, date: inc.date, impact: inc.impact, downtimeH: inc.downtimeH }))
}
