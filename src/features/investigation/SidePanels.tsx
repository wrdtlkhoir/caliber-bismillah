import clsx from 'clsx'
import { AudioWaveform, Banknote, CircleAlert, Cog, GitFork, Maximize2, Minimize2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import type { ImpactStep, Investigation } from '@/data/investigation'
import { TONE_TEXT } from './ParameterCard'

/* ---------- What Changed? — Benchmark ---------- */

export function BenchmarkPanel({ inv, value, digits }: { inv: Investigation; value: number; digits: number }) {
  const [open, setOpen] = useState(true)
  const b = inv.benchmark
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / b.scaleMax) * 100))}%`

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-medium leading-snug text-ink">What Changed? — {b.title}</h2>
        <button onClick={() => setOpen((v) => !v)} className="rounded p-1 text-ink-2 hover:bg-slate-100" aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open}>
          {open ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </header>

      {open && (
        <div className="animate-fade-up">
          <div className="relative mt-10">
            <div className="relative h-7 rounded bg-slate-100">
              <div
                className="absolute inset-y-0 flex items-center justify-center rounded bg-good-soft text-[11.5px] text-good"
                style={{ left: pct(b.normal[0]), width: `calc(${pct(b.normal[1])} - ${pct(b.normal[0])})` }}
              >
                <span className="whitespace-nowrap px-1">Normal ({b.normal[0]}–{b.normal[1]})</span>
              </div>
              <div className="absolute inset-y-0 w-0.5 bg-medium" style={{ left: pct(b.alarm) }} />
              <div className="absolute -inset-y-1 w-0.5 bg-navy-900" style={{ left: pct(b.failure.value) }} />
              {/* Pin nilai saat ini */}
              <div className="absolute -top-7 -translate-x-1/2 transition-[left] duration-500" style={{ left: pct(value) }}>
                <Mono className="block rounded bg-critical px-1.5 py-0.5 text-[11.5px] font-semibold text-white">{value.toFixed(digits)}</Mono>
                <span className="mx-auto block size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-critical" />
              </div>
            </div>
            <div className="mt-2 flex justify-between gap-2 font-mono text-[11.5px]">
              <span className="text-ink-3">0 {b.unit}</span>
              <span className="font-medium text-[#b7860b]">Alarm {b.alarm}</span>
              <span className="font-medium text-ink">
                {b.failure.label} ({b.failure.value})
              </span>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-line border-t border-line text-[14.5px]">
            {b.rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink">{r.label}</dt>
                <dd className={clsx('text-right font-mono text-[12.5px] font-semibold', r.tone ? TONE_TEXT[r.tone] : 'text-ink')}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  )
}

/* ---------- Impact Translation & Risk ---------- */

const STEP_META: Record<ImpactStep['kind'], { icon: LucideIcon; ring: string; head: string }> = {
  sensor: { icon: AudioWaveform, ring: 'bg-medium-soft text-[#b7860b]', head: 'text-ink' },
  health: { icon: Cog, ring: 'bg-high-soft text-high', head: 'text-ink' },
  hazard: { icon: CircleAlert, ring: 'bg-critical-soft text-critical', head: 'text-critical' },
  financial: { icon: Banknote, ring: 'bg-navy-900 text-white', head: 'text-ink' },
}

export function ImpactPanel({ steps }: { steps: ImpactStep[] }) {
  return (
    <Card className="p-5">
      <header className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="text-[17px] font-medium text-ink">Impact Translation &amp; Risk</h2>
        <GitFork className="size-4 text-ink-2" />
      </header>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => {
          const m = STEP_META[s.kind]
          const Icon = m.icon
          return (
            <li key={s.kind} className="relative flex gap-3">
              {i < steps.length - 1 && <span className="absolute left-[11px] top-7 h-[calc(100%-4px)] w-px bg-line" aria-hidden />}
              <span className={clsx('relative grid size-6 shrink-0 place-items-center rounded-full', m.ring)}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-2">
                  Step {i + 1} · {s.title}
                </p>
                <p className={clsx('text-[15px] font-medium leading-snug', m.head)}>{s.headline}</p>
                <p className={clsx('text-[13px]', s.kind === 'health' ? 'text-teal' : 'text-ink-2')}>{s.detail}</p>
                {s.note && <Mono className="mt-1 block text-[11.5px] text-ink-3">{s.note}</Mono>}
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

/* ---------- Data Confidence Score ---------- */

export function ConfidencePanel({ c }: { c: Investigation['confidence'] }) {
  const level = c.pct >= 85 ? 'HIGH' : c.pct >= 70 ? 'MEDIUM' : 'LOW'
  return (
    <Card className="p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-[12.5px] font-medium uppercase tracking-wide text-ink-2">Data Confidence Score</h2>
        <Mono className="rounded bg-info-soft px-2 py-0.5 text-[12.5px] font-semibold text-navy-700">
          {level} ({c.pct}%)
        </Mono>
      </header>
      <div className="mt-4 flex gap-1.5">
        {c.segments.map((s) => (
          <div key={s.label} className="group relative flex-1">
            <div className={clsx('h-2 rounded-full', s.ok ? 'bg-navy-700' : 'bg-slate-200')} />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-[11.5px] text-white opacity-0 transition group-hover:opacity-100">
              {s.label}: {s.ok ? 'aligned' : 'missing'}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-snug text-ink">
        {c.note}
        {c.offlineTag && (
          <>
            {' '}
            <Mono className="font-semibold">{c.offlineTag}</Mono> offline (flagged non-critical).
          </>
        )}
      </p>
    </Card>
  )
}
