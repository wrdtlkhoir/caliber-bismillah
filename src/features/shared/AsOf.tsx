import clsx from 'clsx'
import { CalendarClock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { Asset } from '@/data/dataset'
import { fmtDate, useAsOf } from '@/lib/asOf'

/** Penanda tanggal replay yang sama di setiap halaman. Klik untuk mengubahnya di Plant Intelligence. */
export function AsOfBadge({ children, className }: { children?: ReactNode; className?: string }) {
  const { asOf } = useAsOf()
  return (
    <Link
      to="/"
      title="Replay date used on every page. Change it on Plant Intelligence."
      className={clsx('inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[12.5px] text-ink-2 hover:bg-slate-200/70', className)}
    >
      <span className="size-1.5 rounded-full bg-good" />
      Data as of {fmtDate(asOf)}
      {children}
    </Link>
  )
}

/**
 * Ditampilkan saat informasi yang diminta belum ada pada tanggal replay (mis. laporan RCA belum terbit),
 * supaya halaman tidak membocorkan data masa depan. Tombol replay hanya memindahkan tanggal, bukan menampilkan isinya.
 */
export function ReplayGate({
  title,
  message,
  availableFrom,
  availableLabel,
  actions,
}: {
  title: string
  message: ReactNode
  availableFrom: string
  availableLabel: string
  actions?: ReactNode
}) {
  const { asOf, setAsOf } = useAsOf()
  return (
    <Card className="flex flex-col items-start gap-3 p-6">
      <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-navy-700">
        <CalendarClock className="size-5" />
      </span>
      <div>
        <h2 className="text-lg font-medium text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-2">{message}</p>
        <p className="mt-2 font-mono text-[12.5px] text-ink-3">
          Replay date {fmtDate(asOf)} · {availableLabel} {fmtDate(availableFrom)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          onClick={() => setAsOf(availableFrom)}
          className="rounded-[7px] bg-navy-800 px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-700"
        >
          Replay to {fmtDate(availableFrom)}
        </button>
        {actions}
      </div>
    </Card>
  )
}

/** Pesan saat laporan RCA belum terbit pada tanggal replay. Tanggal failure hanya disebut kalau sudah lewat. */
export function rcaPendingMessage(a: Asset, asOf: string, what: string) {
  return asOf < a.failureDate
    ? `${a.tag} has not failed at this replay date, so there is no RCA report and no ${what} yet. Follow its early-warning signals in Problem Investigation.`
    : `${a.tag} failed on ${fmtDate(a.failureDate)}. Its RCA report is not available yet at this replay date, so there is no ${what} to show.`
}
