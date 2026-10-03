import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { LayoutContext } from '@/components/layout/AppLayout'
import { kpiByRange, lifecycle, PLANT_SCOPE, problems, thresholds, unitImpact, urgentActions } from '@/data/plant'
import type { TimeRange } from '@/data/types'
import { CRITICAL_RISK_THRESHOLD, rankProblems } from '@/lib/ahp'
import { AskCaliber } from '@/features/overview/AskCaliber'
import { KpiStrip } from '@/features/overview/KpiStrip'
import { LifecyclePipeline } from '@/features/overview/LifecyclePipeline'
import { PriorityRanking } from '@/features/overview/PriorityRanking'
import { ProblemTank, type SevFilter, type SortKey } from '@/features/overview/ProblemTank'
import { UnitImpactChart } from '@/features/overview/UnitImpactChart'
import { UrgentActions } from '@/features/overview/UrgentActions'

const RANGES: { key: TimeRange; label: string }[] = [
  { key: '7d', label: 'Last 7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
]

export default function Overview() {
  const { syncLabel } = useOutletContext<LayoutContext>()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()

  const [range, setRange] = useState<TimeRange>('30d')
  const [filter, setFilter] = useState<SevFilter>('all')
  const [sort, setSort] = useState<SortKey>('ahp')
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const ranked = useMemo(() => rankProblems(problems), [])
  const [selectedId, setSelectedId] = useState<string | null>(ranked[0]?.id ?? null)

  // Pool = hasil pencarian + filter unit (sebelum filter severity tab)
  const pool = useMemo(
    () =>
      ranked.filter(
        (p) =>
          (!selectedUnit || p.unitId === selectedUnit) &&
          (!q || [p.id, p.title, p.area, p.equipment, p.lead].some((f) => f.toLowerCase().includes(q))),
      ),
    [ranked, q, selectedUnit],
  )

  const selected = ranked.find((p) => p.id === selectedId)
  const criticalRisk = ranked.filter((p) => p.ahp >= CRITICAL_RISK_THRESHOLD)
  const units = useMemo(() => unitImpact(range), [range])

  /** Pilih masalah dari panel lain (ranking/actions): pastikan kartunya terlihat lalu scroll. */
  const focusProblem = (id: string) => {
    setSelectedId(id)
    const p = ranked.find((r) => r.id === id)
    if (p && filter !== 'all' && p.severity !== filter) setFilter('all')
    if (p && selectedUnit && p.unitId !== selectedUnit) setSelectedUnit(null)
    if (q && !pool.some((r) => r.id === id)) {
      const next = new URLSearchParams(params)
      next.delete('q')
      setParams(next, { replace: true })
    }
    requestAnimationFrame(() =>
      document.getElementById(`problem-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  const clearFilters = () => {
    setFilter('all')
    setSelectedUnit(null)
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next, { replace: true })
  }

  const unitName = units.find((u) => u.id === selectedUnit)?.name

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-ink">Plant Intelligence</h1>
          <p className="text-[15px] text-ink-2">What needs attention right now? Current operational health &amp; risk hierarchy</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 rounded-md bg-good-soft/60 px-2.5 py-1 font-mono text-[12.5px] text-navy-900">
            <span className="size-1.5 rounded-full bg-good" />
            Synced {syncLabel} · {PLANT_SCOPE}
          </span>
          <div role="radiogroup" aria-label="Time range" className="flex rounded-lg bg-slate-200/70 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="radio"
                aria-checked={range === r.key}
                onClick={() => setRange(r.key)}
                className={clsx(
                  'rounded-md px-3 py-1 text-[15px] transition',
                  range === r.key ? 'bg-white font-medium text-navy-800 shadow-card' : 'text-ink-2 hover:text-ink',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <KpiStrip kpi={kpiByRange[range]} range={range} critical={criticalRisk} activeCount={ranked.length} />
      <LifecyclePipeline stages={lifecycle} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ProblemTank
          pool={pool}
          filter={filter}
          onFilter={setFilter}
          sort={sort}
          onSort={setSort}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
          onClearFilters={clearFilters}
          emptyHint={q ? `No problems match “${q}”${unitName ? ` in ${unitName}` : ''}.` : undefined}
          assistant={
            <AskCaliber
              problem={selected}
              rank={selected ? ranked.indexOf(selected) + 1 : 0}
              total={ranked.length}
              action={urgentActions.find((a) => a.problemId === selectedId)}
            />
          }
        />

        <aside className="space-y-6 xl:sticky xl:top-[96px] xl:self-start">
          <PriorityRanking ranked={pool} selectedId={selectedId} hoveredId={hoveredId} onSelect={focusProblem} onHover={setHoveredId} />
          <UrgentActions actions={urgentActions} onSelect={focusProblem} />
        </aside>
      </div>

      <UnitImpactChart
        units={units}
        problems={problems}
        threshold={thresholds(range)}
        range={range}
        selectedUnit={selectedUnit}
        onSelectUnit={(id) => {
          setSelectedUnit(id)
          if (id) document.getElementById('problem-tank')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />
    </div>
  )
}
