import clsx from 'clsx'
import { ArrowRight, Maximize, Workflow } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import type { PathNode } from '@/data/rootCause'

const TONE: Record<PathNode['tone'], { box: string; kind: string; title: string; dot: string }> = {
  default: { box: 'bg-slate-50 border-transparent', kind: 'text-ink-2', title: 'text-ink', dot: 'bg-navy-700' },
  critical: { box: 'bg-critical-soft border-critical/10', kind: 'text-critical', title: 'text-critical font-mono', dot: 'bg-critical' },
  verified: { box: 'bg-teal-soft border-teal/10', kind: 'text-teal', title: 'text-navy-800 font-mono', dot: 'bg-teal' },
  action: { box: 'bg-good-soft border-good/10', kind: 'text-good', title: 'text-ink', dot: 'bg-good' },
}

function NodeCard({ n, className }: { n: PathNode; className?: string }) {
  const t = TONE[n.tone]
  return (
    <div className={clsx('rounded-xl border px-4 py-3', t.box, className)}>
      <div className="flex items-center justify-between gap-3">
        <span className={clsx('text-[13px]', t.kind)}>{n.kind}</span>
        {n.badge ? <Mono className="text-[11.5px] text-teal">{n.badge}</Mono> : <span className={clsx('size-2 rounded-full', t.dot)} />}
      </div>
      <p className={clsx('mt-1.5 whitespace-nowrap text-[17px] font-semibold', t.title, n.title.startsWith('KO') && 'font-mono')}>{n.title}</p>
      <p className={clsx('mt-0.5 whitespace-nowrap text-[13.5px]', n.tone === 'critical' ? 'font-mono text-ink' : 'text-ink-2')}>{n.sub}</p>
    </div>
  )
}

export function KnowledgePath({ path }: { path: PathNode[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-[19px] font-medium text-ink">
            <Workflow className="size-5 text-navy-700" />
            Failure Mode Knowledge Path (Ontology &amp; Institutional Memory)
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            Causal graph linking high-frequency telemetry patterns to verified institutional RCA archives and prescriptive corrective actions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Mono className="flex items-center gap-2 text-[13px] text-ink-2">
            <span className="size-2 rounded-full bg-navy-700" /> {path.length} Connected Nodes
          </Mono>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-[14.5px] font-medium text-navy-800 hover:bg-slate-200">
            <Maximize className="size-4" /> Expand Ontology Canvas
          </button>
        </div>
      </header>

      <div className="-mx-1 mt-5 overflow-x-auto px-1 pb-2">
        <ol className="flex min-w-max items-center gap-3">
          {path.map((n, i) => (
            <Fragment key={n.title}>
              {i > 0 && <ArrowRight className="size-5 shrink-0 text-navy-700" aria-hidden />}
              <li>
                <NodeCard n={n} className="min-w-[200px]" />
              </li>
            </Fragment>
          ))}
        </ol>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ontology Canvas" subtitle="Asset → component → failure mode → evidence → institutional memory → prescriptive action" className="max-w-6xl">
        <OntologyCanvas path={path} />
      </Modal>
    </Card>
  )
}

/** Graph zig-zag: node berselang atas/bawah, dihubungkan kurva Bézier. */
function OntologyCanvas({ path }: { path: PathNode[] }) {
  const W = 230
  const GAP = 150
  const width = path.length * GAP + W
  const pos = path.map((_, i) => ({ x: 20 + i * GAP, y: i % 2 ? 190 : 30 }))
  const H = 300
  const NODE_H = 92

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width, height: H }}>
        <svg width={width} height={H} className="absolute inset-0" aria-hidden>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--color-navy-700)" />
            </marker>
          </defs>
          {pos.slice(1).map((p, i) => {
            const a = pos[i]
            const down = p.y > a.y
            const x1 = a.x + W / 2
            const y1 = down ? a.y + NODE_H : a.y
            const x2 = p.x + W / 2
            const y2 = down ? p.y : p.y + NODE_H
            const my = (y1 + y2) / 2
            return (
              <path
                key={i}
                d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                fill="none"
                stroke="var(--color-navy-700)"
                strokeOpacity={0.5}
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            )
          })}
        </svg>
        {path.map((n, i) => (
          <div key={n.title} className="absolute" style={{ left: pos[i].x, top: pos[i].y, width: W }}>
            <NodeCard n={n} className="shadow-card" />
          </div>
        ))}
      </div>
    </div>
  )
}
