import clsx from 'clsx'
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, Search, SearchX, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mono } from '@/components/ui/Card'
import type { Severity } from '@/data/types'
import type { RankedProblem } from '@/lib/ahp'
import { severityMeta, statusDot } from '@/lib/severity'
import { ProblemCard } from './ProblemCard'

export type SortKey = 'ahp' | 'newest' | 'id'
export type SevFilter = 'all' | Severity
type View = 'cards' | 'list'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'ahp', label: 'Priority score' },
  { key: 'newest', label: 'Newest' },
  { key: 'id', label: 'Equipment ID' },
]

const TABS: { key: SevFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
]

/** Jumlah problem per halaman. */
const PAGE_SIZE: Record<View, number> = { cards: 4, list: 10 }

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
  query: string
  onQuery: (q: string) => void
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  assistant: ReactNode
  emptyHint?: string
  onClearFilters: () => void
  /** permintaan dari panel lain untuk menampilkan problem tertentu (seq naik setiap permintaan) */
  focus?: { id: string; seq: number }
}

export function ProblemTank({ pool, filter, onFilter, sort, onSort, query, onQuery, selectedId, hoveredId, onSelect, onHover, assistant, emptyHint, onClearFilters, focus }: Props) {
  const [view, setView] = useState<View>(() => (pool.length > 6 ? 'list' : 'cards'))
  const navigate = useNavigate()
  // Klik problem = drill-down ke Problem Investigation (tidak ada lagi di sidebar)
  const open = (id: string) => {
    onSelect(id)
    navigate(`/investigation/${id}`)
  }
  const visible = sortProblems(filter === 'all' ? pool : pool.filter((p) => p.severity === filter), sort)
  const count = (f: SevFilter) => (f === 'all' ? pool.length : pool.filter((p) => p.severity === f).length)

  // Halaman kembali ke 1 setiap kali isi daftar berubah (filter, sort, view, pencarian)
  const size = PAGE_SIZE[view]
  const pageCount = Math.max(1, Math.ceil(visible.length / size))
  const resetKey = [view, sort, visible.map((p) => p.id).join(',')].join('|')
  const [paging, setPaging] = useState({ key: resetKey, page: 0 })
  const page = paging.key === resetKey ? Math.min(paging.page, pageCount - 1) : 0
  const setPage = (n: number) => setPaging({ key: resetKey, page: Math.max(0, Math.min(n, pageCount - 1)) })
  const shown = visible.slice(page * size, page * size + size)

  // Problem yang dipilih dari panel lain (ranking, urgent actions) harus terlihat
  useEffect(() => {
    const i = visible.findIndex((p) => p.id === focus?.id)
    if (i >= 0 && Math.floor(i / size) !== page) setPage(Math.floor(i / size))
  }, [focus?.seq])

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
              className={clsx('rounded-md px-3.5 py-1 text-[15px] transition', filter === t.key ? 'bg-navy-900 text-white' : 'text-ink-2 hover:bg-slate-200/60')}
            >
              {t.label} ({count(t.key)})
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-0 flex-1 basis-56 items-center rounded-md border border-line bg-white px-3 py-1.5 shadow-card focus-within:ring-2 focus-within:ring-navy-600/20">
          <Search className="mr-2 size-4 shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search tag, equipment, plant or PIC"
            className="w-full min-w-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
            aria-label="Search problems"
          />
          {query && (
            <button onClick={() => onQuery('')} className="ml-1 rounded p-0.5 text-ink-3 hover:bg-slate-100 hover:text-ink" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <label className="relative flex items-center rounded-md border border-line bg-white py-1.5 pl-3 pr-8 text-[13px] text-ink shadow-card">
          Sort by
          <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} className="appearance-none bg-transparent pl-1.5 font-medium outline-none" aria-label="Sort problems">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 size-4" />
        </label>
        <div className="flex rounded-md border border-line bg-white p-0.5 shadow-card" role="radiogroup" aria-label="Layout">
          {(
            [
              ['cards', LayoutGrid, 'Cards'],
              ['list', List, 'List'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              role="radio"
              aria-checked={view === key}
              onClick={() => setView(key)}
              title={label}
              className={clsx('flex items-center gap-1.5 rounded px-2.5 py-1 text-[13px] transition', view === key ? 'bg-navy-900 text-white' : 'text-ink-2 hover:bg-slate-100')}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {assistant}

      {view === 'cards' ? (
        <div className="space-y-4">
          {shown.map((p, i) => (
            <ProblemCard key={p.id} index={i} problem={p} selected={selectedId === p.id} highlighted={hoveredId === p.id} onSelect={() => open(p.id)} onHover={onHover} />
          ))}
        </div>
      ) : (
        visible.length > 0 && <ProblemList problems={shown} selectedId={selectedId} hoveredId={hoveredId} onSelect={open} onHover={onHover} />
      )}

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} size={size} total={visible.length} onPage={setPage} />}

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-ink-2">
          <SearchX className="size-6 text-ink-3" />
          <p className="text-sm">{emptyHint ?? 'No problems in this category.'}</p>
          <button onClick={onClearFilters} className="text-sm font-medium text-navy-700 hover:underline">
            Reset filters
          </button>
        </div>
      )}
    </section>
  )
}

