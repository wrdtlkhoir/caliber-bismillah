/**
 * Mock data Root Cause & Decision (Page 3).
 * Di produksi: hipotesis dari inference engine, evidence dari historian/LIMS/RCA repository.
 */
import type { RcScores } from '@/lib/ahpPairwise'

export type EvidenceStatus = 'support' | 'missing' | 'contradict'

export interface Evidence {
  text: string
  source: string
  status: EvidenceStatus
}

export interface Hypothesis {
  id: string
  title: string
  summary: string
  confidence: number
  scores: RcScores
  evidence: Evidence[]
  /** key parameter dari data investigasi yang dikorelasikan (ditampilkan beserta nilainya) */
  correlatedParams?: string[]
  causalLoopValidated?: boolean
}

export type AuditActor = 'Automated' | 'Lead Engineer' | 'Online Sync' | 'Engineer Decision'

export interface AuditEntry {
  time: string
  actor: AuditActor
  text: string
}

export interface PathNode {
  kind: string
  title: string
  sub: string
  tone: 'default' | 'critical' | 'verified' | 'action'
  badge?: string
}

export interface RootCauseCase {
  problemId: string
  eventNo: string
  hypotheses: Hypothesis[]
  prior?: {
    title: string
    text: string
    twin: { id: string; when: string; rows: { signal: string; current: string; twin: string }[]; outcome: string }
  }
  path: PathNode[]
  audit: AuditEntry[]
  placeholder: string
}

