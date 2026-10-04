import clsx from 'clsx'
import { CalendarDays, Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { assets, incidents } from '@/data/dataset'
import type { Period } from '@/data/types'
import { addDays, daysBetween, fmtDate, useAsOf } from '@/lib/asOf'

export const PERIOD_PRESETS: Period[] = [
  { key: '7d', days: 7, label: 'Last 7 days', short: '7d' },
  { key: '30d', days: 30, label: 'Last 30 days', short: '30d' },
  { key: '90d', days: 90, label: 'Last 90 days', short: '90d' },
  { key: '180d', days: 180, label: 'Last 6 months', short: '6m' },
  { key: '365d', days: 365, label: 'Last 12 months', short: '12m' },
]

/** Tanggal insiden paling awal: batas bawah custom range. */
const EARLIEST = incidents.reduce((m, i) => (i.date < m ? i.date : m), incidents[0].date)

export function customPeriod(start: string, end: string): Period {
  const days = daysBetween(start, end) + 1
  return { key: `custom:${start}:${end}`, days, label: `${fmtDate(start)} – ${fmtDate(end)}`, short: `${days}d` }
}

interface Props {
  period: Period
  onPeriod: (p: Period) => void
}

export function PeriodSelect({ period, onPeriod }: Props) {
  const { asOf, setAsOf, min, max } = useAsOf()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [start, setStart] = useState(addDays(asOf, -(period.days - 1)))
  const [end, setEnd] = useState(asOf)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCustomOpen(period.key.startsWith('custom'))
    setStart(addDays(asOf, -(period.days - 1)))
    setEnd(asOf)
    searchRef.current?.focus()
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const replays = [
    ...[...assets]
      .sort((a, b) => a.failureDate.localeCompare(b.failureDate))
      .map((a) => ({ key: a.tag, label: `1 wk before ${a.tag} failure`, date: addDays(a.failureDate, -7) })),
    { key: 'latest', label: 'Latest data', date: max },
  ]

  const q = query.trim().toLowerCase()
  const hit = (s: string) => !q || s.toLowerCase().includes(q)
  const presets = PERIOD_PRESETS.filter((p) => hit(p.label) || hit(p.short))
  const replayHits = replays.filter((r) => hit(r.label) || hit(fmtDate(r.date)))
  const showCustom = hit('custom range') || hit('date')

  const pick = (p: Period) => {
    onPeriod(p)
    setOpen(false)
  }
  const validCustom = start >= EARLIEST && end >= min && end <= max && start <= end

  const option = (selected: boolean) =>
    clsx('flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[14px] transition', selected ? 'bg-info-soft text-navy-800' : 'text-ink hover:bg-slate-50')

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 min-w-[260px] items-center gap-2.5 rounded-[7px] border border-slate-300 bg-white px-3 text-[14px] text-ink transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-600/20"
      >
        <CalendarDays className="size-4 shrink-0 text-ink-2" />
        <span className="flex-1 text-left">
          {period.label}
          {!period.key.startsWith('custom') && <span className="text-ink-2"> to {fmtDate(asOf)}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-2" />
      </button>

      {open && (
        <div role="dialog" aria-label="Select period" className="absolute right-0 z-30 mt-1.5 w-[320px] rounded-lg border border-line bg-white p-2 shadow-lg">
          <label className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 focus-within:border-info">
            <Search className="size-4 text-ink-3" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search periods or failures…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              aria-label="Search periods"
            />
          </label>

          <div className="mt-2 max-h-[360px] overflow-y-auto">
            {presets.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-1.5 text-[12.5px] font-medium text-ink-3">Period, ending {fmtDate(asOf)}</p>
                {presets.map((p) => (
                  <button key={p.key} onClick={() => pick(p)} className={option(period.key === p.key)}>
                    {p.label}
                    {period.key === p.key && <Check className="size-4" />}
                  </button>
                ))}
              </>
            )}

            {showCustom && (
              <>
                <button onClick={() => setCustomOpen((v) => !v)} className={option(period.key.startsWith('custom'))}>
                  Custom range
                  <ChevronDown className={clsx('size-4 transition', customOpen && 'rotate-180')} />
                </button>
                {customOpen && (
                  <div className="space-y-2 px-2.5 pb-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[12px] text-ink-2">
                        From
                        <input
                          type="date"
                          value={start}
                          min={EARLIEST}
                          max={end}
                          onChange={(e) => setStart(e.target.value)}
                          className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-[13px] text-ink outline-none focus:border-info"
                        />
                      </label>
                      <label className="text-[12px] text-ink-2">
                        To (replay date)
                        <input
                          type="date"
                          value={end}
                          min={min}
                          max={max}
                          onChange={(e) => setEnd(e.target.value)}
                          className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-[13px] text-ink outline-none focus:border-info"
                        />
                      </label>
                    </div>
                    <p className="text-[12px] text-ink-3">
                      Incidents from {fmtDate(EARLIEST)}. End date must be within condition data, {fmtDate(min)} – {fmtDate(max)}.
                    </p>
                    <button
                      disabled={!validCustom}
                      onClick={() => {
                        setAsOf(end)
                        pick(customPeriod(start, end))
                      }}
                      className="w-full rounded-md bg-navy-800 py-1.5 text-[13.5px] font-medium text-white hover:bg-navy-700 disabled:opacity-40"
                    >
                      Apply range
                    </button>
                  </div>
                )}
              </>
            )}

            {replayHits.length > 0 && (
              <>
                <p className="mt-1 border-t border-line px-2.5 pb-1 pt-2.5 text-[12.5px] font-medium text-ink-3">Replay date</p>
                {replayHits.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      setAsOf(r.date)
                      // custom range diganti preset dengan panjang yang sama supaya tetap berakhir di as-of baru
                      if (period.key.startsWith('custom')) onPeriod({ ...period, key: `${period.days}d`, label: `Last ${period.days} days` })
                      setOpen(false)
                    }}
                    className={option(asOf === r.date)}
                  >
                    <span>{r.label}</span>
                    <span className="font-mono text-[12px] text-ink-2">{fmtDate(r.date)}</span>
                  </button>
                ))}
              </>
            )}

            {!presets.length && !showCustom && !replayHits.length && <p className="px-2.5 py-3 text-[13.5px] text-ink-3">No matching period.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
