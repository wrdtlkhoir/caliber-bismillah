import clsx from 'clsx'
import { Bell, ChevronRight, Menu, Search, User } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import { Link, useLocation, useMatches, useNavigate, useSearchParams } from 'react-router-dom'
import type { RouteHandle } from '@/App'
import { assets } from '@/data/dataset'
import { currentUser } from '@/data/plant'
import { fmtDate, useAsOf } from '@/lib/asOf'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { asOf } = useAsOf()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const matches = useMatches()
  const leaf = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.crumbs)
  const crumbs = leaf ? (leaf.handle as RouteHandle).crumbs(leaf.params) : ['CALIBER']

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

  // Enter: tag persis (mis. KO-3201) langsung buka investigasi; selain itu filter di Overview
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return setQ('')
    if (e.key !== 'Enter' || !q.trim()) return
    const hit = assets.find((a) => a.tag.toLowerCase() === q.trim().toLowerCase())
    if (hit) {
      navigate(`/investigation/${hit.tag}`)
      inputRef.current?.blur()
    } else if (pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(q.trim())}`)
    }
  }

  return (
    <header className="flex h-[72px] items-center gap-4 border-b border-line bg-surface px-4 lg:px-6">
      <button onClick={onMenu} className="rounded-md p-2 text-ink-2 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>

      <nav className="hidden shrink-0 items-center gap-1.5 text-[15px] md:flex" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-4 text-ink-3" />}
            <span
              className={clsx(
                /^[A-Z]{2}-\d/.test(c) ? 'font-mono text-[14px] font-semibold' : i === crumbs.length - 1 && 'font-medium',
                i === crumbs.length - 1 || /^[A-Z]{2}-\d/.test(c) ? 'text-ink' : 'text-ink-3',
              )}
            >
              {c}
            </span>
          </Fragment>
        ))}
      </nav>

      <label className="relative mx-2 flex min-w-0 flex-1 items-center rounded-lg bg-canvas px-3 py-2.5 focus-within:ring-2 focus-within:ring-navy-600/30">
        <Search className="mr-2.5 size-4 shrink-0 text-ink-3" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search equipment, tags (e.g. KO-3201), incidents..."
          className="w-full min-w-0 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink-3"
          aria-label="Search"
        />
        <kbd className="ml-2 hidden rounded border border-line bg-white px-1.5 font-mono text-[11px] text-ink-3 xl:block">/</kbd>
      </label>

      <Link
        to="/"
        title="Dataset replay date. Change it on Plant Intelligence."
        className="hidden shrink-0 items-center gap-2 rounded-full bg-good-soft px-3 py-1.5 font-mono text-[12.5px] text-good transition hover:brightness-95 sm:flex"
      >
        <span className="size-2 animate-pulse-dot rounded-full bg-good" />
        As of {fmtDate(asOf)}
      </Link>

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
