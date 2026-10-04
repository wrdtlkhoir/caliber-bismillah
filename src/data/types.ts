import type { Phase } from '@/lib/analytics'

export type Severity = 'critical' | 'high' | 'medium'
/** Jendela agregasi KPI & chart: `days` hari yang berakhir di tanggal "as of". */
export interface Period {
  key: string
  days: number
  /** mis. "Last 90 days" atau "01 Feb 2026 – 22 Apr 2026" */
  label: string
  /** label pendek untuk delta KPI, mis. "90d" */
  short: string
}

export type ProblemStatus = 'Early Warning' | 'Investigating' | 'RCA in Progress' | 'CA/PA Execution' | 'Monitoring'

export type SignalTone = 'critical' | 'high' | 'medium' | 'neutral'
export type SignalIcon = 'alert' | 'drop' | 'trend' | 'gauge' | 'temp' | 'check' | 'down' | 'wave' | 'diff'

export interface Signal {
  label: string
  tone: SignalTone
  icon?: SignalIcon
}

/** Skor kriteria 0–1 untuk perhitungan AHP prioritas problem */
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
  phase: Phase
  criteria: CriteriaScores
  area: string
  title: string
  signals: Signal[]
  status: ProblemStatus
  lead: string
  /** kode plant (ZCU, ARP, ...) */
  unitId: string
  detectedAt: string
}

export type ActionStatus = 'At Risk' | 'Scheduled' | 'In Progress' | 'On Track'

export interface UrgentAction {
  problemId: string
  planDate: string
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
  lossK: number
  incidents: number
}

export interface Kpi {
  availability: { value: number }
  downtime: { value: number; delta: number }
  productionLoss: { value: number; delta: number }
  financialExposure: { valueM: number }
  incidents: number
  rawAlerts: number
}

export interface LifecycleStage {
  key: string
  label: string
  count: number
  state: 'done' | 'active' | 'pending' | 'closed'
}
