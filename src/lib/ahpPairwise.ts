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
 * Hasil penilaian pakar reliability. Baris i vs kolom j: seberapa penting kriteria i
 * dibanding j (1 = sama, 3 = sedikit lebih penting, 5 = jauh lebih penting).
 * Hanya segitiga atas yang diisi; bawahnya resiprokal.
 */
const UPPER: number[][] = [
  [2, 2, 2, 3, 2],
  [2, 1, 1, 4],
  [1, 2, 5],
  [2, 2],
  [1],
]

export const PAIRWISE: number[][] = (() => {
  const n = RC_CRITERIA.length
  const m = Array.from({ length: n }, () => Array(n).fill(1))
  UPPER.forEach((row, i) =>
    row.forEach((v, k) => {
      const j = i + 1 + k
      m[i][j] = v
      m[j][i] = 1 / v
    }),
  )
  return m
})()

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

export const RC_AHP = analyzeMatrix(PAIRWISE)
export const CR_THRESHOLD = 0.1

export const rcWeight = (key: RcCriterion) => RC_AHP.weights[RC_CRITERIA.findIndex((c) => c.key === key)]

export function rawScore(s: RcScores) {
  return RC_CRITERIA.reduce((sum, c) => sum + rcWeight(c.key) * s[c.key], 0)
}

/** Skor komposit tiap alternatif, dinormalisasi supaya total = 1.00. */
export function synthesize<T extends { scores: RcScores }>(alts: T[]) {
  const raw = alts.map((a) => rawScore(a.scores))
  const total = raw.reduce((a, b) => a + b, 0) || 1
  return alts
    .map((a, i) => ({ ...a, priority: raw[i] / total }))
    .sort((a, b) => b.priority - a.priority)
}

export function fraction(v: number) {
  if (v >= 1) return String(Math.round(v))
  return `1/${Math.round(1 / v)}`
}
