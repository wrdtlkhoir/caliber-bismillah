import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DATA_RANGE } from '@/data/dataset'
import { usePersistentState } from './usePersistentState'

/**
 * "As of" = tanggal replay dataset. Semua halaman menghitung kondisi aset,
 * KPI, dan insiden yang diketahui pada tanggal ini — sehingga dashboard bisa
 * memutar ulang bagaimana degradasi terlihat sebelum failure terjadi.
 */
export const DEFAULT_AS_OF = '2026-04-22'

interface AsOfValue {
  asOf: string
  setAsOf: (d: string) => void
  min: string
  max: string
}

const Ctx = createContext<AsOfValue | null>(null)

export function AsOfProvider({ children }: { children: ReactNode }) {
  const [asOf, setAsOf] = usePersistentState('caliber.asOf', DEFAULT_AS_OF)
  const value = useMemo(() => ({ asOf, setAsOf, min: DATA_RANGE.min, max: DATA_RANGE.max }), [asOf, setAsOf])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAsOf() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAsOf must be used inside AsOfProvider')
  return v
}

export const DAY = 864e5
export const toDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00+07:00`)
export const addDays = (iso: string, days: number) => new Date(toDate(iso).getTime() + days * DAY + 7 * 36e5).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return toDate(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'Asia/Jakarta' })
}
