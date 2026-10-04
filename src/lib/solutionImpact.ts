/**
 * Impact report solusi: dampak baik, dampak buruk, dan benturan dengan constraint
 * untuk setiap action CAPA yang menyelesaikan item root cause sebuah hipotesis.
 * Sumber: laporan RCA (action, target, risk analysis) + constraint yang diisi user.
 */
import type { Asset, RcaAction } from '@/data/dataset'
import { CONSTRAINT_TYPES, type DecisionConstraint } from './constraints'

export interface SolutionImpact {
  action: RcaAction
  good: string[]
  bad: string[]
  conflicts: string[]
  notes: string[]
}

const NEEDS_OUTAGE = /repair|replace|retube|install|re-?align|clean|shim|re-?shim|plug/i
const ADDS_WORKLOAD = /interval|sop|\bpm\b|route|review|register|track|check-sheet|weekly|monthly|trend/i
const WIDE_SCOPE = /roll out|apply .* to|\ball\b/i
const EARLY_DETECTION = /sensor|transmitter|alarm|alert|interlock|switch|trend|monitor|trigger/i

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3))
const overlap = (a: string, b: string) => [...words(a)].filter((w) => words(b).has(w)).length

export function solutionImpacts(a: Asset, rcIds: string[], constraints: DecisionConstraint[]): SolutionImpact[] {
  const rca = a.rca
  if (!rca) return []
  const rows = [...rca.parameterVerification, ...rca.fourMVerification]
  const tagsOf = (t: string) => [...t.matchAll(/[A-Z]{2}-\d{4}[A-Z]?(?:\/\d{4}[A-Z]?)*/g)].map((m) => m[0])

  return rca.actions
    .filter((x) => rcIds.includes(x.rc))
    .map((x) => {
      const row = rows.find((r) => r.id === x.rc)
      const outage = NEEDS_OUTAGE.test(x.text) && x.kind !== 'proactive'
      const good: string[] = []
      const bad: string[] = []
      const conflicts: string[] = []
      const notes: string[] = []

      if (row) good.push(`Closes ${row.id}: ${row.item.toLowerCase()}`)
      if (x.kind !== 'proactive') good.push(`Avoids a repeat of ${rca.impact.downtimeH} h downtime and $${rca.impact.lossK.toLocaleString('en-US')}k loss`)
      if (x.kind === 'corrective') good.push(`Moves toward the target: ${rca.targetCondition}`)
      if (x.kind === 'proactive') {
        const tags = tagsOf(x.text)
        good.push(tags.length ? `Protects ${tags.join(', ')} before the same failure happens` : 'Extends the fix to similar equipment')
      }
      if (EARLY_DETECTION.test(x.text)) good.push('Detects the failure mode earlier, before alarm or trip')

      const risk = rca.risks.find((r) => overlap(r.action, x.text) >= 2)
      if (risk) bad.push(`${risk.risk}. Mitigation in the RCA: ${risk.countermeasure.toLowerCase()}`)
      if (outage) bad.push('Needs an equipment outage or a switch to the spare to carry out')
      if (ADDS_WORKLOAD.test(x.text)) bad.push(`Adds recurring workload for ${x.pic}`)
      if (WIDE_SCOPE.test(x.text)) bad.push('Cost and schedule spread over several assets')
      if (!bad.length) bad.push('No notable downside recorded in the RCA')

      for (const c of constraints) {
        const label = CONSTRAINT_TYPES[c.type].label.toLowerCase()
        const num = Number.parseFloat(c.value)
        if (c.type === 'downtime' && outage) {
          if (Number.isFinite(num) && num < rca.impact.downtimeH) conflicts.push(`Last repair took ${rca.impact.downtimeH} h, longer than the ${num} h window`)
          else notes.push(`Fits the ${c.value} h downtime window`)
        } else if (c.type === 'budget') {
          notes.push(`The RCA has no cost estimate, so check it against the ${c.value}k US$ budget`)
        } else if (c.type === 'spares' && outage) {
          conflicts.push(`Depends on spares (${c.value})`)
        } else if (c.type === 'manpower' && (outage || ADDS_WORKLOAD.test(x.text))) {
          notes.push(`Uses ${x.pic} capacity (${label}: ${c.value})`)
        } else if (c.type === 'permit' && outage) {
          notes.push(`Needs a work permit (${c.value})`)
        } else if (c.type === 'production' && outage) {
          conflicts.push(`Outage clashes with the production commitment (${c.value})`)
        } else if (c.type === 'other') {
          notes.push(`Check against: ${c.value}`)
        }
      }

      return { action: x, good, bad, conflicts, notes }
    })
}
