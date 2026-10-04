import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildProblems, lifecycleAt, lossParetoAt, operationalIncidentsAt, overviewKpi, PLANT_SCOPE, plantImpactAt, urgentActionsAt } from '@/data/plant'
import type { Period } from '@/data/types'
import { CRITICAL_RISK_THRESHOLD, rankProblems } from '@/lib/ahp'
import { fmtDate, useAsOf } from '@/lib/asOf'
import { useRole } from '@/lib/role'
import { AskCaliber } from '@/features/overview/AskCaliber'
import { HseSection } from '@/features/overview/HseSection'
import { KpiStrip } from '@/features/overview/KpiStrip'
import { LifecyclePipeline } from '@/features/overview/LifecyclePipeline'
import { PERIOD_PRESETS, PeriodSelect } from '@/features/overview/PeriodSelect'
import { PriorityRanking } from '@/features/overview/PriorityRanking'
import { ProblemTank, type SevFilter, type SortKey } from '@/features/overview/ProblemTank'
import { UnitImpactChart } from '@/features/overview/UnitImpactChart'
import { UrgentActions } from '@/features/overview/UrgentActions'

export default function Overview() {
  const { asOf } = useAsOf()
  const { role } = useRole()
  const hseFirst = role === 'HSE Manager'
  const [params, setParams] = useSearchParams()
  const rawQuery = params.get('q') ?? ''
  const q = rawQuery.trim().toLowerCase()
  const setQuery = (v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set('q', v)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const [period, setPeriod] = useState<Period>(PERIOD_PRESETS[2])
  const [filter, setFilter] = useState<SevFilter>('all')
  const [sort, setSort] = useState<SortKey>('ahp')
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; seq: number }>()

  const ranked = useMemo(() => rankProblems(buildProblems(asOf)), [asOf])
  const [pickedId, setSelectedId] = useState<string | null>(null)
  const selectedId = ranked.some((p) => p.id === pickedId) ? pickedId : (ranked[0]?.id ?? null)
  const kpi = useMemo(() => overviewKpi(asOf, period.days), [asOf, period.days])
  const stages = useMemo(() => lifecycleAt(asOf), [asOf])
  const opIncidents = useMemo(() => operationalIncidentsAt(asOf), [asOf])
  const pareto = useMemo(() => lossParetoAt(asOf, period.days), [asOf, period.days])
  const urgent = useMemo(() => urgentActionsAt(asOf), [asOf])

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
  const units = useMemo(() => plantImpactAt(asOf, period.days, [...new Set(ranked.map((p) => p.unitId))]), [asOf, period.days, ranked])
  const threshold = {
    downtimeH: (1.5 * units.reduce((s, u) => s + u.downtimeH, 0)) / (units.length || 1),
    lossK: (1.5 * units.reduce((s, u) => s + u.lossK, 0)) / (units.length || 1),
  }

  /** Pilih masalah dari panel lain (ranking/actions): pastikan kartunya terlihat lalu scroll. */
  const focusProblem = (id: string) => {
    setSelectedId(id)
    setFocus((f) => ({ id, seq: (f?.seq ?? 0) + 1 }))
    const p = ranked.find((r) => r.id === id)
    if (p && filter !== 'all' && p.severity !== filter) setFilter('all')
    if (p && selectedUnit && p.unitId !== selectedUnit) setSelectedUnit(null)
    if (q && !pool.some((r) => r.id === id)) {
      const next = new URLSearchParams(params)
      next.delete('q')
      setParams(next, { replace: true })
    }
    // tunggu Problem Tank pindah ke halaman yang berisi problem ini
    setTimeout(() => document.getElementById(`problem-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
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
          <p className="text-[15px] text-ink-2">What needs attention right now? Operational health &amp; risk hierarchy from the competition dataset</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[12.5px] text-ink-2">
            <span className="size-1.5 rounded-full bg-good" />
            Data as of {fmtDate(asOf)}, {PLANT_SCOPE}
          </span>
          <PeriodSelect period={period} onPeriod={setPeriod} />
        </div>
      </div>

      <KpiStrip kpi={kpi} rangeLabel={period.short} critical={criticalRisk} activeCount={ranked.length} />
      {hseFirst && <HseSection incidents={opIncidents} asOf={asOf} />}
      <LifecyclePipeline stages={stages} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ProblemTank
          pool={pool}
          filter={filter}
          onFilter={setFilter}
          sort={sort}
          onSort={setSort}
          query={rawQuery}
          onQuery={setQuery}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
          onClearFilters={clearFilters}
          focus={focus}
          emptyHint={q ? `No problems match “${q}”${unitName ? ` in ${unitName}` : ''}.` : undefined}
          assistant={
            <AskCaliber
              problem={selected}
              rank={selected ? ranked.indexOf(selected) + 1 : 0}
              total={ranked.length}
              action={urgent.all.find((a) => a.problemId === selectedId)}
            />
          }
        />

        <aside className="space-y-6 xl:sticky xl:top-[96px] xl:self-start">
          <PriorityRanking
            ranked={pool}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={focusProblem}
            onHover={setHoveredId}
            pareto={pareto}
            periodLabel={period.label.startsWith('Last') ? period.label.toLowerCase() : period.label}
          />
          <UrgentActions actions={urgent.items} total={urgent.total} onSelect={focusProblem} />
        </aside>
      </div>

      <UnitImpactChart
        units={units}
        problems={ranked}
        threshold={threshold}
        period={period}
        selectedUnit={selectedUnit}
        onSelectUnit={(id) => {
          setSelectedUnit(id)
          if (id) document.getElementById('problem-tank')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      {!hseFirst && <HseSection incidents={opIncidents} asOf={asOf} />}
    </div>
  )
}