function Pagination({ page, pageCount, size, total, onPage }: { page: number; pageCount: number; size: number; total: number; onPage: (n: number) => void }) {
  const from = page * size + 1
  const to = Math.min(total, from + size - 1)
  // nomor halaman ringkas: 1 … (p-1) p (p+1) … N
  const pages = [...new Set([0, page - 1, page, page + 1, pageCount - 1])].filter((n) => n >= 0 && n < pageCount).sort((a, b) => a - b)
  const btn = 'grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13.5px] transition disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-1" aria-label="Problem pages">
      <p className="text-[13px] text-ink-2 tabular">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 0} className={clsx(btn, 'text-ink-2 hover:bg-white hover:text-ink')} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - pages[i - 1] > 1 && <span className="px-1 text-ink-3">…</span>}
            <button
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={clsx(btn, 'tabular', n === page ? 'border border-line bg-white font-medium text-navy-800 shadow-card' : 'text-ink-2 hover:bg-white hover:text-ink')}
            >
              {n + 1}
            </button>
          </span>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pageCount - 1} className={clsx(btn, 'text-ink-2 hover:bg-white hover:text-ink')} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}

/** Tampilan ringkas satu baris per problem, untuk jumlah problem yang banyak. */
function ProblemList({
  problems,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  problems: RankedProblem[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="hidden grid-cols-[92px_minmax(0,1fr)_120px_96px_28px] gap-3 border-b border-line bg-slate-50 px-4 py-2 text-[13px] font-medium text-ink-2 md:grid">
        <span>Tag</span>
        <span>Problem</span>
        <span>Status</span>
        <span className="text-right">Priority</span>
        <span />
      </div>
      <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
        {problems.map((p) => {
          const sev = severityMeta[p.severity]
          const st = statusDot[p.status]
          return (
            <li key={p.id} id={`problem-${p.id}`}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(p.id)}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
                className={clsx(
                  'grid cursor-pointer grid-cols-[92px_minmax(0,1fr)_28px] items-center gap-3 px-4 py-3 transition md:grid-cols-[92px_minmax(0,1fr)_120px_96px_28px]',
                  selectedId === p.id ? 'bg-info-soft/50' : hoveredId === p.id ? 'bg-slate-50' : 'bg-surface',
                )}
              >
                <div>
                  <Mono className="block text-[13px] font-semibold text-ink">{p.id}</Mono>
                  <span className={clsx('text-[12px] font-medium', sev.text)}>{sev.label}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] text-ink">{p.title}</p>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {p.area}, PIC {p.lead}
                  </p>
                </div>
                <span className={clsx('hidden items-center gap-1.5 text-[13px] md:flex', st.text)}>
                  <span className={clsx('size-2 shrink-0 rounded-full', st.dot)} />
                  {p.status}
                </span>
                <div className="hidden text-right md:block">
                  <Mono className="text-[13px] font-semibold text-ink">{p.ahp.toFixed(2)}</Mono>
                  <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div className={clsx('h-full rounded-full', sev.bar)} style={{ width: `${p.ahp * 100}%` }} />
                  </div>
                </div>
                <Link to={`/investigation/${p.id}`} onClick={(e) => e.stopPropagation()} className="rounded p-1 text-ink-3 hover:bg-slate-100 hover:text-ink" aria-label={`Open ${p.id}`}>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
