import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={clsx('max-h-[90vh] w-full max-w-3xl animate-fade-up overflow-y-auto rounded-xl bg-surface shadow-2xl', className)}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-[13.5px] text-ink-2">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-ink-2 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
