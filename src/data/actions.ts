/**
 * Mock data Action & Reliability Loop (Page 4).
 * Di produksi: work order dari SAP PM, CAPA register, dan telemetry pasca-perbaikan.
 */
import type { TrendSpec } from '@/lib/series'

export type ActionType = 'Corrective' | 'Preventive' | 'Proactive'
export type ActionPriority = 'Critical' | 'High' | 'Medium'
export type ActionStatus = 'Done' | 'In progress' | 'Not started'

export interface CapaAction {
  id: string
  title: string
  ref: string
  team: string
  type: ActionType
  owner: string
  due: string
  priority: ActionPriority
  status: ActionStatus
  criteria: string
}

export interface FleetItem {
  id: string
  name: string
  level: 'ELEVATED' | 'MODERATE' | 'MONITORING'
  note: string
}

export interface ActionCase {
  problemId: string
  contextCycle: string
  criticality: string
  conditionText: string
  validation: { id: string; rootCause: string; by: string; at: string }
  kpis: {
    effectiveness: { value: number; delta: string; benchmark: string }
    closure: { value: number; delta: string; benchmark: string }
    repeat: { value: number; badge: string; benchmark: string }
    awaiting: { value: number; note: string }
  }
  actions: CapaAction[]
  verification: {
    title: string
    tag: string
    unit: string
    digits: number
    trip?: number
    alarm: number
    alarmDir: 'high' | 'low'
    normal: [number, number]
    startLabel: string
    eventLabel?: string
    before: TrendSpec
    after?: TrendSpec
    checks: { state: 'done' | 'pending'; title: string; text: string; mono?: boolean }[]
  }
  /** index action (0-based) yang menjadi penyebab sistemik masih terbuka */
  systemicActionIndex?: number
  systemicText?: string
  fleet: { intro: string; items: FleetItem[] }
}

