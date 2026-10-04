import clsx from 'clsx'
import type { ReactNode } from 'react'

const TONE = {
  neutral: 'bg-slate-100 text-ink-2',
  good: 'bg-good-soft text-good',
  info: 'bg-info-soft text-navy-700',
  medium: 'bg-medium-soft text-[#8a6508]',
} as const

export type StatusTone = keyof typeof TONE

export function StatusLabel({ tone = 'neutral', dashed, children, className }: { tone?: StatusTone; dashed?: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide',
        TONE[tone],
        dashed && 'border border-dashed border-slate-300 bg-transparent',
        className,
      )}
    >
      {children}
    </span>
  )
}
