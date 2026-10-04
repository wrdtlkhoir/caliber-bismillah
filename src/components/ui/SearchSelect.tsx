import clsx from 'clsx'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
  /** teks kecil di kanan, mis. jumlah */
  hint?: string
}

interface Props {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  align?: 'left' | 'right'
}

/** Dropdown dengan kotak pencarian (pola yang sama dengan pemilih periode). */
export function SearchSelect({ label, value, options, onChange, placeholder = 'Search…', className, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const q = query.trim().toLowerCase()
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q))
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)))
    inputRef.current?.focus()
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, shown.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && shown[cursor]) {
      e.preventDefault()
      pick(shown[cursor].value)
    }
  }

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={clsx(
          'flex h-9 w-full items-center gap-2 rounded-[7px] border bg-white pl-3 pr-2.5 text-left text-[13.5px] text-ink hover:border-slate-400',
          open ? 'border-info' : 'border-slate-300',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label ?? label}</span>
        <ChevronDown className={clsx('size-4 shrink-0 text-ink-2 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={clsx('absolute z-30 mt-1.5 w-60 rounded-lg border border-line bg-white p-1.5 shadow-lg', align === 'right' ? 'right-0' : 'left-0')} onKeyDown={onKey}>
          <label className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 focus-within:border-info">
            <Search className="size-4 shrink-0 text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
              }}
              placeholder={placeholder}
              className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
              aria-label={`Search ${label.toLowerCase()}`}
            />
          </label>
          <ul ref={listRef} role="listbox" aria-label={label} className="mt-1.5 max-h-64 overflow-y-auto">
            {shown.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setCursor(i)}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px]',
                    i === cursor ? 'bg-slate-100 text-ink' : 'text-ink',
                    o.value === value && 'font-medium text-navy-800',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-[12px] text-ink-3 tabular">{o.hint}</span>}
                  <Check className={clsx('size-4 shrink-0', o.value === value ? 'text-navy-700' : 'invisible')} />
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2.5 py-3 text-center text-[13px] text-ink-3">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
