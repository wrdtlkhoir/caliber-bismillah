/**
 * Builder data Page 4 (Action & Reliability Loop) dari laporan RCA (CAPA, PM, risk)
 * + history kondisi sebelum/sesudah perbaikan + Incident Database.
 */
import { baseline, componentFamily, median, OPEN_STATUSES } from '@/lib/analytics'
import { addDays, daysBetween, fmtDate } from '@/lib/asOf'
import { incidentOf, incidents, assets, type Asset, type RcaReport } from './dataset'
import { fmtValue } from './plant'
import { buildRootCause } from './rootCause'

export type ActionType = 'Corrective' | 'Preventive' | 'Proactive'
export type ActionPriority = 'Critical' | 'High' | 'Medium'
export type ActionStatus = 'Done' | 'In progress' | 'Not started'

export interface CapaAction {
  id: string
  title: string
  ref: string
  team: string
  type: ActionType
  owner: string
  due: string
  priority: ActionPriority
  status: ActionStatus
  criteria: string
}

export interface FleetItem {
  id: string
  name: string
  level: 'ELEVATED' | 'MODERATE' | 'MONITORING'
  note: string
}

export interface ActionCase {
  asset: Asset
  rca: RcaReport
  contextCycle: string
  criticality: string
  conditionText: string
  restored: boolean
  preFailure: boolean
  validation: { id: string; rootCause: string; by: string; at: string }
  kpis: {
    effectiveness: { value: number; delta: string; benchmark: string }
    closure: { value: number; delta: string; benchmark: string }
    repeat: { value: number; badge: string; benchmark: string }
    awaiting: { value: number; note: string }
  }
  actions: CapaAction[]
  verification: {
    title: string
    unit: string
    digits: number
    trip: number
    alarm: number
    alarmDir: 'high' | 'low'
    normal: [number, number]
    before: { date: string; value: number }[]
    after: { date: string; value: number }[]
    eventLabel: string
    checks: { state: 'done' | 'pending'; title: string; text: string; mono?: boolean }[]
  }
  systemicActionIndex?: number
  systemicText?: string
  fleet: { intro: string; items: FleetItem[] }
}

const STATUS: Record<string, ActionStatus> = { Closed: 'Done', 'In Progress': 'In progress', Open: 'Not started' }
const TYPE: Record<string, ActionType> = { corrective: 'Corrective', proactive: 'Proactive', preventive: 'Preventive' }

/** Ekspansi "KO-3202/3203" → ["KO-3202", "KO-3203"] */
function tagsIn(text: string) {
  const out: string[] = []
  for (const m of text.matchAll(/([A-Z]{2})-(\d{4}[A-Z]?)((?:\/\d{4}[A-Z]?)*)/g)) {
    out.push(`${m[1]}-${m[2]}`)
    m[3]
      .split('/')
      .filter(Boolean)
      .forEach((n) => out.push(`${m[1]}-${n}`))
  }
  return out
}

function capaKpis(a: Asset, asOf: string): ActionCase['kpis'] {
  const known = incidents.filter((i) => i.date <= asOf)
  const closureRate = (xs: typeof known) => {
    const past = xs.filter((i) => ['RISK CLOSED', 'CA/PA EXECUTION', 'MONITORING RESULT'].includes(i.status))
    return past.length ? (100 * past.filter((i) => i.status === 'RISK CLOSED').length) / past.length : 0
  }
  const lastYear = known.filter((i) => i.date > addDays(asOf, -365))
  const prevYear = known.filter((i) => i.date <= addDays(asOf, -365) && i.date > addDays(asOf, -730))
  const rate = closureRate(lastYear.length ? lastYear : known)
  const prev = closureRate(prevYear)

  const leadOf = (x: Asset) => x.rca!.actions.filter((c) => c.kind === 'corrective').map((c) => daysBetween(x.rca!.dateOccurrence, c.planDate))
  const fleet = median(assets.filter((x) => x.rca).flatMap(leadOf))
  const mine = median(leadOf(a))

  const key = (i: (typeof known)[number]) => `${i.plant}|${i.eqType}|${componentFamily(i.component)}`
  const repeats = known.filter((i) => known.some((j) => j !== i && key(j) === key(i) && j.date < i.date && daysBetween(j.date, i.date) <= 365))
  const repeatPct = known.length ? (100 * repeats.length) / known.length : 0

  const monitoring = known.filter((i) => i.status === 'MONITORING RESULT')
  return {
    effectiveness: { value: Math.round(rate), delta: `${rate - prev >= 0 ? '+' : ''}${(rate - prev).toFixed(1)} pp`, benchmark: 'vs prior 12 m' },
    closure: { value: mine, delta: `${mine - fleet >= 0 ? '+' : ''}${(mine - fleet).toFixed(0)}d`, benchmark: `Median of 5 RCA cases: ${fleet.toFixed(0)} d` },
    repeat: { value: Math.round(repeatPct), badge: `${repeats.length} cases`, benchmark: 'Same plant · eq. type · component ≤ 12 m' },
    awaiting: { value: monitoring.length, note: `${monitoring.filter((i) => i.plant === a.plant).length} in ${a.plant} · status MONITORING RESULT` },
  }
}

