export type Severity = 'critical' | 'high' | 'medium'
export type TimeRange = '7d' | '30d' | '90d'

export type ProblemStatus =
  | 'Investigating'
  | 'Diagnosis Pending'
  | 'Action in Progress'
  | 'Validated'

export type SignalTone = 'critical' | 'high' | 'medium' | 'neutral'
export type SignalIcon = 'alert' | 'drop' | 'trend' | 'gauge' | 'temp' | 'check' | 'down' | 'wave' | 'diff'

export interface Signal {
  label: string
  tone: SignalTone
  icon?: SignalIcon
}

/** Skor kriteria 0–1 untuk perhitungan AHP */
export interface CriteriaScores {
  safety: number
  prodLoss: number
  financial: number
  critEquip: number
  degradation: number
  recurrence: number
}

export interface Problem {
  id: string
  equipment: string
  severity: Severity
  criteria: CriteriaScores
  area: string
  title: string
  signals: Signal[]
  status: ProblemStatus
  lead: string
  unitId: string
  detectedAt: string
}

export type ActionStatus = 'At Risk' | 'Scheduled' | 'In Progress' | 'On Track'

export interface UrgentAction {
  problemId: string
  due: string
  overdue?: boolean
  task: string
  owner: string
  status: ActionStatus
}

export interface UnitImpact {
  id: string
  code: string
  name: string
  downtimeH: number
  lossT: number
}

export interface Kpi {
  availability: { value: number; delta: number }
  downtime: { value: number; delta: number }
  productionLoss: { value: number; delta: number }
  financialExposure: { value: number }
  rawAlerts: number
}

export interface LifecycleStage {
  key: string
  label: string
  count: number
  state: 'done' | 'active' | 'pending' | 'closed'
}
