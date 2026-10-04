/**
 * Builder data Page 2 (Problem Investigation) untuk satu aset pada tanggal "as of".
 */
import { assetHealth, componentFamily, mechanismOf, piCovers, piIndexAt, piTimeAt, similarIncidents, type AssetHealth, type ParamHealth, type SimilarIncident } from '@/lib/analytics'
import { fmtDate } from '@/lib/asOf'
import { incidentOf, type Asset } from './dataset'
import { fmtValue, plantLabel } from './plant'
import type { SignalTone } from './types'

export type Tone = SignalTone

export interface TrendParam {
  key: string
  label: string
  unit: string
  digits: number
  alarm: number
  trip: number
  alarmDir: 'high' | 'low'
  normal: [number, number]
  points: { date: string; value: number }[]
  delta: { text: string; dir: 'up' | 'down'; tone: Tone }
  limits: { label: string; value: string }[]
  normalText: string
  status: { label: string; tone: Tone }
  color: 'critical' | 'high' | 'navy'
}

export interface ImpactStep {
  kind: 'sensor' | 'health' | 'hazard' | 'financial'
  title: string
  headline: string
  detail: string
  note?: string
}

export interface ExtraSignal {
  tag: string
  label: string
  value: string
  state: 'normal' | 'watch' | 'offline'
}

export interface Investigation {
  asset: Asset
  health: AssetHealth
  headline: string
  running: { label: string; tone: 'good' | 'medium' | 'critical' }
  failureMode: string
  liveSensors: number
  banner: { lead: string; delta: string; rest: string }
  params: TrendParam[]
  extraSignals: ExtraSignal[]
  piNote: string
  benchmark: {
    paramKey: string
    title: string
    unit: string
    value: number
    scaleMax: number
    normal: [number, number]
    alarm: number
    failure: { label: string; value: number }
    rows: { label: string; value: string; tone?: Tone }[]
  }
  impact: ImpactStep[]
  confidence: { pct: number; segments: { label: string; ok: boolean }[]; note: string }
  incidents: SimilarIncident[]
  sources: string[]
  fieldAction: string
}

