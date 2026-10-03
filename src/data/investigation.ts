/**
 * Mock data Problem Investigation (Page 2) per problem.
 * Sumber produksi: Emerson CSI (vibrasi), Yokogawa DCS (proses),
 * Labware LIMS (analisa oli) dan Incident/RCA repository.
 */
import { makeSeries, type TrendSpec } from '@/lib/series'
import type { SignalTone } from './types'

export type Tone = SignalTone

export interface TrendParam {
  key: string
  label: string
  unit: string
  /** Rentang waktu chart, dalam jam */
  windowH: number
  delta: { text: string; dir: 'up' | 'down'; tone: Tone }
  limits: { label: string; value: string }[]
  alarm: number
  alarmDir: 'high' | 'low'
  normal: [number, number]
  normalText: string
  tag: string
  status: { label: string; tone: Tone }
  color: 'critical' | 'high' | 'navy'
  digits: number
  trend: TrendSpec
}

export interface ExtraSignal {
  tag: string
  label: string
  value: string
  state: 'normal' | 'watch' | 'offline'
}

export interface ImpactStep {
  kind: 'sensor' | 'health' | 'hazard' | 'financial'
  title: string
  headline: string
  detail: string
  note?: string
}

export interface Incident {
  id: string
  equipment: string
  location: string
  mechanism: string
  similarity: number
  signals: { label: string; tone: Tone }[]
  rca: { cause: string; fix: string }
  tags: string[]
}

export interface Investigation {
  problemId: string
  headline: string
  assetType: string
  unitLabel: string
  location: string
  runningPct: number
  failureMode: string
  liveSensors: number
  banner: { lead: string; delta: string; rest: string }
  params: TrendParam[]
  extraSignals: ExtraSignal[]
  benchmark: {
    /** key parameter yang nilainya dipakai sebagai pin (ikut live) */
    paramKey: string
    title: string
    unit: string
    value: number
    scaleMax: number
    normal: [number, number]
    alarm: number
    failure: { label: string; value: number }
    rows: { label: string; value: string; tone?: Tone }[]
  }
  impact: ImpactStep[]
  confidence: { pct: number; segments: { label: string; ok: boolean }[]; note: string; offlineTag?: string }
  incidents: Incident[]
  incidentFilters: { key: string; label: string }[]
  sources: string[]
  fieldAction: string
}

/** Series dibangkitkan sekali di sini supaya komponen tinggal render. */
export function seriesOf(p: TrendParam) {
  return makeSeries(p.trend)
}