export const actionCases: Record<string, ActionCase> = {
  'KO-3201': {
    problemId: 'KO-3201',
    contextCycle: 'INC-2026-3201-B',
    criticality: 'Class A criticality',
    conditionText: 'Restored / Stable (Load 94%)',
    validation: {
      id: 'VAL-KO3201-0812',
      rootCause: 'Lube oil water ingress via cooler leak (E-3204 tube sheet)',
      by: 'R. Gunawan (Lead Reliability)',
      at: '02 Oct 13:10 WIB',
    },
    kpis: {
      effectiveness: { value: 82, delta: '+4.2%', benchmark: 'vs 80%' },
      closure: { value: 6.2, delta: '-1.8d', benchmark: 'Median fleet benchmark: 8.0d' },
      repeat: { value: 4, badge: 'Top Decile', benchmark: 'Industry Benchmark: 7%' },
      awaiting: { value: 5, note: '2 for Unit 32 this week' },
    },
    actions: [
      {
        id: 'A1', title: 'Isolate & repair lube-oil cooler E-3204 tube bundle', ref: 'WO-2026-9921', team: 'Maint Mech',
        type: 'Corrective', owner: 'M. Irfan', due: '2026-10-03', priority: 'Critical', status: 'Done',
        criteria: 'Water < 200 ppm after bundle leak test',
      },
      {
        id: 'A2', title: 'Replace lube oil charge & flush console piping system', ref: 'WO-2026-9924', team: 'Lube Ops',
        type: 'Corrective', owner: 'S. Widodo', due: '2026-10-03', priority: 'High', status: 'Done',
        criteria: 'Water < 200 ppm, ISO 4406 cleanliness 16/14/11',
      },
      {
        id: 'A3', title: 'Install online water-in-oil transmitter (AI-3204_H2O)', ref: 'CAPEX-32-118', team: 'Instrumentation',
        type: 'Preventive', owner: 'F. Ramadhan', due: '2026-10-20', priority: 'High', status: 'In progress',
        criteria: 'Live telemetry streaming to CALIBER platform',
      },
      {
        id: 'A4', title: 'Review cooler tube integrity across all Class-A turbomachinery', ref: 'FLEET-AUDIT-04', team: 'Reliability',
        type: 'Proactive', owner: 'R. Gunawan', due: '2026-10-31', priority: 'Medium', status: 'Not started',
        criteria: 'NDT / eddy current inspection reports submitted',
      },
    ],
    verification: {
      title: 'Radial Vibration (Drive End)',
      tag: 'VIB-3201-RDE (mm/s RMS)',
      unit: 'mm/s',
      digits: 1,
      trip: 11,
      alarm: 7,
      alarmDir: 'high',
      normal: [3, 5],
      startLabel: '01 Oct',
      eventLabel: '03 Oct Maint. Complete',
      before: { start: 5.2, end: 11.2, shape: 'sigmoid', knee: 0.55, noise: 0.02, seed: 81, points: 34 },
      after: { start: 4.2, end: 3.8, shape: 'sigmoid', knee: 0.2, noise: 0.04, seed: 82, points: 22 },
      checks: [
        { state: 'done', title: 'Action completed', text: 'Cooler bundle re-tubed & leak tested' },
        { state: 'done', title: 'Condition normalized', text: 'Vibration 3.8 mm/s, Water 140 ppm (Nominal)', mono: true },
        { state: 'pending', title: 'Recurrence after 30 days — Pending', text: 'Continuous telemetry monitoring active until 02 Nov 2026' },
      ],
    },
    systemicActionIndex: 2,
    systemicText:
      'Temporary repair resolved acute water contamination, but real-time water ingress telemetry (Action #3) is not yet commissioned. Risk of undetected recurrence during monsoon season.',
    fleet: {
      intro: '3 similar Class-A compressors in Olefins & Polyolefins share the identical shell-and-tube cooler design (E-3204 model series).',
      items: [
        { id: 'KO-3202', name: 'C2 Splitter Overhead Comp', level: 'ELEVATED', note: 'Cooler age 4.2 yr' },
        { id: 'KO-3401', name: 'Ethylene Refrigeration Comp', level: 'MODERATE', note: 'Cooler age 2.8 yr' },
        { id: 'KO-3501', name: 'Propylene Refrigeration Comp', level: 'MONITORING', note: 'Cooler age 1.5 yr' },
      ],
    },
  },

  'BL-5702': {
    problemId: 'BL-5702',
    contextCycle: 'INC-2026-5702-A',
    criticality: 'Class B criticality',
    conditionText: 'Running / Degraded (Load 96%)',
    validation: { id: 'VAL-BL5702-0930', rootCause: 'Angular shaft misalignment at motor–blower coupling', by: 'T. Wardhana (Reliability)', at: '30 Sep 16:05 WIB' },
    kpis: {
      effectiveness: { value: 82, delta: '+4.2%', benchmark: 'vs 80%' },
      closure: { value: 6.2, delta: '-1.8d', benchmark: 'Median fleet benchmark: 8.0d' },
      repeat: { value: 4, badge: 'Top Decile', benchmark: 'Industry Benchmark: 7%' },
      awaiting: { value: 5, note: '1 for PP Plant this week' },
    },
    actions: [
      { id: 'A1', title: 'Laser alignment check during turnaround shift window', ref: 'WO-2026-9930', team: 'Maint Mech', type: 'Corrective', owner: 'B. Hendro', due: '2026-10-04', priority: 'High', status: 'In progress', criteria: '2X vibration < 4.5 mm/s after alignment' },
      { id: 'A2', title: 'Inspect & replace coupling elastomer elements', ref: 'WO-2026-9931', team: 'Maint Mech', type: 'Corrective', owner: 'B. Hendro', due: '2026-10-04', priority: 'Medium', status: 'Not started', criteria: 'Coupling temp < 70 °C' },
      { id: 'A3', title: 'Add post-maintenance alignment check to PM routine', ref: 'PM-REV-5702', team: 'Reliability', type: 'Preventive', owner: 'T. Wardhana', due: '2026-10-15', priority: 'Medium', status: 'Not started', criteria: 'PM task list updated in SAP' },
    ],
    verification: {
      title: 'Vibration 2X (Motor DE)', tag: 'VI-5702A (mm/s RMS)', unit: 'mm/s', digits: 1, trip: 11, alarm: 7.1, alarmDir: 'high', normal: [1.5, 4.5],
      startLabel: '27 Sep',
      before: { start: 4.8, end: 7.8, shape: 'sigmoid', knee: 0.5, noise: 0.03, seed: 83, points: 40 },
      checks: [
        { state: 'pending', title: 'Action in progress', text: 'Laser alignment scheduled for tomorrow' },
        { state: 'pending', title: 'Condition not yet normalized', text: 'Vibration 2X 7.8 mm/s (above alarm)', mono: true },
      ],
    },
    systemicActionIndex: 2,
    systemicText: 'Alignment will fix the symptom, but the post-maintenance check that would have caught it is not yet in the PM routine.',
    fleet: { intro: '2 blowers in the PP extrusion train share the same coupling design.', items: [
      { id: 'BL-5701', name: 'Extruder Blower A', level: 'MODERATE', note: 'Last alignment 14 mo ago' },
      { id: 'BL-5801', name: 'Pelletizer Blower', level: 'MONITORING', note: 'Last alignment 5 mo ago' },
    ] },
  },

  'PU-2101B': {
    problemId: 'PU-2101B',
    contextCycle: 'INC-2026-2101-C',
    criticality: 'Class B criticality',
    conditionText: 'Standby / Duty on PU-2101A',
    validation: { id: 'VAL-PU2101-0930', rootCause: 'Suction strainer blockage (polymer fines)', by: 'M. Faisal (Reliability)', at: '30 Sep 09:40 WIB' },
    kpis: {
      effectiveness: { value: 82, delta: '+4.2%', benchmark: 'vs 80%' },
      closure: { value: 6.2, delta: '-1.8d', benchmark: 'Median fleet benchmark: 8.0d' },
      repeat: { value: 4, badge: 'Top Decile', benchmark: 'Industry Benchmark: 7%' },
      awaiting: { value: 5, note: '1 for Tank Farm this week' },
    },
    actions: [
      { id: 'A1', title: 'Switch duty to standby pump PU-2101A', ref: 'OP-2026-0412', team: 'Operations', type: 'Corrective', owner: 'S. Widodo', due: '2026-09-30', priority: 'Critical', status: 'Done', criteria: 'Suction pressure > 2.2 bar on duty pump' },
      { id: 'A2', title: 'Clean suction strainer of PU-2101B', ref: 'WO-2026-9905', team: 'Maint Mech', type: 'Corrective', owner: 'S. Widodo', due: '2026-10-03', priority: 'High', status: 'In progress', criteria: 'Strainer dP < 0.2 bar' },
      { id: 'A3', title: 'Add strainer dP alarm at 0.3 bar', ref: 'MOC-2026-077', team: 'Instrumentation', type: 'Preventive', owner: 'F. Ramadhan', due: '2026-10-12', priority: 'Medium', status: 'Not started', criteria: 'Alarm configured & tested in DCS' },
    ],
    verification: {
      title: 'Suction Pressure (duty pump)', tag: 'PI-2101 (bar)', unit: 'bar', digits: 1, alarm: 1.5, alarmDir: 'low', normal: [2.2, 2.6],
      startLabel: '29 Sep', eventLabel: '30 Sep Switch to A',
      before: { start: 2.4, end: 1.1, shape: 'sigmoid', knee: 0.55, noise: 0.03, seed: 84, points: 30 },
      after: { start: 2.2, end: 2.4, shape: 'sigmoid', knee: 0.2, noise: 0.02, seed: 85, points: 26 },
      checks: [
        { state: 'done', title: 'Duty switched', text: 'PU-2101A running normally' },
        { state: 'done', title: 'Condition normalized', text: 'Suction 2.4 bar, acoustic baseline', mono: true },
        { state: 'pending', title: 'PU-2101B return to service — Pending', text: 'After strainer cleaning' },
      ],
    },
    systemicActionIndex: 2,
    systemicText: 'Duty switch restored transfer, but without a strainer dP alarm the next blockage will again only be detected by cavitation.',
    fleet: { intro: '4 transfer pumps in the tank farm use the same basket strainer.', items: [
      { id: 'PU-2102A', name: 'Ethylene Transfer Pump 2A', level: 'ELEVATED', note: 'Strainer dP 0.31 bar' },
      { id: 'PU-2102B', name: 'Ethylene Transfer Pump 2B', level: 'MONITORING', note: 'Strainer dP 0.12 bar' },
    ] },
  },

  'HE-3301': {
    problemId: 'HE-3301',
    contextCycle: 'INC-2026-3301-A',
    criticality: 'Class B criticality',
    conditionText: 'Running / Fouling (Duty 82%)',
    validation: { id: 'VAL-HE3301-0925', rootCause: 'Tube-side polymer fouling from anti-foulant under-dosing', by: 'D. Pratama (Process)', at: '25 Sep 10:15 WIB' },
    kpis: {
      effectiveness: { value: 82, delta: '+4.2%', benchmark: 'vs 80%' },
      closure: { value: 6.2, delta: '-1.8d', benchmark: 'Median fleet benchmark: 8.0d' },
      repeat: { value: 4, badge: 'Top Decile', benchmark: 'Industry Benchmark: 7%' },
      awaiting: { value: 5, note: '1 for PyGas this week' },
    },
    actions: [
      { id: 'A1', title: 'Adjust anti-foulant dosing ratio to diene content', ref: 'MOC-2026-081', team: 'Process Eng', type: 'Corrective', owner: 'D. Pratama', due: '2026-10-05', priority: 'High', status: 'In progress', criteria: 'dP growth < 0.02 bar/day' },
      { id: 'A2', title: 'Schedule hydro-jet cleaning at next opportunity', ref: 'WO-2026-9950', team: 'Maint Static', type: 'Corrective', owner: 'H. Santoso', due: '2026-11-10', priority: 'Medium', status: 'Not started', criteria: 'dP back to 0.9 bar clean' },
    ],
    verification: {
      title: 'Tube-side dP', tag: 'PDI-3301 (bar)', unit: 'bar', digits: 2, alarm: 2.2, alarmDir: 'high', normal: [0.8, 1.0],
      startLabel: '12 Sep',
      before: { start: 0.9, end: 1.85, shape: 'linear', noise: 0.03, seed: 86, points: 42 },
      checks: [{ state: 'pending', title: 'Dosing adjustment in progress', text: 'Verification after 7 days of new ratio' }],
    },
    fleet: { intro: '1 sister exchanger shares the same service.', items: [{ id: 'HE-3302', name: 'PyGas Exchanger B', level: 'MODERATE', note: 'dP 1.2 bar' }] },
  },

  'PM-4405B': {
    problemId: 'PM-4405B',
    contextCycle: 'INC-2026-4405-A',
    criticality: 'Class B criticality',
    conditionText: 'Running / Watch (Load 100%)',
    validation: { id: 'VAL-PM4405-0915', rootCause: 'Grease degradation — re-greasing interval exceeded', by: 'H. Santoso (Reliability)', at: '15 Sep 14:00 WIB' },
    kpis: {
      effectiveness: { value: 82, delta: '+4.2%', benchmark: 'vs 80%' },
      closure: { value: 6.2, delta: '-1.8d', benchmark: 'Median fleet benchmark: 8.0d' },
      repeat: { value: 4, badge: 'Top Decile', benchmark: 'Industry Benchmark: 7%' },
      awaiting: { value: 5, note: '1 for Utilities this week' },
    },
    actions: [
      { id: 'A1', title: 'Take grease sample from DE bearing', ref: 'LAB-2026-4405', team: 'Lube Ops', type: 'Corrective', owner: 'S. Widodo', due: '2026-10-04', priority: 'High', status: 'Not started', criteria: 'Lab result uploaded to LIMS' },
      { id: 'A2', title: 'Re-grease DE bearing per OEM quantity', ref: 'WO-2026-9960', team: 'Lube Ops', type: 'Corrective', owner: 'S. Widodo', due: '2026-10-05', priority: 'High', status: 'Not started', criteria: 'Bearing temp < 75 °C within 48 h' },
      { id: 'A3', title: 'Install single-point auto-lubricator', ref: 'CAPEX-UT-031', team: 'Maint Elec', type: 'Preventive', owner: 'H. Santoso', due: '2026-10-25', priority: 'Medium', status: 'Not started', criteria: 'Auto-lubricator commissioned' },
    ],
    verification: {
      title: 'Bearing Temp (Drive End)', tag: 'TI-4405_DE (°C)', unit: '°C', digits: 0, trip: 95, alarm: 85, alarmDir: 'high', normal: [60, 75],
      startLabel: '12 Sep',
      before: { start: 70, end: 82, shape: 'linear', noise: 0.05, seed: 87, points: 42 },
      checks: [{ state: 'pending', title: 'Actions not started', text: 'Grease sample scheduled' }],
    },
    systemicActionIndex: 2,
    systemicText: 'Manual re-greasing depends on the PM schedule that already slipped once; the auto-lubricator removes that dependency.',
    fleet: { intro: '3 boiler feed pump motors share the same bearing arrangement.', items: [
      { id: 'PM-4405A', name: 'BFP Motor A', level: 'MODERATE', note: 'Last greased 120 d ago' },
      { id: 'PM-4406A', name: 'BFP Motor C', level: 'MONITORING', note: 'Last greased 40 d ago' },
    ] },
  },
}
