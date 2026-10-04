import clsx from 'clsx'
import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import type { Asset } from '@/data/dataset'
import { piCovers, piIndexAt, piTimeAt } from '@/lib/analytics'
import { TrendChart } from './TrendChart'

const WINDOW_H = 72
const TICK_MS = 450

const fmtHour = (d: Date) =>
  d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

/**
 * Replay data PI per jam (OSIsoft PI extract). Saat "Live Telemetry" aktif,
 * kursor maju 1 jam setiap tick sehingga kejadian sebelum failure bisa diputar ulang.
 */
export function PiReplay({ asset, asOf, live, onFinished }: { asset: Asset; asOf: string; live: boolean; onFinished: () => void }) {
  const p = asset.production
  const total = p?.running.length ?? 0
  const initial = p ? (piCovers(asset, asOf) ? piIndexAt(asset, asOf) : asOf < p.start ? Math.min(WINDOW_H - 1, total - 1) : total - 1) : 0
  const [cursor, setCursor] = useState(initial)

  useEffect(() => setCursor(initial), [initial])

  useEffect(() => {
    if (!live || !p) return
    const t = setInterval(() => {
      setCursor((c) => {
        if (c >= total - 1) {
          onFinished()
          return c
        }
        return c + 1
      })
    }, TICK_MS)
    return () => clearInterval(t)
  }, [live, p, total, onFinished])

  if (!p) return null

  const from = Math.max(0, cursor - WINDOW_H + 1)
  const idx = Array.from({ length: cursor - from + 1 }, (_, k) => from + k)
  const col = (name: string) => p.values[p.columns.indexOf(name)]
  const tagOf = (name: string) => p.tags[p.columns.indexOf(name)]
  const series = (name: string) => idx.map((i) => ({ label: fmtHour(piTimeAt(asset, i)), value: col(name)?.[i] ?? null }))
  const offMask = idx.map((i) => !p.running[i])
  const running = !!p.running[cursor]

  const vib = col('VIB')
  const typicalVib = tagOf('VIB')?.typicalvalue ?? 10
  const vibNow = vib?.[cursor] ?? 0
  const baselineVib = vib ? [...vib.slice(0, 168)].filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) / Math.min(168, vib.length) : 0
  const vibHigh = vibNow > baselineVib * 1.3

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-medium text-ink">
            <Activity className="size-5 text-teal" /> Hourly PI Telemetry
            {live && <span className="rounded bg-good-soft px-1.5 py-0.5 text-[11.5px] font-medium text-good">Replaying</span>}
          </h2>
          <p className="text-[13px] text-ink-2">
            PI extract {fmtHour(piTimeAt(asset, 0)).slice(0, 6)} to {fmtHour(piTimeAt(asset, total - 1)).slice(0, 6)}. Showing the last {WINDOW_H} h, grey marks RUN_STATUS OFF.
          </p>
        </div>
        <Mono className={clsx('rounded-md px-2.5 py-1 text-[13px] font-semibold', running ? 'bg-slate-100 text-ink' : 'bg-critical-soft text-critical')}>
          {fmtHour(piTimeAt(asset, cursor))} WIB, {running ? 'ON' : 'OFF'}
        </Mono>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
        {p.columns.map((c) => {
          const v = col(c)?.[cursor]
          const t = tagOf(c)
          return (
            <div key={c} className={clsx('rounded-lg px-3 py-2', c === 'VIB' && vibHigh ? 'bg-critical-soft' : 'bg-slate-50')}>
              <dt className="truncate font-mono text-[11px] text-ink-3" title={t?.Description}>
                {p.rawColumns[p.columns.indexOf(c)]}
              </dt>
              <dd className={clsx('font-mono text-[16px] font-semibold', c === 'VIB' && vibHigh ? 'text-critical' : 'text-ink')}>
                {v ?? 'n/a'} <span className="text-[11px] font-normal text-ink-2">{t?.engunits ?? ''}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] text-ink-2">Vibration ({tagOf('VIB')?.engunits}), typical {typicalVib}</p>
          <TrendChart points={series('VIB')} color={vibHigh ? 'critical' : 'navy'} unit={tagOf('VIB')?.engunits ?? ''} digits={2} offMask={offMask} ariaLabel="Hourly vibration" />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] text-ink-2">Plant rate ({tagOf('FEED')?.engunits ?? 'T/H'})</p>
          <TrendChart points={series('RATE')} color="teal" unit="T/H" digits={1} offMask={offMask} ariaLabel="Hourly plant rate" />
        </div>
      </div>
    </Card>
  )
}