export const rootCauses: Record<string, RootCauseCase> = {
  'KO-3201': {
    problemId: 'KO-3201',
    eventNo: '#8812',
    placeholder: 'e.g., Lube-oil cooler tube leak suspected after cooling water delta-P rise. Recommend immediate offline bundle flush...',
    hypotheses: [
      {
        id: 'H1',
        title: 'Lube oil contamination (water ingress)',
        summary: 'Free water ingress into lube-oil console causing hydrodynamic film collapse and subsequent drive-end bearing surface distress.',
        confidence: 94,
        scores: { evidence: 0.92, historical: 0.94, temporal: 0.85, engineering: 0.88, dataConf: 0.91, controllability: 0.75 },
        evidence: [
          { text: 'Water content 620 ppm › spec 200', source: 'Equip Performance · 02 Oct 07:50', status: 'support' },
          { text: 'Vibration rise preceded temp rise by 6 h', source: 'Production Data / Telemetry', status: 'support' },
          { text: 'Matches RCA-2026-ZCU-0142 (94% match)', source: 'Incident DB & RCA Archive', status: 'support' },
          { text: 'Mechanism consistent with distress rules', source: 'Turbomachinery Eng Rule v2', status: 'support' },
        ],
        correlatedParams: ['water', 'vib', 'temp'],
        causalLoopValidated: true,
      },
      {
        id: 'H2',
        title: 'Bearing mechanical degradation (fatigue / unbalance)',
        summary: 'Progressive fatigue of the drive-end tilting-pad bearing or rotor unbalance producing 1X-dominant vibration.',
        confidence: 58,
        scores: { evidence: 0.55, historical: 0.48, temporal: 0.6, engineering: 0.62, dataConf: 0.55, controllability: 0.35 },
        evidence: [
          { text: 'Radial vibration 8.5 mm/s with 1X dominant', source: 'Telemetry', status: 'support' },
          { text: 'Drive-end bearing temp elevated to 92 °C', source: 'Telemetry', status: 'support' },
          { text: 'No particle count data available (pending ISO 4406)', source: 'Lab LIMS', status: 'missing' },
        ],
      },
      {
        id: 'H3',
        title: 'Process surge / aerodynamic instability',
        summary: 'Compressor operating near surge line causing sub-synchronous excitation and bearing overload.',
        confidence: 27,
        scores: { evidence: 0.25, historical: 0.2, temporal: 0.3, engineering: 0.4, dataConf: 0.4, controllability: 0.3 },
        evidence: [
          { text: 'No flow or suction/discharge pressure surge pattern detected in DCS', source: 'DCS Yokogawa', status: 'contradict' },
          { text: 'Insufficient historical evidence for surge at current 92% steady load', source: 'Historical RCA', status: 'missing' },
        ],
      },
    ],
    prior: {
      title: 'Bayesian Prior Continuity Check',
      text: 'Similar moisture ingress event confirmed on sister unit KO-3101 in March 2025 caused identical 1X/2X harmonics.',
      twin: {
        id: 'KO-3101',
        when: 'Mar 2025',
        rows: [
          { signal: 'Water in oil', current: '620 ppm', twin: '540 ppm' },
          { signal: 'Radial vibration DE', current: '8.5 mm/s', twin: '7.9 mm/s' },
          { signal: 'FFT signature', current: '1X + 2X present', twin: '1X + 2X present' },
          { signal: 'Bearing temp DE', current: '92 °C', twin: '89 °C' },
          { signal: 'Lube oil supply pressure', current: '1.8 bar', twin: '1.9 bar' },
        ],
        outcome: 'Root cause confirmed: lube oil cooler E-3104 tube leak. Bundle replaced, unit back online in 26 h.',
      },
    },
    path: [
      { kind: 'Target node', title: 'KO-3201', sub: 'Centrifugal compressor', tone: 'default' },
      { kind: 'Component', title: 'Drive-End Bearing', sub: 'Tilting pad journal', tone: 'default' },
      { kind: 'Observed mode', title: 'Bearing Distress', sub: 'Boundary lubrication / wipe', tone: 'default' },
      { kind: 'Active signatures', title: 'Vib ↑ 8.5 mm/s', sub: 'Water Ingress 620 ppm', tone: 'critical' },
      { kind: 'Verified prior', title: 'AR-2026-ZCU-0142', sub: 'Unit 32 Historical log', tone: 'verified', badge: '94%' },
      { kind: 'Corrective action', title: 'Cooler E-3204 bundle', sub: 'Leak test & replace', tone: 'action' },
      { kind: 'Preventive rule', title: 'Online moisture TX', sub: 'Alarm at 300 ppm', tone: 'action' },
    ],
    audit: [
      { time: '09:02', actor: 'Automated', text: 'AI generated 3 root cause hypotheses from 38 sensor streams and alarm cascades.' },
      { time: '09:20', actor: 'Lead Engineer', text: 'R. Gunawan requested field lube-oil moisture re-sampling (Labware LIMS #L-8912).' },
      { time: '11:45', actor: 'Online Sync', text: 'Karl Fischer titration confirmed 620 ppm water in oil. Confidence auto-updated to 94%.' },
    ],
  },

  'BL-5702': {
    problemId: 'BL-5702',
    eventNo: '#8790',
    placeholder: 'e.g., Soft foot found on motor base; recommend laser alignment during next shift window...',
    hypotheses: [
      {
        id: 'H1', title: 'Shaft misalignment (angular)', confidence: 88,
        summary: 'Angular offset between motor and blower shafts loading the flexible coupling and producing a dominant 2X component.',
        scores: { evidence: 0.9, historical: 0.86, temporal: 0.8, engineering: 0.9, dataConf: 0.82, controllability: 0.85 },
        evidence: [
          { text: '2X component 7.8 mm/s dominant over 1X', source: 'Emerson CSI 6500', status: 'support' },
          { text: 'Coupling guard temperature +11 °C', source: 'Telemetry', status: 'support' },
          { text: 'Matches AR-2022-PP2-0310 (91% match)', source: 'Incident DB & RCA Archive', status: 'support' },
          { text: 'Axial vibration elevated (typical for angular)', source: 'Rotating Eq Rule v3', status: 'support' },
        ],
        correlatedParams: ['vib2x', 'coupling', 'axial'],
        causalLoopValidated: true,
      },
      {
        id: 'H2', title: 'Coupling element wear', confidence: 52,
        summary: 'Worn elastomer elements in the coupling producing 2X excitation independent of alignment.',
        scores: { evidence: 0.5, historical: 0.4, temporal: 0.55, engineering: 0.6, dataConf: 0.5, controllability: 0.7 },
        evidence: [
          { text: 'Coupling temperature rising in step', source: 'Telemetry', status: 'support' },
          { text: 'No visual inspection since last turnaround', source: 'SAP PM', status: 'missing' },
        ],
      },
      {
        id: 'H3', title: 'Motor soft foot / base looseness', confidence: 31,
        summary: 'Uneven motor support causing frame distortion and variable alignment.',
        scores: { evidence: 0.3, historical: 0.35, temporal: 0.25, engineering: 0.4, dataConf: 0.3, controllability: 0.6 },
        evidence: [{ text: 'Motor current steady (48 A); no load modulation', source: 'DCS', status: 'contradict' }],
      },
    ],
    path: [
      { kind: 'Target node', title: 'BL-5702', sub: 'Extruder main blower', tone: 'default' },
      { kind: 'Component', title: 'Flexible Coupling', sub: 'Elastomer type', tone: 'default' },
      { kind: 'Observed mode', title: 'Misalignment', sub: 'Angular offset', tone: 'default' },
      { kind: 'Active signatures', title: 'Vib 2X ↑ 7.8 mm/s', sub: 'Coupling 78 °C', tone: 'critical' },
      { kind: 'Verified prior', title: 'AR-2022-PP2-0310', sub: 'PP Plant log', tone: 'verified', badge: '91%' },
    ],
    audit: [
      { time: '14:52', actor: 'Automated', text: 'AI generated 3 root cause hypotheses from 24 sensor streams.' },
      { time: '15:30', actor: 'Lead Engineer', text: 'T. Wardhana scheduled laser alignment check (WO-55120).' },
    ],
  },

  'PU-2101B': {
    problemId: 'PU-2101B',
    eventNo: '#8801',
    placeholder: 'e.g., Strainer dP 0.42 bar confirms blockage; recommend switch to PU-2101A and clean strainer...',
    hypotheses: [
      {
        id: 'H1', title: 'Suction strainer blockage', confidence: 90,
        summary: 'Fouled suction strainer reducing available NPSH, causing cavitation at the impeller eye.',
        scores: { evidence: 0.9, historical: 0.92, temporal: 0.88, engineering: 0.85, dataConf: 0.88, controllability: 0.9 },
        evidence: [
          { text: 'Strainer dP 0.42 bar (2× clean)', source: 'DCS Yokogawa', status: 'support' },
          { text: 'Suction pressure 1.1 bar below alarm 1.5', source: 'Telemetry', status: 'support' },
          { text: 'Matches AR-2023-TF-0088 (92% match)', source: 'Incident DB & RCA Archive', status: 'support' },
          { text: 'Broadband 5–20 kHz acoustic = cavitation', source: 'Pump Eng Rule v1', status: 'support' },
        ],
        correlatedParams: ['suction', 'acoustic', 'npsh'],
        causalLoopValidated: true,
      },
      {
        id: 'H2', title: 'Low tank level / vortexing', confidence: 40,
        summary: 'Insufficient submergence at the tank outlet entraining vapour into suction line.',
        scores: { evidence: 0.35, historical: 0.4, temporal: 0.45, engineering: 0.5, dataConf: 0.6, controllability: 0.7 },
        evidence: [{ text: 'Tank level 38% — above minimum submergence', source: 'DCS', status: 'contradict' }],
      },
      {
        id: 'H3', title: 'Impeller damage', confidence: 25,
        summary: 'Existing erosion on impeller vanes reducing hydraulic performance.',
        scores: { evidence: 0.25, historical: 0.3, temporal: 0.2, engineering: 0.4, dataConf: 0.3, controllability: 0.4 },
        evidence: [{ text: 'No internal inspection data', source: 'SAP PM', status: 'missing' }],
      },
    ],
    path: [
      { kind: 'Target node', title: 'PU-2101B', sub: 'Centrifugal pump', tone: 'default' },
      { kind: 'Component', title: 'Suction Strainer', sub: 'Basket type', tone: 'default' },
      { kind: 'Observed mode', title: 'Cavitation', sub: 'NPSH deficit', tone: 'default' },
      { kind: 'Active signatures', title: 'Suction P ↓ 1.1 bar', sub: 'Acoustic +14 dB', tone: 'critical' },
      { kind: 'Verified prior', title: 'AR-2023-TF-0088', sub: 'Tank Farm log', tone: 'verified', badge: '92%' },
    ],
    audit: [
      { time: '09:05', actor: 'Automated', text: 'AI generated 3 root cause hypotheses from 19 sensor streams.' },
      { time: '09:40', actor: 'Lead Engineer', text: 'M. Faisal accepted H1 and switched duty to PU-2101A.' },
    ],
  },

  'HE-3301': {
    problemId: 'HE-3301',
    eventNo: '#8764',
    placeholder: 'e.g., Diene content increase since feed switch; recommend anti-foulant dosing ratio adjustment...',
    hypotheses: [
      {
        id: 'H1', title: 'Polymer fouling (anti-foulant under-dosing)', confidence: 81,
        summary: 'Diene polymerisation on tube walls due to dosing not following feed composition change.',
        scores: { evidence: 0.82, historical: 0.88, temporal: 0.7, engineering: 0.85, dataConf: 0.75, controllability: 0.9 },
        evidence: [
          { text: 'dP 1.85 bar vs 0.9 clean (+106%)', source: 'DCS Yokogawa', status: 'support' },
          { text: 'Heat transfer coefficient -18%', source: 'Aspen Exchanger Monitor', status: 'support' },
          { text: 'Matches AR-2025-PG-0204 (90% match)', source: 'Incident DB & RCA Archive', status: 'support' },
        ],
        correlatedParams: ['dp', 'ucoef'],
        causalLoopValidated: true,
      },
      {
        id: 'H2', title: 'Coke / particulate deposition', confidence: 45,
        summary: 'Carry-over of coke fines from upstream reactor depositing in tubes.',
        scores: { evidence: 0.4, historical: 0.35, temporal: 0.5, engineering: 0.55, dataConf: 0.5, controllability: 0.5 },
        evidence: [{ text: 'No filter dP increase upstream', source: 'DCS', status: 'contradict' }],
      },
      {
        id: 'H3', title: 'Flow maldistribution', confidence: 22,
        summary: 'Partial pass-partition leak reducing effective tube passes.',
        scores: { evidence: 0.2, historical: 0.15, temporal: 0.3, engineering: 0.4, dataConf: 0.3, controllability: 0.3 },
        evidence: [{ text: 'No inspection data since 2025 cleaning', source: 'SAP PM', status: 'missing' }],
      },
    ],
    path: [
      { kind: 'Target node', title: 'HE-3301', sub: 'Shell & tube exchanger', tone: 'default' },
      { kind: 'Component', title: 'Tube Bundle', sub: 'Tube side', tone: 'default' },
      { kind: 'Observed mode', title: 'Fouling', sub: 'Polymer deposition', tone: 'default' },
      { kind: 'Active signatures', title: 'dP ↑ 1.85 bar', sub: 'U-coeff -18%', tone: 'critical' },
      { kind: 'Verified prior', title: 'AR-2025-PG-0204', sub: 'PyGas log', tone: 'verified', badge: '90%' },
    ],
    audit: [{ time: '11:20', actor: 'Automated', text: 'AI generated 3 root cause hypotheses from 16 sensor streams.' }],
  },

  'PM-4405B': {
    problemId: 'PM-4405B',
    eventNo: '#8702',
    placeholder: 'e.g., Re-greasing interval exceeded; recommend grease sample and auto-lubricator...',
    hypotheses: [
      {
        id: 'H1', title: 'Grease degradation (interval exceeded)', confidence: 76,
        summary: 'Re-greasing overdue causing lubricant breakdown in the drive-end bearing.',
        scores: { evidence: 0.75, historical: 0.8, temporal: 0.7, engineering: 0.82, dataConf: 0.6, controllability: 0.9 },
        evidence: [
          { text: 'Last re-greasing 142 days ago (interval 90)', source: 'SAP PM', status: 'support' },
          { text: 'Grease degradation index 0.64', source: 'Ultrasound CMS', status: 'support' },
          { text: 'No grease sample in last 90 days', source: 'Lab LIMS', status: 'missing' },
        ],
        correlatedParams: ['bde', 'gdi'],
      },
      {
        id: 'H2', title: 'Bearing over-greasing / churning', confidence: 35,
        summary: 'Excess grease causing churning heat in the bearing housing.',
        scores: { evidence: 0.3, historical: 0.35, temporal: 0.4, engineering: 0.45, dataConf: 0.4, controllability: 0.8 },
        evidence: [{ text: 'Temperature drift is gradual, not post-greasing spike', source: 'Telemetry', status: 'contradict' }],
      },
      {
        id: 'H3', title: 'Electrical fluting (shaft current)', confidence: 20,
        summary: 'Shaft voltage discharge damaging raceways.',
        scores: { evidence: 0.15, historical: 0.2, temporal: 0.2, engineering: 0.35, dataConf: 0.3, controllability: 0.4 },
        evidence: [{ text: 'Motor vibration normal; no BPFO pattern', source: 'Emerson CSI', status: 'contradict' }],
      },
    ],
    path: [
      { kind: 'Target node', title: 'PM-4405B', sub: 'Induction motor', tone: 'default' },
      { kind: 'Component', title: 'DE Bearing', sub: 'Deep-groove ball', tone: 'default' },
      { kind: 'Observed mode', title: 'Lubricant Breakdown', sub: 'Grease degradation', tone: 'default' },
      { kind: 'Active signatures', title: 'Temp ↑ 82 °C', sub: 'GDI 0.64', tone: 'critical' },
      { kind: 'Verified prior', title: 'AR-2021-UT-0033', sub: 'Utilities log', tone: 'verified', badge: '83%' },
    ],
    audit: [{ time: '08:00', actor: 'Automated', text: 'AI generated 3 root cause hypotheses from 14 sensor streams.' }],
  },
}
