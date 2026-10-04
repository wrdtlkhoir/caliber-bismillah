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
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium leading-5',
        TONE[tone],
        dashed && 'border border-dashed border-slate-300 bg-transparent',
        className,
      )}
    >
      {children}
    </span>
  )
}
