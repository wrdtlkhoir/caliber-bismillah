/**
 * Mock data Plant Intelligence. Di produksi, data ini datang dari
 * historian (PI/OSIsoft), CMMS (SAP PM) dan sistem condition monitoring.
 */
import type { Kpi, LifecycleStage, Problem, TimeRange, UnitImpact, UrgentAction } from './types'

export const PLANT_SCOPE = 'Olefins & Polyolefins Units'

export const problems: Problem[] = [
  {
    id: 'KO-3201',
    equipment: 'C3 Feed Splitter Reboiler',
    severity: 'critical',
    criteria: { safety: 0.95, prodLoss: 0.91, financial: 0.85, critEquip: 0.9, degradation: 0.78, recurrence: 0.6 },
    area: 'Olefin Cracker #1 · C3 Splitter Section',
    title: 'High radial vibration with rising lube-oil water content',
    signals: [
      { label: 'Radial Vib: 11.4 mm/s (Alarm: 9.0)', tone: 'critical', icon: 'alert' },
      { label: 'Water in Oil: 480 ppm (Limit: 200)', tone: 'critical', icon: 'drop' },
      { label: '1X phase shift 42°', tone: 'neutral', icon: 'trend' },
    ],
    status: 'Investigating',
    lead: 'R. Gunawan',
    unitId: 'U01',
    detectedAt: '2026-10-01T06:12:00+07:00',
  },
  {
    id: 'BL-5702',
    equipment: 'Extruder Main Blower',
    severity: 'high',
    criteria: { safety: 0.62, prodLoss: 0.85, financial: 0.76, critEquip: 0.82, degradation: 0.7, recurrence: 0.66 },
    area: 'Polypropylene Plant · Extrusion Train',
    title: 'High vibration with dominant 2X harmonic (misalignment signature)',
    signals: [
      { label: 'Vib 2X: 7.8 mm/s', tone: 'high', icon: 'gauge' },
      { label: 'Coupling Temp: 78°C', tone: 'medium', icon: 'temp' },
      { label: 'Motor Current: steady (48A)', tone: 'neutral', icon: 'check' },
    ],
    status: 'Diagnosis Pending',
    lead: 'T. Wardhana',
    unitId: 'U03',
    detectedAt: '2026-09-29T14:40:00+07:00',
  },
  {
    id: 'PU-2101B',
    equipment: 'Ethylene Transfer Pump B',
    severity: 'high',
    criteria: { safety: 0.72, prodLoss: 0.7, financial: 0.66, critEquip: 0.7, degradation: 0.68, recurrence: 0.55 },
    area: 'Ethylene Tank Farm · Transfer Unit',
    title: 'Suction pressure drop accompanied by cavitation acoustic spikes',
    signals: [
      { label: 'Suction P: 1.1 bar (Norm: 2.4)', tone: 'high', icon: 'down' },
      { label: 'High-freq Acoustic: +14 dB', tone: 'high', icon: 'wave' },
      { label: 'Flow: -8%', tone: 'neutral' },
    ],
    status: 'Action in Progress',
    lead: 'M. Faisal',
    unitId: 'U06',
    detectedAt: '2026-09-30T09:05:00+07:00',
  },
  {
    id: 'HE-3301',
    equipment: 'Pygas Feed/Effluent Exchanger',
    severity: 'medium',
    criteria: { safety: 0.35, prodLoss: 0.62, financial: 0.6, critEquip: 0.5, degradation: 0.7, recurrence: 0.45 },
    area: 'Pyrolysis Gasoline Unit · Exchanger Train',
    title: 'Tube-side differential pressure rising / heat duty declining',
    signals: [
      { label: 'dP: 1.85 bar (Clean: 0.9)', tone: 'medium', icon: 'diff' },
      { label: 'Heat Coeff: -18%', tone: 'medium' },
      { label: 'Skin Temp: Normal', tone: 'neutral' },
    ],
    status: 'Validated',
    lead: 'D. Pratama',
    unitId: 'U05',
    detectedAt: '2026-09-24T11:20:00+07:00',
  },
  {
    id: 'PM-4405B',
    equipment: 'Boiler Feed Pump Motor B',
    severity: 'medium',
    criteria: { safety: 0.4, prodLoss: 0.4, financial: 0.42, critEquip: 0.55, degradation: 0.6, recurrence: 0.3 },
    area: 'Utilities & Power · Boiler Feed Pump',
    title: 'Drive-end bearing temperature gradual upward drift (+12°C/3w)',
    signals: [
      { label: 'Bearing DE: 82°C (Alarm: 85)', tone: 'medium', icon: 'temp' },
      { label: 'Grease Degr Index: Elev.', tone: 'neutral' },
    ],
    status: 'Investigating',
    lead: 'H. Santoso',
    unitId: 'U01',
    detectedAt: '2026-09-12T08:00:00+07:00',
  },
]