export const investigations: Record<string, Investigation> = {
  'KO-3201': {
    problemId: 'KO-3201',
    headline: 'High Radial Vibration',
    assetType: 'Centrifugal Compressor',
    unitLabel: 'Unit 32',
    location: 'Unit 32 — C3 Splitter Section',
    runningPct: 92,
    failureMode: 'Bearing distress',
    liveSensors: 38,
    banner: { lead: 'Radial vibration', delta: '+40%', rest: 'in 24 h · 3 correlated telemetry signals · Continuous rising trend 18 h' },
    params: [
      {
        key: 'vib', label: 'Radial vibration (Drive end)', unit: 'mm/s', windowH: 24, digits: 1,
        delta: { text: '+40% / 24h', dir: 'up', tone: 'critical' },
        limits: [{ label: 'Trip', value: '11.0' }, { label: 'Alarm', value: '7.0' }],
        alarm: 7, alarmDir: 'high', normal: [3, 5], normalText: 'Normal: 3.0–5.0 mm/s', tag: 'VI-3201A',
        status: { label: 'Breached alarm', tone: 'critical' }, color: 'critical',
        trend: { start: 6.0, end: 8.5, shape: 'sigmoid', knee: 0.62, noise: 0.03, seed: 11 },
      },
      {
        key: 'water', label: 'Lube oil water content', unit: 'ppm', windowH: 24, digits: 0,
        delta: { text: '+210 ppm', dir: 'up', tone: 'high' },
        limits: [{ label: 'Trip', value: '600' }, { label: 'Alarm', value: '400' }],
        alarm: 400, alarmDir: 'high', normal: [0, 200], normalText: 'Spec: ‹ 200 ppm', tag: 'AI-3204_H2O',
        status: { label: 'Ingress active', tone: 'high' }, color: 'high',
        trend: { start: 410, end: 620, shape: 'step', knee: 0.7, noise: 0.04, seed: 23 },
      },
      {
        key: 'temp', label: 'Bearing temp (Drive end)', unit: '°C', windowH: 48, digits: 0,
        delta: { text: '+14°C / 48h', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Trip', value: '105' }, { label: 'Alarm', value: '95' }],
        alarm: 95, alarmDir: 'high', normal: [60, 78], normalText: 'Normal: 60–78 °C', tag: 'TI-3201_DE',
        status: { label: 'Approaching alarm', tone: 'neutral' }, color: 'navy',
        trend: { start: 78, end: 92, shape: 'sigmoid', knee: 0.8, noise: 0.03, seed: 5 },
      },
      {
        key: 'press', label: 'Lube oil supply pressure', unit: 'bar', windowH: 24, digits: 1,
        delta: { text: '-0.3 bar (marginal)', dir: 'down', tone: 'neutral' },
        limits: [{ label: 'Alarm low', value: '1.5' }],
        alarm: 1.5, alarmDir: 'low', normal: [1.8, 2.4], normalText: 'Normal: 1.8–2.4 bar', tag: 'PI-3208',
        status: { label: 'Lower bound', tone: 'neutral' }, color: 'navy',
        trend: { start: 2.1, end: 1.8, shape: 'sigmoid', knee: 0.55, noise: 0.03, seed: 7 },
      },
    ],
    extraSignals: [
      { tag: 'VI-3201B', label: 'Radial vibration (Non-drive end)', value: '4.1 mm/s', state: 'watch' },
      { tag: 'ZI-3201', label: 'Axial displacement', value: '0.21 mm', state: 'normal' },
      { tag: 'TI-3201_NDE', label: 'Bearing temp (Non-drive end)', value: '74 °C', state: 'normal' },
      { tag: 'TI-3205', label: 'Lube oil cooler outlet', value: '49 °C', state: 'watch' },
      { tag: 'SI-3201', label: 'Shaft speed', value: '9,850 rpm', state: 'normal' },
      { tag: 'FI-3210', label: 'Suction flow', value: '41.2 t/h', state: 'normal' },
      { tag: 'TC-3209', label: 'Process thermocouple', value: '—', state: 'offline' },
    ],
    benchmark: {
      paramKey: 'vib', title: 'Vibration Benchmark', unit: 'mm/s', value: 8.5, scaleMax: 12, normal: [3, 5], alarm: 7,
      failure: { label: "Failure '24", value: 11.2 },
      rows: [
        { label: '24h Rate of Change', value: '+2.4 mm/s (+40%)', tone: 'critical' },
        { label: '7d Rate of Change', value: '+4.1 mm/s (+93%)' },
        { label: 'FFT Harmonics Analysis', value: '1X Unbalance + 2X Present' },
      ],
    },
    impact: [
      { kind: 'sensor', title: 'Sensor anomaly', headline: 'Vibration ↑68% & Water ↑210%', detail: 'Online CMS (Sync: 2m ago)' },
      { kind: 'health', title: 'Machine health', headline: 'Bearing degradation / Lube film loss', detail: 'AI Hypothesis Confidence: 89%' },
      { kind: 'hazard', title: 'Operational hazard', headline: 'Trip risk → Unit 32 Shutdown', detail: 'Capacity: 100% C3 Splitter throughput halt' },
      { kind: 'financial', title: 'Financial exposure', headline: 'Estimated Outage Cost: $1.584M', detail: '32 h downtime · 1,760 t production loss', note: 'Basis: AR-2026-ZCU-0142 benchmark' },
    ],
    confidence: {
      pct: 91,
      segments: [{ label: 'Telemetry', ok: true }, { label: 'Lab oil spectra', ok: true }, { label: 'Process data', ok: true }],
      note: 'Telemetry & laboratory oil spectra aligned; process thermocouple',
      offlineTag: 'TC-3209',
    },
    incidentFilters: [
      { key: 'high', label: 'High Similarity' },
      { key: 'compressor', label: 'Compressors' },
      { key: 'water', label: 'Water Contamination' },
    ],
    incidents: [
      {
        id: 'AR-2026-ZCU-0142', equipment: 'KO-3201', location: 'Unit 32', mechanism: 'Bearing distress', similarity: 94,
        signals: [{ label: 'Vibration ↑', tone: 'critical' }, { label: 'Water ↑', tone: 'high' }],
        rca: { cause: 'Water ingress via leaking tube in lube oil cooler E-3204', fix: 'Cooler bundle replaced; online moisture transmitter installed; zero-leak test added to PM' },
        tags: ['compressor', 'water'],
      },
      {
        id: 'AR-2024-C2U-0891', equipment: 'KO-2101', location: 'Unit 21', mechanism: 'Journal bearing wipe', similarity: 72,
        signals: [{ label: 'Vibration ↑', tone: 'neutral' }, { label: 'Temp DE ↑', tone: 'neutral' }],
        rca: { cause: 'Lube oil filter bypass failure caused babbitt scoring on lower half', fix: 'Emergency bearing roll-in; low oil pressure auto-interlock activated' },
        tags: ['compressor'],
      },
      {
        id: 'AR-2023-OL1-0415', equipment: 'KO-1102', location: 'Olefins 1', mechanism: 'Shaft radial deflection', similarity: 68,
        signals: [{ label: 'Vibration 1X ↑', tone: 'neutral' }],
        rca: { cause: 'Process liquid carryover in KO drum overloading impeller', fix: 'Demister pad renewed; suction superheat setpoint raised +5°C in APC' },
        tags: ['compressor'],
      },
    ],
    sources: ['Emerson CSI 6500 (Vib)', 'Yokogawa DCS', 'Labware LIMS (Oil)'],
    fieldAction: 'Request Field Lubrication Sampling',
  },

  'BL-5702': {
    problemId: 'BL-5702',
    headline: 'Misalignment Vibration',
    assetType: 'Extruder Main Blower',
    unitLabel: 'PP Plant',
    location: 'Polypropylene Plant — Extrusion Train',
    runningPct: 96,
    failureMode: 'Shaft misalignment',
    liveSensors: 24,
    banner: { lead: '2X vibration component', delta: '+55%', rest: 'in 72 h · 2 correlated signals · Coupling temperature rising in step' },
    params: [
      {
        key: 'vib2x', label: 'Vibration 2X (Motor DE)', unit: 'mm/s', windowH: 72, digits: 1,
        delta: { text: '+55% / 72h', dir: 'up', tone: 'high' },
        limits: [{ label: 'Trip', value: '11.0' }, { label: 'Alarm', value: '7.1' }],
        alarm: 7.1, alarmDir: 'high', normal: [1.5, 4.5], normalText: 'Normal: 1.5–4.5 mm/s', tag: 'VI-5702A',
        status: { label: 'Breached alarm', tone: 'high' }, color: 'high',
        trend: { start: 5.0, end: 7.8, shape: 'sigmoid', knee: 0.5, noise: 0.04, seed: 31 },
      },
      {
        key: 'coupling', label: 'Coupling guard temperature', unit: '°C', windowH: 72, digits: 0,
        delta: { text: '+11°C / 72h', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Alarm', value: '85' }],
        alarm: 85, alarmDir: 'high', normal: [50, 70], normalText: 'Normal: 50–70 °C', tag: 'TI-5704',
        status: { label: 'Approaching alarm', tone: 'neutral' }, color: 'navy',
        trend: { start: 67, end: 78, shape: 'step', knee: 0.4, noise: 0.03, seed: 32 },
      },
      {
        key: 'axial', label: 'Axial vibration', unit: 'mm/s', windowH: 72, digits: 1,
        delta: { text: '+0.9 / 72h', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Alarm', value: '4.5' }],
        alarm: 4.5, alarmDir: 'high', normal: [0.5, 3], normalText: 'Normal: 0.5–3.0 mm/s', tag: 'VI-5702X',
        status: { label: 'Above normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 3.0, end: 3.9, shape: 'linear', noise: 0.06, seed: 33 },
      },
      {
        key: 'current', label: 'Motor current', unit: 'A', windowH: 72, digits: 0,
        delta: { text: 'steady', dir: 'up', tone: 'neutral' },
        limits: [{ label: 'Alarm', value: '58' }],
        alarm: 58, alarmDir: 'high', normal: [44, 52], normalText: 'Normal: 44–52 A', tag: 'II-5702',
        status: { label: 'Normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 48, end: 48, shape: 'linear', noise: 0.6, seed: 34 },
      },
    ],
    extraSignals: [
      { tag: 'VI-5702B', label: 'Vibration 1X (Motor NDE)', value: '2.2 mm/s', state: 'normal' },
      { tag: 'TI-5702W', label: 'Motor winding temp', value: '96 °C', state: 'normal' },
      { tag: 'SI-5702', label: 'Blower speed', value: '2,980 rpm', state: 'normal' },
    ],
    benchmark: {
      paramKey: 'vib2x', title: '2X Vibration Benchmark', unit: 'mm/s', value: 7.8, scaleMax: 12, normal: [1.5, 4.5], alarm: 7.1,
      failure: { label: "Failure '22", value: 10.4 },
      rows: [
        { label: '72h Rate of Change', value: '+2.8 mm/s (+55%)', tone: 'high' },
        { label: '7d Rate of Change', value: '+3.3 mm/s (+73%)' },
        { label: 'FFT Harmonics Analysis', value: '2X Dominant, 1X Low' },
      ],
    },
    impact: [
      { kind: 'sensor', title: 'Sensor anomaly', headline: '2X Vibration ↑55% & Coupling ↑11°C', detail: 'Online CMS (Sync: 2m ago)' },
      { kind: 'health', title: 'Machine health', headline: 'Angular misalignment / coupling wear', detail: 'AI Hypothesis Confidence: 84%' },
      { kind: 'hazard', title: 'Operational hazard', headline: 'Coupling failure → Extrusion line stop', detail: 'Capacity: 50% PP pelletizing rate' },
      { kind: 'financial', title: 'Financial exposure', headline: 'Estimated Outage Cost: $0.62M', detail: '14 h downtime · 490 t production loss', note: 'Basis: AR-2022-PP2-0310 benchmark' },
    ],
    confidence: {
      pct: 86,
      segments: [{ label: 'Telemetry', ok: true }, { label: 'Thermography', ok: true }, { label: 'Alignment record', ok: false }],
      note: 'Online vibration and thermography agree; last laser alignment record is older than 18 months.',
    },
    incidentFilters: [
      { key: 'high', label: 'High Similarity' },
      { key: 'blower', label: 'Blowers & Fans' },
    ],
    incidents: [
      {
        id: 'AR-2022-PP2-0310', equipment: 'BL-5701', location: 'PP Plant', mechanism: 'Coupling misalignment', similarity: 91,
        signals: [{ label: 'Vib 2X ↑', tone: 'high' }, { label: 'Coupling T ↑', tone: 'medium' }],
        rca: { cause: 'Soft foot after base grouting repair shifted motor alignment', fix: 'Shim correction + laser alignment; added post-maintenance alignment check' },
        tags: ['blower'],
      },
      {
        id: 'AR-2021-PE1-0127', equipment: 'FN-4402', location: 'PE Plant', mechanism: 'Thermal growth offset', similarity: 66,
        signals: [{ label: 'Vib 2X ↑', tone: 'neutral' }],
        rca: { cause: 'Hot alignment offsets not applied after motor replacement', fix: 'Alignment targets updated with thermal growth values' },
        tags: ['blower'],
      },
    ],
    sources: ['Emerson CSI 6500 (Vib)', 'Yokogawa DCS', 'FLIR Thermography'],
    fieldAction: 'Request Laser Alignment Check',
  },

  'PU-2101B': {
    problemId: 'PU-2101B',
    headline: 'Suction Cavitation',
    assetType: 'Centrifugal Pump',
    unitLabel: 'Tank Farm',
    location: 'Ethylene Tank Farm — Transfer Unit',
    runningPct: 88,
    failureMode: 'Cavitation / NPSH deficit',
    liveSensors: 19,
    banner: { lead: 'Suction pressure', delta: '-54%', rest: 'in 12 h · acoustic emission spikes · flow reduced 8%' },
    params: [
      {
        key: 'suction', label: 'Suction pressure', unit: 'bar', windowH: 12, digits: 1,
        delta: { text: '-1.3 bar / 12h', dir: 'down', tone: 'high' },
        limits: [{ label: 'Alarm low', value: '1.5' }],
        alarm: 1.5, alarmDir: 'low', normal: [2.2, 2.6], normalText: 'Normal: 2.2–2.6 bar', tag: 'PI-2101B',
        status: { label: 'Breached alarm', tone: 'high' }, color: 'high',
        trend: { start: 2.4, end: 1.1, shape: 'sigmoid', knee: 0.55, noise: 0.03, seed: 41 },
      },
      {
        key: 'acoustic', label: 'High-freq acoustic emission', unit: 'dB', windowH: 12, digits: 0,
        delta: { text: '+14 dB / 12h', dir: 'up', tone: 'high' },
        limits: [{ label: 'Alarm', value: '+10' }],
        alarm: 10, alarmDir: 'high', normal: [0, 4], normalText: 'Baseline: 0–4 dB', tag: 'AE-2101B',
        status: { label: 'Cavitation pattern', tone: 'high' }, color: 'high',
        trend: { start: 2, end: 14, shape: 'step', knee: 0.6, noise: 0.08, seed: 42 },
      },
      {
        key: 'flow', label: 'Discharge flow', unit: 'm³/h', windowH: 12, digits: 0,
        delta: { text: '-8%', dir: 'down', tone: 'neutral' },
        limits: [{ label: 'Alarm low', value: '85' }],
        alarm: 85, alarmDir: 'low', normal: [95, 105], normalText: 'Normal: 95–105 m³/h', tag: 'FI-2103',
        status: { label: 'Below normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 100, end: 92, shape: 'sigmoid', knee: 0.6, noise: 0.02, seed: 43 },
      },
      {
        key: 'npsh', label: 'NPSH margin (calc.)', unit: 'm', windowH: 12, digits: 1,
        delta: { text: '-1.1 m', dir: 'down', tone: 'high' },
        limits: [{ label: 'Alarm low', value: '0.6' }],
        alarm: 0.6, alarmDir: 'low', normal: [1.2, 2], normalText: 'Design: ≥ 1.2 m', tag: 'CALC-2101B',
        status: { label: 'Below limit', tone: 'high' }, color: 'navy',
        trend: { start: 1.5, end: 0.4, shape: 'sigmoid', knee: 0.55, noise: 0.03, seed: 44 },
      },
    ],
    extraSignals: [
      { tag: 'PDI-2101', label: 'Suction strainer dP', value: '0.42 bar', state: 'watch' },
      { tag: 'LI-2001', label: 'Tank level', value: '38 %', state: 'normal' },
      { tag: 'VI-2101B', label: 'Pump vibration', value: '3.4 mm/s', state: 'watch' },
    ],
    benchmark: {
      paramKey: 'acoustic', title: 'Acoustic Benchmark', unit: 'dB', value: 14, scaleMax: 20, normal: [0, 4], alarm: 10,
      failure: { label: "Failure '23", value: 18 },
      rows: [
        { label: '12h Rate of Change', value: '+12 dB', tone: 'high' },
        { label: 'Strainer dP', value: '0.42 bar (2× clean)' },
        { label: 'Spectrum', value: 'Broadband 5–20 kHz noise' },
      ],
    },
    impact: [
      { kind: 'sensor', title: 'Sensor anomaly', headline: 'Suction P ↓54% & Acoustic ↑14 dB', detail: 'Online CMS (Sync: 2m ago)' },
      { kind: 'health', title: 'Machine health', headline: 'Impeller cavitation erosion', detail: 'AI Hypothesis Confidence: 87%' },
      { kind: 'hazard', title: 'Operational hazard', headline: 'Seal failure → Ethylene release risk', detail: 'Standby PU-2101A available' },
      { kind: 'financial', title: 'Financial exposure', headline: 'Estimated Repair Cost: $0.18M', detail: '6 h transfer delay · 120 t deferred', note: 'Basis: AR-2023-TF-0088 benchmark' },
    ],
    confidence: {
      pct: 88,
      segments: [{ label: 'Telemetry', ok: true }, { label: 'Acoustic', ok: true }, { label: 'Process data', ok: true }],
      note: 'Pressure, flow and acoustic signals are consistent with a clogged suction strainer.',
    },
    incidentFilters: [
      { key: 'high', label: 'High Similarity' },
      { key: 'pump', label: 'Pumps' },
    ],
    incidents: [
      {
        id: 'AR-2023-TF-0088', equipment: 'PU-2102A', location: 'Tank Farm', mechanism: 'Suction strainer blockage', similarity: 92,
        signals: [{ label: 'Suction P ↓', tone: 'high' }, { label: 'Acoustic ↑', tone: 'high' }],
        rca: { cause: 'Polymer fines accumulated in suction strainer after tank cleaning', fix: 'Strainer cleaned; dP alarm added at 0.3 bar' },
        tags: ['pump'],
      },
    ],
    sources: ['Yokogawa DCS', 'Acoustic CMS', 'SAP PM'],
    fieldAction: 'Request Strainer Inspection',
  },

  'HE-3301': {
    problemId: 'HE-3301',
    headline: 'Tube-side Fouling',
    assetType: 'Shell & Tube Exchanger',
    unitLabel: 'PyGas Unit',
    location: 'Pyrolysis Gasoline Unit — Exchanger Train',
    runningPct: 100,
    failureMode: 'Tube-side fouling',
    liveSensors: 16,
    banner: { lead: 'Tube-side dP', delta: '+106%', rest: 'over 21 days · heat transfer coefficient -18% · gradual trend' },
    params: [
      {
        key: 'dp', label: 'Tube-side differential pressure', unit: 'bar', windowH: 504, digits: 2,
        delta: { text: '+0.95 bar / 21d', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Alarm', value: '2.20' }],
        alarm: 2.2, alarmDir: 'high', normal: [0.8, 1.0], normalText: 'Clean: 0.9 bar', tag: 'PDI-3301',
        status: { label: 'Rising', tone: 'medium' }, color: 'navy',
        trend: { start: 0.9, end: 1.85, shape: 'linear', noise: 0.03, seed: 51 },
      },
      {
        key: 'ucoef', label: 'Heat transfer coefficient', unit: '%', windowH: 504, digits: 0,
        delta: { text: '-18% / 21d', dir: 'down', tone: 'medium' },
        limits: [{ label: 'Alarm low', value: '75' }],
        alarm: 75, alarmDir: 'low', normal: [95, 100], normalText: 'Design: 100%', tag: 'CALC-3301U',
        status: { label: 'Declining', tone: 'medium' }, color: 'navy',
        trend: { start: 100, end: 82, shape: 'linear', noise: 0.02, seed: 52 },
      },
      {
        key: 'outlet', label: 'Product outlet temperature', unit: '°C', windowH: 504, digits: 0,
        delta: { text: '+6°C / 21d', dir: 'up', tone: 'neutral' },
        limits: [{ label: 'Alarm', value: '68' }],
        alarm: 68, alarmDir: 'high', normal: [52, 60], normalText: 'Normal: 52–60 °C', tag: 'TI-3304',
        status: { label: 'Above normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 57, end: 63, shape: 'linear', noise: 0.03, seed: 53 },
      },
      {
        key: 'skin', label: 'Tube skin temperature', unit: '°C', windowH: 504, digits: 0,
        delta: { text: 'stable', dir: 'up', tone: 'neutral' },
        limits: [{ label: 'Alarm', value: '240' }],
        alarm: 240, alarmDir: 'high', normal: [190, 215], normalText: 'Normal: 190–215 °C', tag: 'TI-3301S',
        status: { label: 'Normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 204, end: 206, shape: 'linear', noise: 0.08, seed: 54 },
      },
    ],
    extraSignals: [
      { tag: 'FI-3301', label: 'Tube-side flow', value: '212 t/h', state: 'normal' },
      { tag: 'AI-3301', label: 'Anti-foulant dosing', value: '18 ppm', state: 'watch' },
    ],
    benchmark: {
      paramKey: 'dp', title: 'dP Benchmark', unit: 'bar', value: 1.85, scaleMax: 3, normal: [0.8, 1.0], alarm: 2.2,
      failure: { label: "Cleaning '25", value: 2.5 },
      rows: [
        { label: '7d Rate of Change', value: '+0.31 bar', tone: 'medium' },
        { label: 'Days to alarm (proj.)', value: '~11 days' },
        { label: 'Fouling factor', value: '0.00042 m²K/W' },
      ],
    },
    impact: [
      { kind: 'sensor', title: 'Sensor anomaly', headline: 'dP ↑106% & U-coefficient ↓18%', detail: 'DCS historian (Sync: 2m ago)' },
      { kind: 'health', title: 'Equipment health', headline: 'Polymer fouling on tube side', detail: 'AI Hypothesis Confidence: 81%' },
      { kind: 'hazard', title: 'Operational hazard', headline: 'Throughput limit → PyGas rate cut', detail: 'Capacity: 15% hydrotreater feed' },
      { kind: 'financial', title: 'Financial exposure', headline: 'Estimated Loss: $0.21M / month', detail: 'Energy penalty + 230 t deferred', note: 'Basis: 2025 cleaning campaign' },
    ],
    confidence: {
      pct: 82,
      segments: [{ label: 'Process data', ok: true }, { label: 'Lab analysis', ok: true }, { label: 'Inspection', ok: false }],
      note: 'Trend is consistent with previous fouling cycles; no recent bundle inspection available.',
    },
    incidentFilters: [
      { key: 'high', label: 'High Similarity' },
      { key: 'exchanger', label: 'Exchangers' },
    ],
    incidents: [
      {
        id: 'AR-2025-PG-0204', equipment: 'HE-3301', location: 'PyGas Unit', mechanism: 'Tube-side polymer fouling', similarity: 90,
        signals: [{ label: 'dP ↑', tone: 'medium' }, { label: 'U ↓', tone: 'medium' }],
        rca: { cause: 'Anti-foulant under-dosing during feed composition change', fix: 'Hydro-jet cleaning; dosing ratio linked to diene content' },
        tags: ['exchanger'],
      },
    ],
    sources: ['Yokogawa DCS', 'Labware LIMS', 'Aspen Exchanger Monitor'],
    fieldAction: 'Request Dosing Verification',
  },

  'PM-4405B': {
    problemId: 'PM-4405B',
    headline: 'Bearing Temperature Drift',
    assetType: 'Induction Motor (BFP)',
    unitLabel: 'Utilities',
    location: 'Utilities & Power — Boiler Feed Pump',
    runningPct: 100,
    failureMode: 'Grease degradation',
    liveSensors: 14,
    banner: { lead: 'DE bearing temperature', delta: '+12°C', rest: 'over 3 weeks · grease degradation index elevated' },
    params: [
      {
        key: 'bde', label: 'Bearing temp (Drive end)', unit: '°C', windowH: 504, digits: 0,
        delta: { text: '+12°C / 3w', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Trip', value: '95' }, { label: 'Alarm', value: '85' }],
        alarm: 85, alarmDir: 'high', normal: [60, 75], normalText: 'Normal: 60–75 °C', tag: 'TI-4405_DE',
        status: { label: 'Approaching alarm', tone: 'medium' }, color: 'navy',
        trend: { start: 70, end: 82, shape: 'linear', noise: 0.04, seed: 61 },
      },
      {
        key: 'bnde', label: 'Bearing temp (Non-drive end)', unit: '°C', windowH: 504, digits: 0,
        delta: { text: '+2°C / 3w', dir: 'up', tone: 'neutral' },
        limits: [{ label: 'Alarm', value: '85' }],
        alarm: 85, alarmDir: 'high', normal: [60, 75], normalText: 'Normal: 60–75 °C', tag: 'TI-4405_NDE',
        status: { label: 'Normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 69, end: 71, shape: 'linear', noise: 0.08, seed: 62 },
      },
      {
        key: 'vib', label: 'Motor vibration (DE)', unit: 'mm/s', windowH: 504, digits: 1,
        delta: { text: '+0.4 / 3w', dir: 'up', tone: 'neutral' },
        limits: [{ label: 'Alarm', value: '4.5' }],
        alarm: 4.5, alarmDir: 'high', normal: [0.8, 2.8], normalText: 'Normal: 0.8–2.8 mm/s', tag: 'VI-4405',
        status: { label: 'Normal', tone: 'neutral' }, color: 'navy',
        trend: { start: 1.7, end: 2.1, shape: 'linear', noise: 0.1, seed: 63 },
      },
      {
        key: 'gdi', label: 'Grease degradation index', unit: '', windowH: 504, digits: 2,
        delta: { text: '+0.31 / 3w', dir: 'up', tone: 'medium' },
        limits: [{ label: 'Alarm', value: '0.80' }],
        alarm: 0.8, alarmDir: 'high', normal: [0, 0.4], normalText: 'Normal: ‹ 0.40', tag: 'UE-4405',
        status: { label: 'Elevated', tone: 'medium' }, color: 'navy',
        trend: { start: 0.33, end: 0.64, shape: 'sigmoid', knee: 0.5, noise: 0.04, seed: 64 },
      },
    ],
    extraSignals: [
      { tag: 'II-4405', label: 'Motor current', value: '212 A', state: 'normal' },
      { tag: 'TI-4405W', label: 'Winding temp', value: '88 °C', state: 'normal' },
    ],
    benchmark: {
      paramKey: 'bde', title: 'Bearing Temp Benchmark', unit: '°C', value: 82, scaleMax: 100, normal: [60, 75], alarm: 85,
      failure: { label: "Failure '21", value: 94 },
      rows: [
        { label: '7d Rate of Change', value: '+4°C', tone: 'medium' },
        { label: 'Days to alarm (proj.)', value: '~5 days' },
        { label: 'Last re-greasing', value: '142 days ago' },
      ],
    },
    impact: [
      { kind: 'sensor', title: 'Sensor anomaly', headline: 'DE bearing ↑12°C & grease index ↑', detail: 'Online CMS (Sync: 2m ago)' },
      { kind: 'health', title: 'Machine health', headline: 'Lubricant breakdown in DE bearing', detail: 'AI Hypothesis Confidence: 78%' },
      { kind: 'hazard', title: 'Operational hazard', headline: 'Bearing seizure → BFP switchover', detail: 'Redundant pump PM-4405A on standby' },
      { kind: 'financial', title: 'Financial exposure', headline: 'Estimated Repair Cost: $0.09M', detail: 'Motor rewind avoided if acted on early', note: 'Basis: AR-2021-UT-0033 benchmark' },
    ],
    confidence: {
      pct: 76,
      segments: [{ label: 'Telemetry', ok: true }, { label: 'Grease sample', ok: false }, { label: 'Maintenance log', ok: true }],
      note: 'No grease sample in the last 90 days; confidence will rise after field sampling.',
    },
    incidentFilters: [
      { key: 'high', label: 'High Similarity' },
      { key: 'motor', label: 'Motors' },
    ],
    incidents: [
      {
        id: 'AR-2021-UT-0033', equipment: 'PM-4402A', location: 'Utilities', mechanism: 'DE bearing lubrication failure', similarity: 83,
        signals: [{ label: 'Temp DE ↑', tone: 'medium' }],
        rca: { cause: 'Re-greasing interval exceeded after PM schedule change', fix: 'Bearing replaced; auto-lubricator installed' },
        tags: ['motor'],
      },
    ],
    sources: ['Emerson CSI 6500 (Vib)', 'Yokogawa DCS', 'SAP PM'],
    fieldAction: 'Request Grease Sampling',
  },
}
