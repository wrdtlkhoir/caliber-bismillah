import clsx from 'clsx'
import {
  ArrowDown,
  AudioLines,
  ChevronRight,
  Check,
  Droplet,
  Factory,
  Gauge,
  MoveVertical,
  Thermometer,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Mono } from '@/components/ui/Card'
import type { SignalIcon } from '@/data/types'
import type { RankedProblem } from '@/lib/ahp'
import { severityMeta, signalTone, statusDot } from '@/lib/severity'

const ICONS: Record<SignalIcon, LucideIcon> = {
  alert: TriangleAlert,
  drop: Droplet,
  trend: TrendingUp,
  gauge: Gauge,
  temp: Thermometer,
  check: Check,
  down: ArrowDown,
  wave: AudioLines,
  diff: MoveVertical,
}

interface Props {
  problem: RankedProblem
  selected: boolean
  highlighted: boolean
  onSelect: () => void
  onHover: (id: string | null) => void
  index: number
}

export function ProblemCard({ problem: p, selected, highlighted, onSelect, onHover, index }: Props) {
  const sev = severityMeta[p.severity]
  const st = statusDot[p.status]

  return (
    <article
      id={`problem-${p.id}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      style={{ animationDelay: `${index * 50}ms` }}
      className={clsx(
        'animate-fade-up cursor-pointer rounded-xl border border-l-4 bg-surface shadow-card transition',
        sev.border,
        selected ? 'border-y-slate-300 border-r-slate-300 shadow-md' : 'border-y-line border-r-line',
        highlighted && !selected && 'ring-2 ring-navy-600/20',
        'hover:shadow-md',
      )}
      aria-current={selected || undefined}
    >
      <div className="px-5 pt-4">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Mono className="rounded-md bg-slate-100 px-2 py-1 text-[13px] font-semibold text-ink">{p.id}</Mono>
          <span className={clsx('flex items-center gap-1.5 rounded-md px-2 py-0.5 text-lg font-medium', sev.soft, sev.text)}>
            <span className={clsx('size-1.5 rounded-full', p.severity === 'medium' ? 'bg-ink-2' : sev.bar)} />
            {sev.label}
          </span>
          <Mono className="text-[13px] font-semibold text-ink">AHP: {p.ahp.toFixed(2)}</Mono>
          <span className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-2">
            <Factory className="size-4 text-ink-3" />
            {p.area}
          </span>
        </header>

        <h3 className="mt-3 text-[17px] font-medium leading-snug text-ink" title={p.equipment}>
          {p.title}
        </h3>

        <ul className="mt-3 flex flex-wrap gap-2">
          {p.signals.map((s) => {
            const Icon = s.icon ? ICONS[s.icon] : null
            return (
              <li key={s.label} className={clsx('flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[12.5px]', signalTone[s.tone])}>
                {Icon && <Icon className="size-3.5" />}
                {s.label}
              </li>
            )
          })}
        </ul>
      </div>

      <footer className="mx-5 mt-4 flex items-center gap-3 border-t border-line py-3 text-[13px]">
        <span className={clsx('flex items-center gap-2 text-[15px]', st.text)}>
          <span className={clsx('size-2 rounded-full', st.dot)} />
          {p.status}
        </span>
        <span className="h-4 w-px bg-line" />
        <span className="text-ink-3">
          Lead: <span className="text-ink">{p.lead}</span>
        </span>
        <Link
          to={`/investigation/${p.id}`}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto flex items-center gap-0.5 text-[15px] text-ink hover:text-navy-700"
        >
          View <ChevronRight className="size-4" />
        </Link>
      </footer>
    </article>
  )
}
