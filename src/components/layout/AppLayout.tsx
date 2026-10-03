import clsx from 'clsx'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 flex-col lg:flex">
        <div className="flex h-[72px] items-center border-b border-r border-line bg-surface px-6">
          <BrandMark />
        </div>
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <div
        className={clsx('fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden', menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setMenuOpen(false)}
      />
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-transform lg:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[72px] items-center bg-surface px-6">
          <BrandMark />
        </div>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          <Topbar onMenu={() => setMenuOpen(true)} />
        </div>
        <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-10 pt-6 lg:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
