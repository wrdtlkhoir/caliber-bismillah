import { Radar } from 'lucide-react'
import { useMemo } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { assets } from '@/data/dataset'
import { backtest } from '@/lib/analytics'
import { fmtDate, useAsOf } from '@/lib/asOf'

/**
 * Backtest: kapan aturan early-warning CALIBER akan menyala dibanding status
 * ALARM di data condition monitoring, untuk setiap failure di dataset.
 */
export function BacktestPanel() {
  const { setAsOf } = useAsOf()
  const rows = useMemo(() => assets.map(backtest).sort((a, b) => a.failureDate.localeCompare(b.failureDate)), [])
  const maxLead = Math.max(...rows.map((r) => r.warningLeadDays ?? 0), 1)
  const avg = (k: 'warningLeadDays' | 'alarmLeadDays') => Math.round(rows.reduce((s, r) => s + (r[k] ?? 0), 0) / rows.length)

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-ink">
            <Radar className="size-5 text-teal" /> Early-Warning Backtest
          </h2>
          <p className="text-[13px] text-ink-2">
            How many days before each recorded failure would CALIBER have raised a warning? Click a row to replay that moment.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg bg-teal-soft px-3 py-1.5 text-right">
            <Mono className="block text-[20px] font-bold text-teal">{avg('warningLeadDays')} d</Mono>
            <span className="text-[11.5px] text-ink-2">avg CALIBER lead</span>
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-right">
            <Mono className="block text-[20px] font-bold text-ink-2">{avg('alarmLeadDays')} d</Mono>
            <span className="text-[11.5px] text-ink-2">avg DCS alarm lead</span>
          </div>
        </div>
      </header>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.tag}>
            <button
              onClick={() => r.firstWarning && setAsOf(r.firstWarning)}
              className="grid w-full grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
              title={`First CALIBER warning ${r.firstWarning ? fmtDate(r.firstWarning) : '—'} · first ALARM ${r.firstAlarm ? fmtDate(r.firstAlarm) : '—'} · failure ${fmtDate(r.failureDate)}`}
            >
              <Mono className="text-[13px] font-semibold text-ink">{r.tag}</Mono>
              <div className="relative h-5">
                <div className="absolute inset-y-1 right-0 rounded-full bg-teal/80" style={{ width: `${((r.warningLeadDays ?? 0) / maxLead) * 100}%` }} />
                <div className="absolute inset-y-[7px] right-0 rounded-full bg-navy-900" style={{ width: `${((r.alarmLeadDays ?? 0) / maxLead) * 100}%` }} />
              </div>
              <Mono className="w-[178px] whitespace-nowrap text-right text-[12px] text-ink-2">
                <span className="font-semibold text-teal">{r.warningLeadDays} d</span> vs {r.alarmLeadDays} d · {fmtDate(r.failureDate, { day: '2-digit', month: 'short' })}
              </Mono>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-teal/80" /> CALIBER early warning (trend + degradation index)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full bg-navy-900" /> First ALARM in condition-monitoring record
        </span>
        <span>Bars end at the failure date.</span>
      </p>
    </Card>
  )
}
