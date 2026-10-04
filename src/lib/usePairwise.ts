import { useMemo } from 'react'
import { analyzeMatrix, buildMatrix, DEFAULT_UPPER } from './ahpPairwise'
import { usePersistentState } from './usePersistentState'

export interface PairwiseJudgment {
  upper: number[][]
  filledBy: string
  role: string
  at: string
}

/**
 * Penilaian pairwise kriteria root cause. Berlaku untuk semua aset (bobot organisasi),
 * diisi oleh supervisor/user dan disimpan di localStorage. Tanpa isian, dipakai baseline pakar.
 */
export function usePairwise() {
  const [judgment, setJudgment] = usePersistentState<PairwiseJudgment | null>('caliber.pairwise.v1', null)
  const upper = judgment?.upper ?? DEFAULT_UPPER
  const analysis = useMemo(() => analyzeMatrix(buildMatrix(upper)), [upper])

  return {
    judgment,
    upper,
    matrix: buildMatrix(upper),
    analysis,
    save: (next: Omit<PairwiseJudgment, 'at'>) => setJudgment({ ...next, at: new Date().toISOString() }),
    reset: () => setJudgment(null),
  }
}

export type PairwiseState = ReturnType<typeof usePairwise>