export const urgentActions: UrgentAction[] = [
  {
    problemId: 'KO-3201',
    due: 'Today (Overdue)',
    overdue: true,
    task: 'Perform oil moisture re-sample & run online vibration spectrum check',
    owner: 'M. Irfan',
    status: 'At Risk',
  },
  {
    problemId: 'BL-5702',
    due: 'Tomorrow',
    task: 'Laser alignment check during planned turnaround shift window',
    owner: 'B. Hendro',
    status: 'Scheduled',
  },
  {
    problemId: 'PU-2101B',
    due: 'Today',
    task: 'Switch duty to Standby Pump PU-2101A and inspect suction strainer',
    owner: 'S. Widodo',
    status: 'In Progress',
  },
  {
    problemId: 'HE-3301',
    due: 'In 2d',
    task: 'Anti-fouling chemical dosing adjustment & skin temperature verification',
    owner: 'Process Eng (Lead)',
    status: 'On Track',
  },
]

export const lifecycle: LifecycleStage[] = [
  { key: 'detected', label: 'Detected', count: 2, state: 'done' },
  { key: 'investigating', label: 'Investigating', count: 3, state: 'active' },
  { key: 'diagnosis', label: 'Diagnosis', count: 1, state: 'pending' },
  { key: 'validated', label: 'Validated', count: 1, state: 'pending' },
  { key: 'action', label: 'Action', count: 4, state: 'pending' },
  { key: 'verification', label: 'Verification', count: 2, state: 'pending' },
  { key: 'closed', label: 'Closed', count: 14, state: 'closed' },
]

const units30d: UnitImpact[] = [
  { id: 'U01', code: 'UNIT 01', name: 'Cracker Unit 1', downtimeH: 19, lossT: 1120 },
  { id: 'U02', code: 'UNIT 02', name: 'Cracker Unit 2', downtimeH: 4, lossT: 210 },
  { id: 'U03', code: 'UNIT 03', name: 'Polypropylene', downtimeH: 11, lossT: 490 },
  { id: 'U04', code: 'UNIT 04', name: 'Polyethylene', downtimeH: 2, lossT: 140 },
  { id: 'U05', code: 'UNIT 05', name: 'Aromatics/PyGas', downtimeH: 3, lossT: 230 },
  { id: 'U06', code: 'UNIT 06', name: 'Offsite & Utilities', downtimeH: 2, lossT: 120 },
]

const rangeFactor: Record<TimeRange, number> = { '7d': 0.27, '30d': 1, '90d': 2.8 }

export function unitImpact(range: TimeRange): UnitImpact[] {
  const f = rangeFactor[range]
  return units30d.map((u) => ({
    ...u,
    downtimeH: Math.max(1, Math.round(u.downtimeH * f)),
    lossT: Math.round((u.lossT * f) / 10) * 10,
  }))
}

/** Batas downtime / loss per unit per 30 hari (dipakai sebagai garis threshold). */
export function thresholds(range: TimeRange) {
  const f = rangeFactor[range]
  return { downtimeH: 10 * f, lossT: 600 * f }
}

export const kpiByRange: Record<TimeRange, Kpi> = {
  '7d': {
    availability: { value: 95.8, delta: -0.4 },
    downtime: { value: 11, delta: 3 },
    productionLoss: { value: 640, delta: 95 },
    financialExposure: { value: 0.6 },
    rawAlerts: 21,
  },
  '30d': {
    availability: { value: 96.4, delta: 0.2 },
    downtime: { value: 41, delta: -4 },
    productionLoss: { value: 2310, delta: 180 },
    financialExposure: { value: 2.1 },
    rawAlerts: 57,
  },
  '90d': {
    availability: { value: 96.1, delta: -0.1 },
    downtime: { value: 118, delta: -12 },
    productionLoss: { value: 6480, delta: 410 },
    financialExposure: { value: 5.9 },
    rawAlerts: 163,
  },
}

export const currentUser = { name: 'Dr. Aris S.', role: 'Lead Reliability', notifications: 2 }
