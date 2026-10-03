import type { CriteriaScores, Problem } from '@/data/types'

/**
 * Bobot AHP (Analytic Hierarchy Process) untuk 6 dimensi operasional.
 * Total = 1.0. Bobot diturunkan dari pairwise comparison matrix (CR < 0.1).
 */
export const AHP_WEIGHTS: Record<keyof CriteriaScores, { label: string; weight: number }> = {
  safety: { label: 'Safety', weight: 0.28 },
  prodLoss: { label: 'Prod Loss', weight: 0.24 },
  financial: { label: 'Financial', weight: 0.2 },
  critEquip: { label: 'Crit. Equip', weight: 0.14 },
  degradation: { label: 'Degradation', weight: 0.09 },
  recurrence: { label: 'Recurrence', weight: 0.05 },
}

/** Skor AHP di atas ambang ini dihitung sebagai "Critical Risk" pada KPI. */
export const CRITICAL_RISK_THRESHOLD = 0.72

export const CRITERIA_KEYS = Object.keys(AHP_WEIGHTS) as (keyof CriteriaScores)[]

export function ahpScore(c: CriteriaScores): number {
  const raw = CRITERIA_KEYS.reduce((sum, k) => sum + AHP_WEIGHTS[k].weight * c[k], 0)
  return Math.round(raw * 100) / 100
}

/** Kontribusi tiap kriteria terhadap skor akhir, diurutkan dari terbesar. */
export function ahpBreakdown(c: CriteriaScores) {
  return CRITERIA_KEYS.map((k) => ({
    key: k,
    label: AHP_WEIGHTS[k].label,
    weight: AHP_WEIGHTS[k].weight,
    score: c[k],
    contribution: AHP_WEIGHTS[k].weight * c[k],
  })).sort((a, b) => b.contribution - a.contribution)
}

export function rankProblems(problems: Problem[]) {
  return [...problems]
    .map((p) => ({ ...p, ahp: ahpScore(p.criteria) }))
    .sort((a, b) => b.ahp - a.ahp)
}

export type RankedProblem = ReturnType<typeof rankProblems>[number]
