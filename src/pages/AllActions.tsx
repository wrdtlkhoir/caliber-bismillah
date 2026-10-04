import clsx from 'clsx'
import { ArrowRight, ChevronDown, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { buildActionCase, type ActionPriority, type ActionStatus, type ActionType, type CapaAction } from '@/data/actions'
import { assetByTag, assets } from '@/data/dataset'
import { formatDue, PRIORITY_STYLE, STATUS_STYLE, TYPE_STYLE } from '@/features/actions/CapaTable'
import { fmtDate, useAsOf } from '@/lib/asOf'
import { readCapa, writeCapa } from '@/lib/capaStore'
import { useRole } from '@/lib/role'

type StatusFilter = 'all' | 'open' | ActionStatus
type SortKey = 'due' | 'priority' | 'status' | 'type' | 'asset'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'Not started', label: 'Not started' },
  { key: 'In progress', label: 'In progress' },
  { key: 'Done', label: 'Done' },
]
const TYPES: ActionType[] = ['Corrective', 'Preventive', 'Proactive']
const TYPE_LABEL: Record<ActionType, string> = { Corrective: 'Corrective', Preventive: 'Preventive', Proactive: 'Pro-active' }
const PRIORITIES: ActionPriority[] = ['Critical', 'High', 'Medium']
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'due', label: 'Due date' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
  { key: 'asset', label: 'Asset' },
]
const RANK = {
  priority: { Critical: 0, High: 1, Medium: 2 } as Record<ActionPriority, number>,
  status: { 'Not started': 0, 'In progress': 1, Done: 2 } as Record<ActionStatus, number>,
  type: { Corrective: 0, Preventive: 1, Proactive: 2 } as Record<ActionType, number>,
}

interface Row {
  tag: string
  /** posisi action di daftar CAPA aset (id CAPA tidak unik antar tipe, jadi pakai indeks) */
  index: number
  action: CapaAction
}

const matchesStatus = (a: CapaAction, f: StatusFilter) => f === 'all' || (f === 'open' ? a.status !== 'Done' : a.status === f)

