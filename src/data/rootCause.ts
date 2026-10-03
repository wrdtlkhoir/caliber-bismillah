/**
 * Builder data Page 3 (Root Cause & Decision) dari laporan RCA (4P, 4M+1E, kronologi, CAPA)
 * + data condition monitoring + Incident Database.
 */
import { componentFamily, mechanismOf, pearson, similarIncidents } from '@/lib/analytics'
import { fmtDate } from '@/lib/asOf'
import { rawScore, type RcScores } from '@/lib/ahpPairwise'
import { incidentOf, type Asset, type VerificationRow } from './dataset'
import { fmtValue } from './plant'

export type EvidenceStatus = 'support' | 'missing' | 'contradict'

export interface Evidence {
  text: string
  source: string
  status: EvidenceStatus
}

export interface Hypothesis {
  id: string
  title: string
  summary: string
  confidence: number
  scores: RcScores
  evidence: Evidence[]
  correlated?: { label: string; value: string; tone: 'critical' | 'high' | 'neutral' }[]
  causalLoopValidated?: boolean
}

export type AuditActor = 'Automated' | 'Lead Engineer' | 'Online Sync' | 'Engineer Decision'

export interface AuditEntry {
  time: string
  actor: AuditActor
  text: string
}

export interface PathNode {
  kind: string
  title: string
  sub: string
  tone: 'default' | 'critical' | 'verified' | 'action'
  badge?: string
}

export interface RootCauseCase {
  asset: Asset
  eventNo: string
  hypotheses: Hypothesis[]
  prior?: {
    title: string
    text: string
    twin: { id: string; when: string; rows: { signal: string; current: string; twin: string }[]; outcome: string }
  }
  path: PathNode[]
  audit: AuditEntry[]
  placeholder: string
}

/**
 * Kurasi engineering: judul ringkas hipotesis, item 4P "G" yang dijadikan hipotesis
 * alternatif, dan pemetaan item 4P → parameter condition monitoring.
 */
const CURATION: Record<string, { h1: string; alts: { id: string; title: string; keywords: RegExp }[]; links: Record<string, string> }> = {
  'KO-3201': {
    h1: 'Lube-oil water ingress → bearing babbitt distress',
    alts: [
      { id: 'P5', title: 'Process surge / anti-surge instability', keywords: /surge/i },
      { id: 'P4', title: 'Bearing fatigue (end of service life)', keywords: /worn|fatigue/i },
    ],
    links: { P1: 'p1', P2: 'p2', P3: 'p3' },
  },
  'PU-2101B': {
    h1: 'Seal dry-running from low flush flow & suction cavitation',
    alts: [
      { id: 'P5', title: 'Seal faces worn out (end of life)', keywords: /worn/i },
      { id: 'P1', title: 'Pump operated above rated flow', keywords: /low performance|overload/i },
    ],
    links: { P2: 'p3', P3: 'p2' },
  },
  'PM-4405B': {
    h1: 'Grease degradation from over-extended re-lubrication interval',
    alts: [
      { id: 'P2', title: 'Motor overload (high current)', keywords: /low performance|overload/i },
      { id: 'P3', title: 'Cooling fan / ventilation blocked', keywords: /overheat/i },
    ],
    links: { P1: 'p1', P2: 'p3' },
  },
  'HE-3301': {
    h1: 'Tube-side coke/polymer fouling from high feed heavy-ends',
    alts: [
      { id: 'P4', title: 'Tube velocity below design', keywords: /low performance/i },
      { id: 'P5', title: 'Heating medium temperature off', keywords: /malfunction|error/i },
    ],
    links: { P1: 'p1', P2: 'p2', P3: 'p4' },
  },
  'BL-5702': {
    h1: 'Coupling misalignment aggravated by soft-foot & worn element',
    alts: [
      { id: 'P5', title: 'Rotor unbalance', keywords: /rotor|unbalance/i },
      { id: 'P3', title: 'Bearing defect', keywords: /bearing/i },
    ],
    links: { P1: 'p1', P2: 'p3', P4: 'p2' },
  },
}

const actorOf = (text: string, i: number): AuditActor =>
  i === 0 || /alarm|trip|trending|reached|annunciated/i.test(text)
    ? 'Automated'
    : /restored|restarted|recommissioned|returned|commissioned/i.test(text)
      ? 'Online Sync'
      : 'Lead Engineer'

