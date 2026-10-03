import { Bell, ChevronRight, Menu, Search, User } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { currentUser } from '@/data/plant'
import { NAV } from './Sidebar'

interface Props {
  syncLabel: string
  syncing: boolean
  onSync: () => void
  onMenu: () => void
}

export function Topbar({ syncLabel, syncing, onSync, onMenu }: Props) {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const section = NAV.find((n) => n.to === pathname)?.label ?? 'Plant Intelligence'
  const page = pathname === '/' ? 'Overview' : section

  // Shortcut "/" atau Ctrl+K untuk fokus ke pencarian
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input,textarea,select')
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = params.get('q') ?? ''
  const setQ = (v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set('q', v)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <header className="flex h-[72px] items-center gap-4 border-b border-line bg-surface px-4 lg:px-6">
      <button onClick={onMenu} className="rounded-md p-2 text-ink-2 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>

      <nav className="hidden shrink-0 items-center gap-1.5 text-[15px] md:flex" aria-label="Breadcrumb">
        <span className="text-ink-3">{section === page ? 'CALIBER' : section}</span>
        <ChevronRight className="size-4 text-ink-3" />
        <span className="font-medium text-ink">{page}</span>
      </nav>

      <label className="relative mx-2 flex min-w-0 flex-1 items-center rounded-lg bg-canvas px-3 py-2.5 focus-within:ring-2 focus-within:ring-navy-600/30">
        <Search className="mr-2.5 size-4 shrink-0 text-ink-3" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQ('')}
          placeholder="Search equipment, tags (e.g. KO-3201), incidents..."
          className="w-full min-w-0 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink-3"
          aria-label="Search"
        />
        <kbd className="ml-2 hidden rounded border border-line bg-white px-1.5 font-mono text-[11px] text-ink-3 xl:block">/</kbd>
      </label>

      <button
        onClick={onSync}
        title="Klik untuk sync manual"
        className="hidden shrink-0 items-center gap-2 rounded-full bg-good-soft px-3 py-1.5 font-mono text-[12.5px] text-good transition hover:brightness-95 sm:flex"
      >
        <span className={`size-2 rounded-full bg-good ${syncing ? 'animate-ping' : 'animate-pulse-dot'}`} />
        Real-time (Sync {syncLabel})
      </button>

      <div className="hidden h-8 w-px bg-line sm:block" />

      <button className="relative rounded-md p-2 text-ink-2 hover:bg-slate-100" aria-label={`${currentUser.notifications} notifications`}>
        <Bell className="size-5" />
        <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-critical text-[10px] font-semibold text-white">
          {currentUser.notifications}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[15px] font-medium text-ink">{currentUser.name}</p>
          <p className="text-xs text-ink-3">{currentUser.role}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-navy-900 text-white">
          <User className="size-5" />
        </span>
      </div>
    </header>
  )
}
