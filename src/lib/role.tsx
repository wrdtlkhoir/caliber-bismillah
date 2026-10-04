import { createContext, useContext, useMemo, type ReactNode } from 'react'
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
  editPairwise: ['Reliability Engineer'],
  editConstraints: ['Reliability Engineer', 'Operations Manager'],
  editCapa: ['Reliability Engineer', 'Maintenance Planner'],
  requestField: ['Reliability Engineer', 'Maintenance Planner'],
  export: ALL,
  askCaliber: ALL,
}

interface RoleValue {
  role: Role
  setRole: (r: Role) => void
  can: (p: Permission) => boolean
  /** Tooltip untuk kontrol yang dinonaktifkan. */
  viewOnly: string
}

const Ctx = createContext<RoleValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [stored, setRole] = usePersistentState<Role>('caliber.role', ROLES[0])
  const role = (ROLES as readonly string[]).includes(stored) ? stored : ROLES[0]
  const value = useMemo(
    () => ({ role, setRole, can: (p: Permission) => MATRIX[p].includes(role), viewOnly: `View only for ${role}` }),
    [role, setRole],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRole() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRole must be used inside RoleProvider')
  return v
}
