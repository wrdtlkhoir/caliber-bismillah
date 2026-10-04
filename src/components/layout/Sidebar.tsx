import clsx from 'clsx'
import { BookOpen, ChartSpline, ChevronsUpDown, Database, GitFork, SearchCheck, ShieldCheck, UserCog } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ROLES, useRole, type Role } from '@/lib/role'

export const NAV = [
  { to: '/', label: 'Plant Intelligence', icon: ChartSpline },
  { to: '/investigation', label: 'Problem Investigation', icon: SearchCheck },
  { to: '/root-cause', label: 'Root Cause & Decision', icon: GitFork },
  { to: '/actions', label: 'Action & Reliability', icon: ShieldCheck },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/data-sources', label: 'Data Sources', icon: Database },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, setRole } = useRole()

  return (
    <aside className="flex h-full w-[248px] flex-col bg-navy-800 text-white">
      <nav className="flex-1 space-y-1 pt-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 whitespace-nowrap border-l-[3px] px-4 py-2.5 text-[14.5px] transition-colors',
                isActive
                  ? 'border-teal bg-navy-950/70 text-[16px] font-medium text-white'
                  : 'border-transparent text-white/80 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-lg bg-navy-950/70 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">Operational Role</p>
        <label className="relative mt-2 flex items-center gap-2 rounded-md bg-navy-800 px-2.5 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-teal">
          <UserCog className="size-4 text-teal" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full appearance-none bg-transparent pr-5 outline-none [&>option]:text-ink"
            aria-label="Operational role"
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <ChevronsUpDown className="pointer-events-none absolute right-2 size-3.5 text-white/60" />
        </label>
      </div>
    </aside>
  )
}