export function buildActionCase(a: Asset, asOf: string): ActionCase | null {
  const rca = a.rca
  if (!rca) return null
  const own = incidentOf(a)
  const priority = new Set(rca.priorityRootCauses)
  const findRow = (rc: string) => [...rca.parameterVerification, ...rca.fourMVerification].find((v) => v.id === rc)

  const counters: Record<string, number> = {}
  const actions: CapaAction[] = rca.actions.map((x) => {
    counters[x.kind] = (counters[x.kind] ?? 0) + 1
    const row = findRow(x.rc)
    return {
      id: `${x.kind[0].toUpperCase()}${counters[x.kind]}`,
      title: x.text,
      ref: `${x.rc} · ${row?.item ?? x.cause ?? ''}`,
      team: x.pic,
      type: TYPE[x.kind],
      owner: x.pic,
      due: x.planDate,
      priority: x.kind === 'corrective' ? (priority.has(x.rc) ? 'Critical' : 'High') : x.kind === 'preventive' && priority.has(x.rc) ? 'High' : 'Medium',
      status: x.status ? STATUS[x.status] : 'Not started',
      criteria: x.kind === 'corrective' ? rca.targetCondition : x.kind === 'preventive' ? `Prevents: ${x.cause ?? row?.item}` : 'Roll-out verified on similar equipment',
    }
  })

  // ---- Verification: parameter dengan degradasi terbesar saat trip
  const tripRow = a.history.find((h) => h.status === 'TRIP')
  const vp =
    a.params
      .map((p) => {
        const b = baseline(a, p)
        return { p, b, idx: tripRow ? (tripRow.values[p.key] - b.mean) / (p.trip - b.mean || 1) : 0 }
      })
      .sort((x, y) => y.idx - x.idx)[0] ?? null
  const before = a.history.filter((h) => h.date <= a.failureDate).map((h) => ({ date: h.date, value: h.values[vp.p.key] }))
  const after = a.history.filter((h) => h.date > a.failureDate).map((h) => ({ date: h.date, value: h.values[vp.p.key] }))
  const afterRows = a.history.filter((h) => h.date > a.failureDate)
  const firstAfter = after[0]
  const normalized = !!firstAfter && firstAfter.value >= vp.b.band[0] - Math.abs(vp.b.band[0]) * 0.05 && firstAfter.value <= vp.b.band[1] * 1.05
  const allNormal = afterRows.every((h) => h.status === 'NORMAL')
  const closedCorrective = rca.actions.filter((x) => x.kind === 'corrective' && x.status === 'Closed')

  const checks: ActionCase['verification']['checks'] = [
    {
      state: closedCorrective.length ? 'done' : 'pending',
      title: closedCorrective.length ? 'Immediate repair completed' : 'Immediate repair',
      text: rca.immediateAction,
    },
    {
      state: normalized ? 'done' : 'pending',
      title: normalized ? 'Condition normalized' : 'Condition not yet normalized',
      text: firstAfter
        ? `${vp.p.label} ${fmtValue(vp.p, firstAfter.value)} ${vp.p.unit} on ${fmtDate(firstAfter.date, { day: '2-digit', month: 'short' })} (baseline ${fmtValue(vp.p, vp.b.band[0])}–${fmtValue(vp.p, vp.b.band[1])})`
        : 'No post-repair reading yet',
      mono: true,
    },
    {
      state: allNormal && afterRows.length >= 8 ? 'done' : 'pending',
      title: `Recurrence watch — ${afterRows.length} week${afterRows.length === 1 ? '' : 's'} ${allNormal ? 'NORMAL' : 'with alerts'}`,
      text: `Target: ${rca.targetCondition}`,
    },
  ]

  // ---- Systemic cause = action 4M+1E (X) yang belum selesai
  const sysIdx = actions.findIndex((x, i) => rca.actions[i].rc.startsWith('X') && x.status !== 'Done')
  const sysRow = sysIdx >= 0 ? findRow(rca.actions[sysIdx].rc) : undefined
  const systemicText =
    sysIdx >= 0 && sysRow
      ? `The failed component was repaired, but the system cause ${sysRow.id} — "${sysRow.item}" (${sysRow.evidence.replace(/\.$/, '')}) — is still open until "${actions[sysIdx].title}" is completed.`
      : undefined

  // ---- Fleet vulnerability
  const proactive = rca.actions.filter((x) => x.kind === 'proactive')
  const named = [...new Set(proactive.flatMap((x) => tagsIn(x.text)))].filter((t) => t !== a.tag)
  const peers = own
    ? [
        ...new Map(
          incidents
            .filter((i) => i.tag !== a.tag && i.eqType === own.eqType && i.plant === own.plant)
            .sort((x, y) => y.totalLossK - x.totalLossK)
            .map((i) => [i.tag, i] as const),
        ).values(),
      ].slice(0, 3)
    : []
  const items: FleetItem[] = [
    ...named.map((t) => {
      const hist = incidents.filter((i) => i.tag === t)
      return { id: t, name: 'Named in pro-active action', level: hist.length ? 'ELEVATED' : 'MODERATE', note: hist.length ? `${hist.length} incidents on record` : 'Same design — roll-out planned' } as FleetItem
    }),
    ...peers
      .filter((i) => !named.includes(i.tag))
      .map(
        (i): FleetItem => ({
          id: i.tag,
          name: `${i.component} · ${i.title.replace(`${i.tag} `, '')}`,
          level: OPEN_STATUSES.has(i.status) && i.riskScore >= 400 ? 'ELEVATED' : OPEN_STATUSES.has(i.status) ? 'MODERATE' : 'MONITORING',
          note: `$${Math.round(i.totalLossK).toLocaleString('en-US')}k loss · ${i.status}`,
        }),
      ),
  ].slice(0, 4)

  const rc = buildRootCause(a, asOf)
  const preFailure = asOf < a.failureDate

  return {
    asset: a,
    rca,
    contextCycle: own?.mto ?? rca.arNo,
    criticality: `Class ${a.eqClass} · ${a.criticality} criticality`,
    conditionText: preFailure ? 'Pre-failure (replay date)' : after.length ? (normalized ? 'Restored / Normal after repair' : 'Restarted / under watch') : 'Under repair',
    restored: after.length > 0 && normalized,
    preFailure,
    validation: {
      id: rca.arNo,
      rootCause: rc?.hypotheses[0].title ?? rca.rootCause,
      by: `${own?.pic ?? '—'} (RCA PIC)`,
      at: fmtDate(rca.dateReported),
    },
    kpis: capaKpis(a, asOf),
    actions,
    verification: {
      title: vp.p.label,
      unit: vp.p.unit,
      digits: Math.abs(vp.p.alarm) < 2 ? 3 : Math.abs(vp.p.alarm) < 20 ? 2 : 1,
      trip: vp.p.trip,
      alarm: vp.p.alarm,
      alarmDir: vp.p.direction,
      normal: vp.b.band,
      before,
      after,
      eventLabel: `${fmtDate(a.failureDate, { day: '2-digit', month: 'short' })} failure & repair`,
      checks,
    },
    systemicActionIndex: sysIdx >= 0 ? sysIdx : undefined,
    systemicText,
    fleet: {
      intro: proactive.length ? `Pro-active roll-out in ${rca.arNo}: ${proactive.map((x) => x.text).join('; ')}.` : `Peers of the same equipment type in ${a.plant}.`,
      items,
    },
  }
}
