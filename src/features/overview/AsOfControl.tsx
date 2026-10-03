import clsx from 'clsx'
import { CalendarClock, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { assets } from '@/data/dataset'
import { addDays, daysBetween, fmtDate, useAsOf } from '@/lib/asOf'

/** Kontrol replay: geser tanggal "as of" untuk melihat kondisi plant di masa lalu. */
export function AsOfControl() {
  const { asOf, setAsOf, min, max } = useAsOf()
  const total = daysBetween(min, max)
  const pos = daysBetween(min, asOf)
  const clampDate = (d: string) => (d < min ? min : d > max ? max : d)

  const presets = [...assets]
    .sort((a, b) => a.failureDate.localeCompare(b.failureDate))
    .map((a) => ({ label: `1 wk before ${a.tag} failure`, date: addDays(a.failureDate, -7), tag: a.tag }))

  return (
    <section className="rounded-xl border border-info/20 bg-info-soft/50 px-4 py-3" aria-label="Dataset replay">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-[14px] font-medium text-navy-800">
          <History className="size-4" /> Dataset replay
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setAsOf(clampDate(addDays(asOf, -7)))} className="rounded p-1 text-navy-700 hover:bg-white" aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </button>
          <span className="flex min-w-[150px] items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-mono text-[13px] font-semibold text-navy-900 shadow-card">
            <CalendarClock className="size-3.5 text-teal" /> {fmtDate(asOf)}
          </span>
          <button onClick={() => setAsOf(clampDate(addDays(asOf, 7)))} className="rounded p-1 text-navy-700 hover:bg-white" aria-label="Next week">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={total}
          value={pos}
          onChange={(e) => setAsOf(addDays(min, Number(e.target.value)))}
          className="min-w-[160px] flex-1 accent-navy-700"
          aria-label="As-of date"
        />
        <span className="hidden font-mono text-[11.5px] text-ink-3 xl:inline">
          {fmtDate(min)} – {fmtDate(max)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.tag}
            onClick={() => setAsOf(p.date)}
            className={clsx(
              'rounded-full border px-2.5 py-0.5 text-[12px] transition',
              asOf === p.date ? 'border-navy-800 bg-navy-800 text-white' : 'border-line bg-white text-ink-2 hover:border-slate-300',
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setAsOf(max)}
          className={clsx('rounded-full border px-2.5 py-0.5 text-[12px] transition', asOf === max ? 'border-navy-800 bg-navy-800 text-white' : 'border-line bg-white text-ink-2 hover:border-slate-300')}
        >
          Latest data
        </button>
      </div>
    </section>
  )
}
