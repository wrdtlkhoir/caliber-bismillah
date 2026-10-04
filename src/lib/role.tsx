import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { RcCriterion } from './ahpPairwise'
import { usePersistentState } from './usePersistentState'

export const ROLES = [
  'Reliability Engineer',
  'Operations Manager',
  'Maintenance Planner',
  'Finance Manager',
  'HSE Manager',
  'Plant Director',
] as const

export type Role = (typeof ROLES)[number]

export type Permission =
  | 'validateRootCause' // Page 3: Accept / Modify / Request evidence / Reject / Revoke
  | 'editPairwise' // Page 3: isi pairwise matrix AHP (metodologi scoring)
  | 'editConstraints' // Page 3: decision constraints
  | 'editCapa' // Page 4: tambah action, ubah status, close / reopen CAPA, fleet review
  | 'requestField' // Page 2: field inspection request
  | 'export' // Export dossier PDF
  | 'askCaliber'

const ALL = [...ROLES]

const MATRIX: Record<Permission, readonly Role[]> = {
  validateRootCause: ['Reliability Engineer'],
  editPairwise: ['Reliability Engineer', 'Maintenance Planner'], // hanya sel milik role (lihat CRITERION_OWNERS)
  editConstraints: ['Reliability Engineer', 'Operations Manager'],
  editCapa: ['Reliability Engineer', 'Maintenance Planner'],
  requestField: ['Reliability Engineer', 'Maintenance Planner'],
  export: ALL,
  askCaliber: ALL,
}

/**
 * Pemilik kriteria pairwise matrix root cause (Page 3). Sel i-vs-j boleh diedit role yang memiliki
 * kriteria i ATAU j. Kriteria safety/finance/produksi tidak ada di matrix ini, jadi HSE, Finance,
 * Operations, dan Director hanya view. Problem Owner belum ada di aplikasi (problem tidak disubmit user).
 */
export const CRITERION_OWNERS: Record<RcCriterion, readonly Role[]> = {
  evidence: ['Reliability Engineer'],
  historical: ['Reliability Engineer'],
  temporal: ['Reliability Engineer'],
  engineering: ['Reliability Engineer'],
  dataConf: ['Reliability Engineer'],
  controllability: ['Maintenance Planner'],
}

export const ownsCriterion = (role: Role, c: RcCriterion) => CRITERION_OWNERS[c].includes(role)

/** Klasifikasi dataset saat upload (Data Sources). */
export const UPLOAD_DOMAINS = ['Production', 'Incident', 'Equipment Performance', 'Downtime', 'RCA / CAPA', 'Other'] as const
export type UploadDomain = (typeof UPLOAD_DOMAINS)[number]

/** Domain yang boleh di-upload per role. Finance & HSE belum punya skema yang disetujui; Director read-only. */
const UPLOAD: Record<Role, readonly UploadDomain[]> = {
  'Reliability Engineer': ['Equipment Performance', 'Incident', 'RCA / CAPA', 'Downtime', 'Other'],
  'Operations Manager': ['Production', 'Downtime', 'Other'],
  'Maintenance Planner': ['Downtime', 'RCA / CAPA', 'Other'],
  'Finance Manager': [],
  'HSE Manager': [],
  'Plant Director': [],
}

const UPLOAD_LOCKED: Partial<Record<Role, string>> = {
  'Finance Manager': 'No approved finance data schema yet',
  'HSE Manager': 'No approved HSE data schema yet',
  'Plant Director': 'View only for Plant Director',
}

interface RoleValue {
  role: Role
  setRole: (r: Role) => void
  can: (p: Permission) => boolean
  /** Tooltip untuk kontrol yang dinonaktifkan. */
  viewOnly: string
  uploadDomains: readonly UploadDomain[]
  /** Alasan tombol upload nonaktif untuk role ini (kalau ada). */
  uploadLocked?: string
}

const Ctx = createContext<RoleValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [stored, setRole] = usePersistentState<Role>('caliber.role', ROLES[0])
  const role = (ROLES as readonly string[]).includes(stored) ? stored : ROLES[0]
  const value = useMemo(
    () => ({
      role,
      setRole,
      can: (p: Permission) => MATRIX[p].includes(role),
      viewOnly: `View only for ${role}`,
      uploadDomains: UPLOAD[role],
      uploadLocked: UPLOAD_LOCKED[role],
    }),
    [role, setRole],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRole() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRole must be used inside RoleProvider')
  return v
}