/** Pusat seluruh CAPA dari semua problem, pada tanggal replay. */
export default function AllActions() {
  const { asOf } = useAsOf()
  const { can, viewOnly } = useRole()
  const canEdit = can('editCapa')
  const [params, setParams] = useSearchParams()
  const assetParam = params.get('asset') ?? ''

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<'' | ActionType>('')
  const [owner, setOwner] = useState('')
  const [priority, setPriority] = useState<'' | ActionPriority>('')
  const [sort, setSort] = useState<SortKey>('due')
  const [version, setVersion] = useState(0)

  // Hanya CAPA dari laporan RCA yang sudah terbit pada tanggal replay (sama seperti Urgent Actions)
  const scope = useMemo(() => assets.filter((a) => a.rca && a.rca.dateReported <= asOf), [asOf])
  const store = useMemo(
    () => Object.fromEntries(scope.map((a) => [a.tag, readCapa(a.tag, buildActionCase(a, asOf)?.actions ?? [])])),
    // version: baca ulang setelah status diubah
    [scope, asOf, version],
  )
  const allRows: Row[] = scope.flatMap((a) => store[a.tag].actions.map((action, index) => ({ tag: a.tag, index, action })))
  const owners = [...new Set(allRows.map((r) => r.action.owner))].sort()

  const setAsset = (tag: string) => {
    const next = new URLSearchParams(params)
    if (tag) next.set('asset', tag)
    else next.delete('asset')
    setParams(next, { replace: true })
  }

  const q = query.trim().toLowerCase()
  const matchesQuery = (r: Row) =>
    !q || [r.action.title, r.action.ref, r.action.owner, r.tag, assetByTag(r.tag)?.name ?? ''].some((f) => f.toLowerCase().includes(q))
  const countWhere = (pred: (r: Row) => boolean) => String(allRows.filter(pred).length)

  const filtered = allRows.filter(
    (r) =>
      matchesQuery(r) &&
      (!assetParam || r.tag === assetParam) &&
      (!type || r.action.type === type) &&
      (!owner || r.action.owner === owner) &&
      (!priority || r.action.priority === priority),
  )
  const rows = filtered.filter((r) => matchesStatus(r.action, status))
  rows.sort((x, y) => {
    const byDue = x.action.due.localeCompare(y.action.due)
    if (sort === 'priority') return RANK.priority[x.action.priority] - RANK.priority[y.action.priority] || byDue
    if (sort === 'status') return RANK.status[x.action.status] - RANK.status[y.action.status] || byDue
    if (sort === 'type') return RANK.type[x.action.type] - RANK.type[y.action.type] || byDue
    if (sort === 'asset') return x.tag.localeCompare(y.tag) || byDue
    return byDue
  })

  const overdue = (a: CapaAction) => a.status !== 'Done' && a.due < asOf
  const openCount = allRows.filter((r) => r.action.status !== 'Done').length
  const overdueCount = allRows.filter((r) => overdue(r.action)).length

  const updateStatus = (r: Row, next: ActionStatus) => {
    const cur = store[r.tag]
    writeCapa(r.tag, { ...cur, actions: cur.actions.map((a, i) => (i === r.index ? { ...a, status: next } : a)) })
    setVersion((v) => v + 1)
  }

  const contextAsset = assetByTag(assetParam)
  const contextInScope = scope.some((a) => a.tag === assetParam)
  const anyFilter = !!(q || assetParam || type || owner || priority || status !== 'all')

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">Action &amp; Reliability</h1>
        <p className="text-[15px] text-ink-2">All CAPA actions across problems, as of {fmtDate(asOf)}</p>
        <p className="mt-2 text-[13.5px] text-ink-2 tabular">
          <span className="font-medium text-ink">{allRows.length}</span> actions from {scope.length} RCA report{scope.length === 1 ? '' : 's'} ·{' '}
          <span className="font-medium text-ink">{openCount}</span> open ·{' '}
          <span className={clsx('font-medium', overdueCount ? 'text-critical' : 'text-ink')}>{overdueCount}</span> overdue
        </p>
      </div>

      {contextAsset && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-4 py-3 text-[14px]">
          <p className="text-ink-2">
            Showing actions for <Mono className="font-semibold text-ink">{contextAsset.tag}</Mono> ({contextAsset.name})
            {!contextInScope && contextAsset.rca && <>. No CAPA has been issued at this replay date (RCA reported {fmtDate(contextAsset.rca.dateReported)}).</>}
          </p>
          <div className="flex items-center gap-4">
            {contextAsset.rca && (
              <Link to={`/actions/${contextAsset.tag}`} className="flex items-center gap-1 font-medium text-navy-700 hover:underline">
                Reliability loop for {contextAsset.tag} <ArrowRight className="size-4" />
              </Link>
            )}
            <button onClick={() => setAsset('')} className="flex items-center gap-1 text-ink-2 hover:text-ink">
              <X className="size-4" /> Show all actions
            </button>
          </div>
        </div>
      )}

      <label className="flex h-11 items-center gap-3 rounded-[7px] border border-slate-300 bg-white px-4 focus-within:border-info focus-within:ring-2 focus-within:ring-info/10">
        <Search className="size-[18px] shrink-0 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions, RC reference, asset, or owner…"
          className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3"
          aria-label="Search actions"
        />
        {query && (
          <button onClick={() => setQuery('')} className="rounded p-0.5 text-ink-3 hover:bg-slate-100 hover:text-ink" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </label>

      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-[10px] border-b border-line px-5 py-4">
          <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={status === t.key}
                onClick={() => setStatus(t.key)}
                className={clsx('rounded-md px-3 py-1 text-[13.5px]', status === t.key ? 'bg-navy-800 text-white' : 'text-ink-2 hover:bg-slate-100 hover:text-ink')}
              >
                {t.label} <span className="tabular opacity-70">{filtered.filter((r) => matchesStatus(r.action, t.key)).length}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchSelect
              label="Asset"
              value={assetParam}
              onChange={setAsset}
              placeholder="Search assets…"
              className="w-[150px]"
              options={[
                { value: '', label: 'All assets', hint: String(allRows.length) },
                ...assets.map((a) => ({ value: a.tag, label: a.tag, hint: countWhere((r) => r.tag === a.tag) })),
              ]}
            />
            <SearchSelect
              label="Type"
              value={type}
              onChange={(v) => setType(v as '' | ActionType)}
              placeholder="Search types…"
              className="w-[140px]"
              options={[
                { value: '', label: 'All types' },
                ...TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t], hint: countWhere((r) => r.action.type === t) })),
              ]}
            />
            <SearchSelect
              label="Owner"
              value={owner}
              onChange={setOwner}
              placeholder="Search owners…"
              className="w-[140px]"
              options={[{ value: '', label: 'All owners' }, ...owners.map((o) => ({ value: o, label: o, hint: countWhere((r) => r.action.owner === o) }))]}
            />
            <SearchSelect
              label="Priority"
              value={priority}
              onChange={(v) => setPriority(v as '' | ActionPriority)}
              placeholder="Search priorities…"
              className="w-[140px]"
              options={[
                { value: '', label: 'All priorities' },
                ...PRIORITIES.map((p) => ({ value: p, label: p, hint: countWhere((r) => r.action.priority === p) })),
              ]}
            />
            <SearchSelect
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              placeholder="Search sort options…"
              className="w-[160px]"
              align="right"
              options={SORTS.map((o) => ({ value: o.key, label: `Sort: ${o.label}` }))}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[13px] text-ink-2">
                <th className="w-[34%] px-5 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Asset / problem</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Priority</th>
                <th className="px-3 py-2.5 font-medium">Due date</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const a = r.action
                const asset = assetByTag(r.tag)
                return (
                  <tr key={`${r.tag}-${r.index}`} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="leading-snug text-ink">{a.title}</p>
                      <Mono className="mt-0.5 block text-[12px] text-ink-3">{a.ref}</Mono>
                    </td>
                    <td className="px-3 py-3">
                      <span className={clsx('whitespace-nowrap rounded px-2 py-0.5 text-[13px]', TYPE_STYLE[a.type])}>{TYPE_LABEL[a.type]}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/actions/${r.tag}`} className="font-mono text-[13px] font-semibold text-navy-700 hover:underline">
                        {r.tag}
                      </Link>
                      <p className="text-[12.5px] text-ink-2">{asset?.name}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{a.owner}</td>
                    <td className="px-3 py-3">
                      <span className={clsx('rounded px-2 py-0.5 text-[13px]', PRIORITY_STYLE[a.priority])}>{a.priority}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Mono className={clsx('text-[13px]', overdue(a) ? 'font-semibold text-critical' : 'text-ink')}>{formatDue(a.due)}</Mono>
                      {overdue(a) && <span className="block text-[12px] text-critical">Overdue</span>}
                    </td>
                    <td className="px-5 py-3">
                      {canEdit ? (
                        <label className={clsx('relative inline-flex items-center rounded text-[13.5px]', STATUS_STYLE[a.status])}>
                          <select
                            value={a.status}
                            onChange={(e) => updateStatus(r, e.target.value as ActionStatus)}
                            className="cursor-pointer appearance-none bg-transparent py-0.5 pl-2 pr-6 outline-none"
                            aria-label={`Status of ${a.title}`}
                          >
                            {(['Not started', 'In progress', 'Done'] as const).map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" />
                        </label>
                      ) : (
                        <span className={clsx('inline-block whitespace-nowrap rounded px-2 py-0.5 text-[13.5px]', STATUS_STYLE[a.status])} title={viewOnly}>
                          {a.status}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-12 text-center text-[14px] text-ink-3">
            {allRows.length === 0 ? 'No CAPA actions have been issued at this replay date.' : 'No actions match these filters.'}
            {anyFilter && allRows.length > 0 && (
              <button
                onClick={() => {
                  setQuery('')
                  setStatus('all')
                  setType('')
                  setOwner('')
                  setPriority('')
                  setAsset('')
                }}
                className="ml-2 font-medium text-navy-700 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