export function buildRootCause(a: Asset, asOf: string): RootCauseCase | null {
  const rca = a.rca
  const cur = CURATION[a.tag]
  if (!rca || !cur) return null
  const own = incidentOf(a)
  const similar = similarIncidents(a, asOf, 30)
  const pre = a.history.filter((h) => h.date <= a.failureDate)
  const failRow = a.history.find((h) => h.status === 'TRIP') ?? pre[pre.length - 1]

  const trendStrength = (key: string) =>
    Math.abs(
      pearson(
        pre.map((h) => h.values[key]),
        pre.map((_, i) => i),
      ),
    )
  const param = (key: string) => a.params.find((p) => p.key === key)

  // ---- H1: root cause terverifikasi (semua item NG)
  const ng = [...rca.parameterVerification, ...rca.fourMVerification].filter((v) => v.result === 'NG')
  const ngP = rca.parameterVerification.filter((v) => v.result === 'NG')
  const linkedNg = ngP.map((v) => cur.links[v.id]).filter((k): k is string => !!k && !!param(k))
  const priority = new Set(rca.priorityRootCauses)
  const actionsFor = (ids: string[]) => rca.actions.filter((x) => ids.includes(x.rc)).length

  const h1Scores: RcScores = {
    evidence: (ng.length + 0.2) / (ng.length + 1),
    historical: similar[0]?.score ?? 0.3,
    temporal: linkedNg.length ? linkedNg.reduce((s, k) => s + trendStrength(k), 0) / linkedNg.length : 0.5,
    engineering: 0.5 + 0.5 * (priority.size ? ng.filter((v) => priority.has(v.id)).length / priority.size : 1),
    dataConf: ngP.length ? 0.4 + 0.6 * (linkedNg.length / ngP.length) : 0.5,
    controllability: rca.actions.length ? actionsFor(ng.map((v) => v.id)) / rca.actions.length : 0.5,
  }

  const corr =
    linkedNg.length >= 2
      ? pearson(
          pre.map((h) => h.values[linkedNg[0]]),
          pre.map((h) => h.values[linkedNg[1]]),
        )
      : null

  const h1Evidence: Evidence[] = [
    ...ngP.map((v) => ({ text: v.evidence, source: `${v.id} · 4P verification`, status: 'support' as const })),
    ...rca.fourMVerification.filter((v) => v.result === 'NG').slice(0, 2).map((v) => ({ text: v.evidence, source: `${v.id} · 4M+1E verification`, status: 'support' as const })),
    ...(corr !== null
      ? [
          {
            text: `${param(linkedNg[0])!.label} and ${param(linkedNg[1])!.label} co-trend (r = ${corr.toFixed(2)}) over ${pre.length} weeks`,
            source: 'Weekly CM record · computed',
            status: 'support' as const,
          },
        ]
      : []),
  ]

  const h1: Hypothesis = {
    id: 'H1',
    title: cur.h1,
    summary: rca.rootCause,
    confidence: 0,
    scores: h1Scores,
    evidence: h1Evidence,
    correlated: linkedNg.map((k) => {
      const p = param(k)!
      const v = failRow.values[k]
      const beyond = p.direction === 'high' ? v >= p.alarm : v <= p.alarm
      return { label: p.label, value: `${fmtValue(p, v)} ${p.unit}`, tone: beyond ? 'critical' : 'neutral' }
    }),
    causalLoopValidated: ng.length >= 3,
  }

  // ---- Hipotesis alternatif dari item "G" (terbantahkan oleh verifikasi)
  const alts = cur.alts
    .map((alt, i): Hypothesis | null => {
      const row: VerificationRow | undefined = rca.parameterVerification.find((v) => v.id === alt.id)
      if (!row) return null
      const link = cur.links[alt.id]
      const histHits = similar.filter((s) => alt.keywords.test(`${s.incident.title} ${s.incident.mechanism} ${s.incident.component}`)).length
      return {
        id: `H${i + 2}`,
        title: alt.title,
        summary: `Ruled out in ${alt.id} verification: ${row.item.toLowerCase()} — ${row.evidence}`,
        confidence: 0,
        scores: {
          evidence: 0.2 / 2,
          historical: Math.min(0.6, 0.15 + 0.1 * histHits),
          temporal: link ? 0.6 * trendStrength(link) : 0.2,
          engineering: 0.2,
          dataConf: link ? 0.8 : 0.4,
          controllability: 0.3,
        },
        evidence: [
          { text: row.evidence, source: `${row.id} · 4P verification (G = meets standard)`, status: 'contradict' },
          histHits
            ? { text: `${histHits} related incidents in the register`, source: 'Incident Database', status: 'missing' }
            : { text: 'No matching precedent in the incident register', source: 'Incident Database', status: 'missing' },
        ],
      }
    })
    .filter((h): h is Hypothesis => !!h)

  // Nomor hipotesis mengikuti peringkat skor AHP (H1 = tertinggi)
  const hypotheses = [h1, ...alts.sort((x, y) => rawScore(y.scores) - rawScore(x.scores))].map((h, i) => ({
    ...h,
    id: `H${i + 1}`,
    confidence: Math.round(100 * Object.values(h.scores).reduce((s, v) => s + v, 0) / 6),
  }))

  // ---- Prior dari insiden serupa yang sudah ditutup
  const twin = similar.find((s) => s.incident.status === 'RISK CLOSED') ?? similar[0]
  const prior = twin
    ? {
        title: 'Historical Prior Check',
        text: `${similar.filter((s) => s.score >= 0.6).length} similar ${componentFamily(own?.component ?? '').toLowerCase()} incidents on record. Closest closed case: ${twin.incident.tag} (${twin.incident.plant}, ${fmtDate(twin.incident.date, { month: 'short', year: 'numeric' })}).`,
        twin: {
          id: twin.incident.tag,
          when: fmtDate(twin.incident.date, { month: 'short', year: 'numeric' }),
          rows: [
            { signal: 'Plant / class', current: `${a.plant} · ${a.eqClass}`, twin: `${twin.incident.plant} · ${twin.incident.eqClass}` },
            { signal: 'Equipment type', current: own?.eqType ?? '—', twin: twin.incident.eqType },
            { signal: 'Component', current: own?.component ?? '—', twin: twin.incident.component },
            { signal: 'Failure mechanism', current: own ? mechanismOf(own) : '—', twin: mechanismOf(twin.incident) },
            { signal: 'Downtime', current: `${rca.impact.downtimeH} h`, twin: `${twin.incident.downtimeH} h` },
            { signal: 'Total loss', current: `$${(own?.totalLossK ?? 0).toLocaleString('en-US')}k`, twin: `$${twin.incident.totalLossK.toLocaleString('en-US')}k` },
          ],
          outcome: `${twin.incident.title} — ${twin.incident.status}${twin.incident.ar ? ` (${twin.incident.ar})` : ''}. Similarity ${Math.round(twin.score * 100)}% on ${twin.reasons.join(', ')}.`,
        },
      }
    : undefined

  // ---- Knowledge path
  const firstCorrective = rca.actions.find((x) => x.kind === 'corrective')
  const path: PathNode[] = [
    { kind: 'Target node', title: a.tag, sub: a.type, tone: 'default' },
    { kind: 'Component', title: own?.component ?? '—', sub: `${own?.eqType ?? ''} · ${a.discipline}`, tone: 'default' },
    { kind: 'Failure mode', title: a.failureMode.replace(/\s*\(.*\)$/, ''), sub: (a.failureMode.match(/\((.*)\)/) ?? [])[1] ?? own?.mechanism ?? '', tone: 'default' },
    {
      kind: 'Active signatures',
      title: h1.correlated?.[0] ? `${h1.correlated[0].label.split(' ').slice(-1)[0]} ${h1.correlated[0].value}` : '—',
      sub: h1.correlated?.[1] ? `${h1.correlated[1].label} ${h1.correlated[1].value}` : '',
      tone: 'critical',
    },
    { kind: 'Verified record', title: rca.arNo, sub: `${rca.severity} · Pre-risk ${rca.preRisk}`, tone: 'verified', badge: 'RCA' },
    ...(firstCorrective ? [{ kind: 'Corrective action', title: firstCorrective.text.split(' ').slice(0, 4).join(' '), sub: `${firstCorrective.pic} · ${firstCorrective.status ?? 'Planned'}`, tone: 'action' as const }] : []),
    ...(rca.pmSchedule[0] ? [{ kind: 'PM established', title: rca.pmSchedule[0].no, sub: `${rca.pmSchedule[0].interval} · ${rca.pmSchedule[0].group}`, tone: 'action' as const }] : []),
  ]

  // ---- Audit trail dari kronologi RCA
  const audit: AuditEntry[] = [
    ...rca.chronology.map((c, i) => ({
      time: `${fmtDate(c.date, { day: '2-digit', month: 'short' })}${c.time ? ` · ${c.time}` : ''}`,
      actor: actorOf(c.text, i),
      text: c.text,
    })),
    {
      time: fmtDate(rca.dateReported, { day: '2-digit', month: 'short' }),
      actor: 'Lead Engineer',
      text: `${rca.arNo} registered (${rca.arType}) — PIC ${own?.pic ?? '—'}, pre-risk ${rca.preRisk}, severity ${rca.severity}.`,
    },
  ]

  return {
    asset: a,
    eventNo: rca.arNo,
    hypotheses,
    prior,
    path,
    audit,
    placeholder: `e.g., ${rca.immediateAction}...`,
  }
}
