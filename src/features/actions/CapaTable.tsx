import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Mono } from '@/components/ui/Card'
import type { ActionPriority, ActionStatus, ActionType, CapaAction } from '@/data/actions'

const TYPE: Record<ActionType, string> = {
  Corrective: 'bg-info-soft text-navy-700',
  Preventive: 'bg-teal-soft text-teal',
  Proactive: 'bg-good-soft text-good',
}

const PRIORITY: Record<ActionPriority, string> = {
  Critical: 'bg-critical-soft text-critical',
  High: 'bg-high-soft text-high',
  Medium: 'bg-slate-100 text-ink',
}

const STATUS: Record<ActionStatus, string> = {
  Done: 'bg-good-soft text-good',
  'In progress': 'bg-info-soft text-navy-700',
  'Not started': 'bg-slate-100 text-ink-2',
}

export const initials = (name: string) =>
  /^[A-Z]{3}-\d+$/.test(name)
    ? `${name[0]}${name.slice(-1)}` // kode PIC, mis. REL-05 → R5
    : name
        .replace(/[^A-Za-z. ]/g, '')
        .split(/[ .]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join('')

export function formatDue(iso: string) {
  return new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

function isOverdue(a: CapaAction, refDate: string) {
  return a.status !== 'Done' && a.due < refDate
}

interface Props {
  actions: CapaAction[]
  highlightId: string | null
  onStatus: (id: string, status: ActionStatus) => void
  /** tanggal acuan overdue (tanggal replay) */
  refDate: string
  /** status tidak bisa diubah (role tanpa izin edit CAPA) */
  readOnly?: boolean
  readOnlyTitle?: string
}

type StatusFilter = 'all' | 'open' | ActionStatus
type SortKey = 'due' | 'priority' | 'status' | 'type' | 'plan'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'Not started', label: 'Not started' },
  { key: 'In progress', label: 'In progress' },
  { key: 'Done', label: 'Done' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'plan', label: 'RCA order' },
  { key: 'due', label: 'Due date' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
]

const RANK = {
  priority: { Critical: 0, High: 1, Medium: 2 } as Record<ActionPriority, number>,
  status: { 'Not started': 0, 'In progress': 1, Done: 2 } as Record<ActionStatus, number>,
  type: { Corrective: 0, Preventive: 1, Proactive: 2 } as Record<ActionType, number>,
}

const matches = (a: CapaAction, f: StatusFilter) => f === 'all' || (f === 'open' ? a.status !== 'Done' : a.status === f)

export function CapaTable({ actions, highlightId, onStatus, refDate, readOnly, readOnlyTitle }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('plan')

  // Kalau baris yang mau disorot sedang tersaring, tampilkan semua dulu
  useEffect(() => {
    const target = actions.find((a) => a.id === highlightId)
    if (target && !matches(target, filter)) setFilter('all')
  }, [highlightId, actions, filter])

  const rows = actions.filter((a) => matches(a, filter))
  if (sort === 'due') rows.sort((x, y) => x.due.localeCompare(y.due))
  if (sort === 'priority') rows.sort((x, y) => RANK.priority[x.priority] - RANK.priority[y.priority] || x.due.localeCompare(y.due))
  if (sort === 'status') rows.sort((x, y) => RANK.status[x.status] - RANK.status[y.status] || x.due.localeCompare(y.due))
  if (sort === 'type') rows.sort((x, y) => RANK.type[x.type] - RANK.type[y.type] || x.due.localeCompare(y.due))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[13px] transition',
                filter === f.key ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink-2 hover:border-slate-300',
              )}
            >
              {f.label} ({actions.filter((a) => matches(a, f.key)).length})
            </button>
          ))}
        </div>
        <label className="relative flex items-center rounded-md border border-line bg-white py-1 pl-3 pr-8 text-[13px] text-ink">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none bg-transparent pl-1.5 font-medium outline-none"
            aria-label="Sort actions"
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] 2xl:min-w-[980px] text-left">
          <thead>
            <tr className="bg-slate-100 text-[15px] text-ink">
              <th className="w-[34%] rounded-l-lg px-4 py-3 font-medium 2xl:w-[24%]">Action item</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Owner</th>
              <th className="px-3 py-3 font-medium">Due date</th>
              <th className="px-3 py-3 font-medium">Priority</th>
              <th className="rounded-r-lg px-3 py-3 font-medium 2xl:rounded-none">Status</th>
              <th className="hidden w-[22%] rounded-r-lg px-4 py-3 font-medium 2xl:table-cell">Verification criteria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[14px] text-ink-3">
                  No actions with this status.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr
                key={a.id}
                id={`capa-${a.id}`}
                className={clsx('transition-colors duration-700', highlightId === a.id ? 'bg-info-soft' : a.status === 'In progress' && 'bg-slate-50/70')}
              >
                <td className="px-4 py-4">
                  <p className="text-[15.5px] leading-snug text-ink">
                    <Mono className="mr-1.5 text-[12px] text-ink-3">#{actions.indexOf(a) + 1}</Mono>
                    {a.title}
                  </p>
                  <Mono className={clsx('mt-1 block text-[12.5px]', a.type === 'Preventive' ? 'text-teal' : 'text-ink-2')}>{a.ref}</Mono>
                </td>
                <td className="px-3 py-4">
                  <span className={clsx('rounded px-2 py-0.5 text-[14px]', TYPE[a.type])}>{a.type}</span>
                </td>
                <td className="px-3 py-4">
                  <span className="flex items-center gap-2 whitespace-nowrap text-[15px] text-ink">
                    <span className="grid size-7 place-items-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">{initials(a.owner)}</span>
                    {a.owner}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <Mono className={clsx('text-[13.5px]', isOverdue(a, refDate) ? 'font-semibold text-critical' : 'text-ink')}>{formatDue(a.due)}</Mono>
                  {isOverdue(a, refDate) && <span className="block text-[12px] text-critical">Overdue</span>}
                </td>
                <td className="px-3 py-4">
                  <span className={clsx('rounded px-2 py-0.5 text-[14px]', PRIORITY[a.priority])}>{a.priority}</span>
                </td>
                <td className="px-3 py-4">
                  {readOnly ? (
                    <span className={clsx('inline-block whitespace-nowrap rounded px-2 py-0.5 text-[14px]', STATUS[a.status])} title={readOnlyTitle}>
                      {a.status}
                    </span>
                  ) : (
                  <label className={clsx('relative inline-flex items-center rounded text-[14px]', STATUS[a.status])}>
                    <select
                      value={a.status}
                      onChange={(e) => onStatus(a.id, e.target.value as ActionStatus)}
                      className="cursor-pointer appearance-none bg-transparent py-0.5 pl-2 pr-6 outline-none"
                      aria-label={`Status of ${a.title}`}
                    >
                      {(['Not started', 'In progress', 'Done'] as const).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" />
                  </label>
                  )}
                </td>
                <td className="hidden px-4 py-4 font-mono text-[12.5px] leading-relaxed text-ink 2xl:table-cell">{a.criteria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
