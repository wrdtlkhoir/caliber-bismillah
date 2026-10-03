import clsx from 'clsx'
import { ChevronDown, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Severity } from '@/data/types'
import type { RankedProblem } from '@/lib/ahp'
import { ProblemCard } from './ProblemCard'

export type SortKey = 'ahp' | 'newest' | 'id'
export type SevFilter = 'all' | Severity

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'ahp', label: 'AHP Priority' },
  { key: 'newest', label: 'Newest' },
  { key: 'id', label: 'Equipment ID' },
]

const TABS: { key: SevFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
]

export function sortProblems(list: RankedProblem[], key: SortKey) {
  const out = [...list]
  if (key === 'ahp') out.sort((a, b) => b.ahp - a.ahp)
  if (key === 'newest') out.sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
  if (key === 'id') out.sort((a, b) => a.id.localeCompare(b.id))
  return out
}

interface Props {
  pool: RankedProblem[]
  filter: SevFilter
  onFilter: (f: SevFilter) => void
  sort: SortKey
  onSort: (s: SortKey) => void
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  assistant: ReactNode
  emptyHint?: string
  onClearFilters: () => void
}

export function ProblemTank({ pool, filter, onFilter, sort, onSort, selectedId, hoveredId, onSelect, onHover, assistant, emptyHint, onClearFilters }: Props) {
  const visible = sortProblems(filter === 'all' ? pool : pool.filter((p) => p.severity === filter), sort)
  const count = (f: SevFilter) => (f === 'all' ? pool.length : pool.filter((p) => p.severity === f).length)

  return (
    <section className="space-y-4" aria-labelledby="problem-tank">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 id="problem-tank" className="text-xl font-semibold text-ink">
          Problem Tank
        </h2>
        <div role="tablist" className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => onFilter(t.key)}
              className={clsx(
                'rounded-md px-3.5 py-1 text-[15px] transition',
                filter === t.key ? 'bg-navy-900 text-white' : 'text-ink-2 hover:bg-slate-200/60',
              )}
            >
              {t.label} ({count(t.key)})
            </button>
          ))}
        </div>
        <label className="relative ml-auto flex items-center rounded-md border border-line bg-white py-1 pl-3 pr-8 font-mono text-[12.5px] text-ink shadow-card">
          Sort:
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="appearance-none bg-transparent pl-1.5 font-medium outline-none"
            aria-label="Sort problems"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 size-4" />
        </label>
      </div>

      {assistant}

      <div className="space-y-4">
        {visible.map((p, i) => (
          <ProblemCard
            key={p.id}
            index={i}
            problem={p}
            selected={selectedId === p.id}
            highlighted={hoveredId === p.id}
            onSelect={() => onSelect(p.id)}
            onHover={onHover}
          />
        ))}
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-ink-2">
            <SearchX className="size-6 text-ink-3" />
            <p className="text-sm">{emptyHint ?? 'No problems in this category.'}</p>
            <button onClick={onClearFilters} className="text-sm font-medium text-navy-700 hover:underline">
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
