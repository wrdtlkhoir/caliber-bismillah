import type { ActionStatus, ProblemStatus, Severity, SignalTone } from '@/data/types'
import { CRITICAL_RISK_THRESHOLD } from '@/lib/ahp'

export const severityMeta: Record<Severity, { label: string; text: string; soft: string; bar: string; border: string }> = {
  critical: { label: 'Critical', text: 'text-critical', soft: 'bg-critical-soft', bar: 'bg-critical', border: 'border-l-critical' },
  high: { label: 'High', text: 'text-high', soft: 'bg-high-soft', bar: 'bg-high', border: 'border-l-high' },
  medium: { label: 'Medium', text: 'text-ink-2', soft: 'bg-slate-100', bar: 'bg-navy-700', border: 'border-l-medium' },
}

/** Warna bar ranking AHP berdasarkan skor (bukan severity), sesuai desain. */
export function rankBarColor(score: number) {
  if (score >= 0.8) return 'bg-critical'
  if (score >= CRITICAL_RISK_THRESHOLD) return 'bg-high'
  if (score >= 0.5) return 'bg-navy-700'
  return 'bg-slate-300'
}

export const signalTone: Record<SignalTone, string> = {
  critical: 'bg-critical-soft text-critical',
  high: 'bg-high-soft text-high',
  medium: 'bg-medium-soft text-[#b7860b]',
  neutral: 'bg-slate-100 text-ink-2',
}

export const statusDot: Record<ProblemStatus, { dot: string; text: string }> = {
  Investigating: { dot: 'bg-ink-3', text: 'text-ink-2' },
  'Diagnosis Pending': { dot: 'bg-ink-3', text: 'text-ink-2' },
  'Action in Progress': { dot: 'bg-info', text: 'text-info' },
  Validated: { dot: 'bg-good', text: 'text-ink-2' },
}

export const actionStatusStyle: Record<ActionStatus, { pill: string; card: string; border: string }> = {
  'At Risk': { pill: 'bg-critical-soft text-critical', card: 'bg-critical-soft/50', border: 'border-l-critical' },
  Scheduled: { pill: 'bg-info-soft text-navy-800', card: 'bg-white', border: 'border-l-navy-800' },
  'In Progress': { pill: 'bg-teal-soft text-teal', card: 'bg-white', border: 'border-l-teal' },
  'On Track': { pill: 'text-good', card: 'bg-white', border: 'border-l-slate-300' },
}
