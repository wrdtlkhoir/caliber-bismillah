/**
 * AHP lengkap untuk ranking hipotesis root cause:
 * pairwise comparison matrix (skala Saaty) → bobot kriteria (eigenvector utama)
 * → Consistency Ratio → skor komposit tiap hipotesis yang dinormalisasi (jumlah = 1).
 */

export const RC_CRITERIA = [
  { key: 'evidence', label: 'Evidence Strength' },
  { key: 'historical', label: 'Historical Similarity' },
  { key: 'temporal', label: 'Temporal Correlation' },
  { key: 'engineering', label: 'Engineering Consistency' },
  { key: 'dataConf', label: 'Data Confidence' },
  { key: 'controllability', label: 'Controllability & Risk' },
] as const

export type RcCriterion = (typeof RC_CRITERIA)[number]['key']
export type RcScores = Record<RcCriterion, number>

/**
 * Penilaian default (baseline) pakar reliability. Baris i vs kolom j: seberapa penting
 * kriteria i dibanding j (1 = sama, 3 = sedikit lebih penting, 5 = jauh lebih penting).
 * Hanya segitiga atas yang diisi; bawahnya resiprokal. Supervisor/user bisa menggantinya
 * lewat modal pairwise di Page 3 (lihat usePairwise).
 */
export const DEFAULT_UPPER: number[][] = [
  [2, 2, 2, 3, 2],
  [2, 1, 1, 4],
  [1, 2, 5],
  [2, 2],
  [1],
]

/** Skala Saaty yang boleh dipilih di setiap sel (1/9 … 9). */
export const SAATY_SCALE = [1 / 9, 1 / 7, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function buildMatrix(upper: number[][]) {
  const n = RC_CRITERIA.length
  const m = Array.from({ length: n }, () => Array(n).fill(1))
  upper.forEach((row, i) =>
    row.forEach((v, k) => {
      const j = i + 1 + k
      m[i][j] = v
      m[j][i] = 1 / v
    }),
  )
  return m
}

export const PAIRWISE = buildMatrix(DEFAULT_UPPER)

/** Random Index Saaty untuk n = 1..10 */
const RI = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49]

export function analyzeMatrix(m: number[][]) {
  const n = m.length
  // Power iteration → eigenvector utama
  let w = Array(n).fill(1 / n)
  for (let it = 0; it < 100; it++) {
    const v = m.map((row) => row.reduce((s, a, j) => s + a * w[j], 0))
    const sum = v.reduce((a, b) => a + b, 0)
    w = v.map((x) => x / sum)
  }
  const aw = m.map((row) => row.reduce((s, a, j) => s + a * w[j], 0))
  const lambdaMax = aw.reduce((s, x, i) => s + x / w[i], 0) / n
  const ci = (lambdaMax - n) / (n - 1)
  const cr = ci / RI[n]
  return { weights: w, lambdaMax, ci, cr }
}

export type AhpAnalysis = ReturnType<typeof analyzeMatrix>

export const RC_AHP = analyzeMatrix(PAIRWISE)
export const CR_THRESHOLD = 0.1

export const rcWeight = (key: RcCriterion, weights: number[] = RC_AHP.weights) => weights[RC_CRITERIA.findIndex((c) => c.key === key)]

export function rawScore(s: RcScores, weights: number[] = RC_AHP.weights) {
  return RC_CRITERIA.reduce((sum, c) => sum + rcWeight(c.key, weights) * s[c.key], 0)
}

/** Skor komposit tiap alternatif, dinormalisasi supaya total = 1.00. */
export function synthesize<T extends { scores: RcScores }>(alts: T[], weights: number[] = RC_AHP.weights) {
  const raw = alts.map((a) => rawScore(a.scores, weights))
  const total = raw.reduce((a, b) => a + b, 0) || 1
  return alts
    .map((a, i) => ({ ...a, priority: raw[i] / total }))
    .sort((a, b) => b.priority - a.priority)
}

export function fraction(v: number) {
  if (v >= 1) return String(Math.round(v))
  return `1/${Math.round(1 / v)}`
}