const digitsOf = (alarm: number) => (Math.abs(alarm) < 2 ? 3 : Math.abs(alarm) < 20 ? 2 : 1)
const signed = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`

function trendParam(ph: ParamHealth): TrendParam {
  const p = ph.param
  const digits = digitsOf(p.alarm)
  const diff = ph.value - ph.prev
  const worsening = p.direction === 'high' ? diff > 0 : diff < 0
  const statusLabel =
    ph.state === 'trip'
      ? 'Trip limit reached'
      : ph.state === 'alarm'
        ? 'Breached alarm'
        : ph.daysToAlarm
          ? `Alarm in ~${ph.daysToAlarm} d`
          : 'Within limits'
  return {
    key: p.key,
    label: p.label,
    unit: p.unit,
    digits,
    alarm: p.alarm,
    trip: p.trip,
    alarmDir: p.direction,
    normal: ph.base.band,
    points: ph.points.slice(-26),
    delta: {
      text: `${signed(diff, digits)} / 4 wk`,
      dir: diff >= 0 ? 'up' : 'down',
      tone: !worsening ? 'neutral' : ph.state === 'trip' ? 'critical' : ph.state === 'alarm' ? 'high' : ph.index >= 0.3 ? 'medium' : 'neutral',
    },
    limits: [
      { label: p.direction === 'low' ? 'Trip low' : 'Trip', value: String(p.trip) },
      { label: p.direction === 'low' ? 'Alarm low' : 'Alarm', value: String(p.alarm) },
    ],
    normalText: `Baseline: ${fmtValue(p, ph.base.band[0])}–${fmtValue(p, ph.base.band[1])} ${p.unit}`,
    status: {
      label: statusLabel,
      tone: ph.state === 'trip' ? 'critical' : ph.state === 'alarm' ? (ph.index >= 0.75 ? 'critical' : 'high') : ph.daysToAlarm ? 'medium' : 'neutral',
    },
    color: ph.state !== 'normal' ? (ph.index >= 0.75 || ph.state === 'trip' ? 'critical' : 'high') : 'navy',
  }
}

const FIELD_ACTION: Record<string, string> = {
  CO: 'Request Lube-Oil Sampling',
  PU: 'Request Seal-Flush Inspection',
  EM: 'Request Bearing Thermography',
  HB: 'Request dP & Duty Verification',
  BL: 'Request Laser Alignment Check',
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
const mode = (xs: string[]) => {
  const m = new Map<string, number>()
  xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1))
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function buildInvestigation(a: Asset, asOf: string): Investigation {
  const health = assetHealth(a, asOf)
  const own = incidentOf(a)
  const worst = health.worst
  const latest = health.latest
  const similar = similarIncidents(a, asOf, 10)
  const top5 = similar.slice(0, 5)
  const params = [...health.params].sort((x, y) => x.param.key.localeCompare(y.param.key)).map(trendParam)

  // --- Headline & status
  const headline = !worst
    ? 'No Condition Data Yet'
    : health.phase === 'post-repair'
      ? 'Post-Failure Verification'
      : health.phase === 'trip'
        ? a.failureMode
        : health.phase === 'healthy'
          ? 'Condition Within Baseline'
          : `${worst.param.label} ${worst.state === 'normal' ? 'Trending' : worst.param.direction === 'high' ? 'High' : 'Low'}`

  const p = a.production
  const pi = piCovers(a, asOf) && p ? piIndexAt(a, asOf) : -1
  const rate = pi >= 0 && p ? p.values[p.columns.indexOf('RATE')][pi] : null
  const maxRate = p ? Math.max(...(p.values[p.columns.indexOf('RATE')] as number[])) : 0
  const running: Investigation['running'] =
    health.phase === 'trip' || (pi >= 0 && p && !p.running[pi])
      ? { label: 'Tripped / Stopped', tone: 'critical' }
      : rate !== null && maxRate
        ? { label: `Running (${Math.round((rate / maxRate) * 100)}% rate)`, tone: health.phase === 'alarm' ? 'medium' : 'good' }
        : { label: health.phase === 'alarm' ? 'Running in alarm' : 'Running', tone: health.phase === 'alarm' ? 'medium' : 'good' }

  // --- Banner
  const breached = health.params.filter((x) => x.state !== 'normal').length
  const postWeeks = health.readings.filter((r) => r.date > a.failureDate).length
  const banner = health.phase === 'post-repair'
    ? {
        lead: 'All parameters',
        delta: '',
        rest: `back within limits after the ${fmtDate(a.failureDate)} repair, with ${postWeeks} week${postWeeks === 1 ? '' : 's'} of NORMAL readings`,
      }
    : worst
    ? {
        lead: worst.param.label,
        delta: `${signed(worst.changePct, 0)}%`,
        rest: `vs 4 weeks ago. ${breached} of ${a.params.length} parameters beyond alarm${
          worst.daysToTrip ? `, trip projected in ~${worst.daysToTrip} days` : worst.daysToAlarm ? `, alarm projected in ~${worst.daysToAlarm} days` : ''
        }`,
      }
    : { lead: 'No readings', delta: '', rest: 'before the selected date' }

  // --- PI signals
  const extraSignals: ExtraSignal[] =
    p && pi >= 0
      ? p.tags.map((t, i) => {
          const v = p.values[i]?.[pi]
          return {
            tag: t.Name,
            label: t.Description,
            value: v === null || v === undefined ? 'n/a' : `${v} ${t.engunits}`,
            state: p.running[pi] ? 'normal' : 'offline',
          }
        })
      : []
  const piNote =
    p && pi < 0
      ? `PI hourly extract covers ${fmtDate(p.start.slice(0, 10))} – ${fmtDate(piTimeAt(a, p.running.length - 1).toISOString().slice(0, 10))} only; the selected date is outside it.`
      : ''

  // --- Benchmark (parameter terburuk)
  const bp = worst?.param ?? a.params[0]
  const failRow = a.history.find((h) => h.status === 'TRIP')
  const failValue = failRow?.values[bp.key] ?? bp.trip
  const bench = {
    paramKey: bp.key,
    title: `${bp.label} Benchmark`,
    unit: bp.unit,
    value: worst?.value ?? 0,
    scaleMax: Math.max(bp.trip, failValue, worst?.base.band[1] ?? 0, worst?.value ?? 0) * 1.1,
    normal: worst?.base.band ?? [0, 0],
    alarm: bp.alarm,
    failure: { label: failRow && failRow.date <= asOf ? `Failure ${fmtDate(failRow.date, { month: 'short', year: '2-digit' })}` : 'Trip', value: failRow && failRow.date <= asOf ? failValue : bp.trip },
    rows: worst
      ? [
          { label: '4-week change', value: `${signed(worst.value - worst.prev, digitsOf(bp.alarm))} ${bp.unit} (${signed(worst.changePct, 0)}%)`, tone: worst.state !== 'normal' ? ('critical' as Tone) : undefined },
          { label: 'Trend slope (6 readings)', value: `${signed(worst.slopePerWeek, digitsOf(bp.alarm))} ${bp.unit}/week` },
          {
            label: 'Projected to trip',
            value: worst.daysToTrip === 0 ? 'Reached' : worst.daysToTrip ? `~${worst.daysToTrip} days` : 'Not on current trend',
            tone: worst.daysToTrip !== null && worst.daysToTrip <= 14 ? ('critical' as Tone) : undefined,
          },
        ]
      : [],
  }

  // --- Impact translation
  const topMech = mode(top5.map((s) => `${componentFamily(s.incident.component)} ${mechanismOf(s.incident).toLowerCase()}`)) ?? (own ? `${componentFamily(own.component)} ${mechanismOf(own).toLowerCase()}` : a.failureMode)
  const sorted = [...health.params]
  const [s1, s2] = sorted
  const pctVsBase = (x: ParamHealth) => ((x.value - x.base.mean) / Math.abs(x.base.mean || 1)) * 100
  const impact: ImpactStep[] = [
    {
      kind: 'sensor',
      title: 'Sensor anomaly',
      headline: s1 ? `${s1.param.label} ${signed(pctVsBase(s1), 0)}%${s2 ? ` & ${s2.param.label} ${signed(pctVsBase(s2), 0)}%` : ''}` : 'No anomaly',
      detail: `Compared with baseline, weekly CM ${latest ? fmtDate(latest.date) : ''}`,
    },
    {
      kind: 'health',
      title: 'Machine health',
      headline: health.phase === 'post-repair' && a.rca ? 'Root cause verified in RCA' : `Likely ${topMech}`,
      detail: top5.length ? `Pattern match ${Math.round(top5[0].score * 100)}% across ${similar.length} similar incidents` : 'No similar incidents before this date',
    },
    {
      kind: 'hazard',
      title: 'Operational hazard',
      headline: a.eqClass === 'A' ? `Trip risk → ${plantLabel(a.plant)} shutdown` : `Uptime loss → ${plantLabel(a.plant)}`,
      detail: worst?.daysToTrip ? `Trend reaches trip in ~${worst.daysToTrip} days` : `Most common impact: ${mode(top5.map((s) => s.incident.impact)) ?? own?.impact ?? 'n/a'}`,
    },
    health.phase === 'post-repair' && a.rca
      ? {
          kind: 'financial',
          title: 'Financial impact (actual)',
          headline: `Loss incurred: $${a.rca.impact.lossK.toLocaleString('en-US')}k`,
          detail: `${a.rca.impact.downtimeH} h downtime and ${a.rca.impact.productionLossT.toLocaleString('en-US')} t production loss`,
          note: `Basis: ${a.rca.arNo} RCA report`,
        }
      : {
          kind: 'financial',
          title: 'Financial exposure',
          headline: `Expected loss if it fails: $${Math.round(avg(top5.map((s) => s.incident.totalLossK))).toLocaleString('en-US')}k`,
          detail: `~${avg(top5.map((s) => s.incident.downtimeH)).toFixed(1)} h downtime (avg of ${top5.length} most similar)`,
          note: 'Basis: Incident Database similarity retrieval',
        },
  ]

  // --- Data confidence
  const segments = [
    { label: 'Weekly condition monitoring', ok: health.readings.length >= 8 },
    { label: 'PI hourly data at this date', ok: pi >= 0 },
    { label: 'Similar incident history', ok: similar.filter((s) => s.score >= 0.6).length >= 3 },
  ]
  const okCount = segments.filter((s) => s.ok).length
  const confidence = {
    pct: 55 + okCount * 15,
    segments,
    note: `${health.readings.length} weekly readings, ${pi >= 0 ? 'hourly PI data available' : 'no hourly PI data for this date'}, ${similar.length} similar incidents retrieved.`,
  }

  return {
    asset: a,
    health,
    headline,
    running,
    failureMode: worst ? `${worst.param.label} degradation` : a.failureMode,
    liveSensors: a.params.length + (p?.tags.length ?? 0),
    banner,
    params,
    extraSignals,
    piNote,
    benchmark: bench,
    impact,
    confidence,
    incidents: similar,
    sources: ['Equipment Performance (weekly CM)', 'PI Production Data (hourly)', 'Incident Database', ...(a.rca ? ['RCA Report'] : [])],
    fieldAction: FIELD_ACTION[own?.eqType ?? ''] ?? 'Request Field Inspection',
  }
}
