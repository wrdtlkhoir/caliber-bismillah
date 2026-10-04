import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { CONSTRAINT_TYPES, constraintLabel, type ConstraintType, type DecisionConstraint } from '@/lib/constraints'

interface Props {
  constraints: DecisionConstraint[]
  onEdit: () => void
}

/** Ringkasan constraint keputusan; ikon pensil membuka editor. */
export function ConstraintsPanel({ constraints, onEdit }: Props) {
  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-medium text-ink">
            <ShieldAlert className="size-5 text-high" /> Decision constraints
          </h2>
          <p className="text-[13px] text-ink-2">Limits the chosen solution has to respect</p>
        </div>
        <button onClick={onEdit} className="rounded-md p-2 text-navy-700 hover:bg-info-soft" aria-label="Edit constraints" title="Edit constraints">
          <Pencil className="size-4" />
        </button>
      </header>
      {constraints.length ? (
        <ul className="mt-3 space-y-2">
          {constraints.map((c) => (
            <li key={c.id} className="rounded-lg bg-high-soft/50 px-3 py-2 text-[13.5px]">
              <p className="font-medium text-ink">{constraintLabel(c)}</p>
              {c.note && <p className="text-ink-2">{c.note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <button onClick={onEdit} className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-4 text-[13.5px] text-ink-2 transition hover:border-navy-700 hover:text-navy-700">
          No constraints yet. Add downtime window, budget, spares or permit limits.
        </button>
      )}
    </Card>
  )
}

const newId = () => Math.random().toString(36).slice(2, 9)
const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-navy-600/20'

export function ConstraintsEditor({ open, initial, onClose, onSave }: { open: boolean; initial: DecisionConstraint[]; onClose: () => void; onSave: (c: DecisionConstraint[]) => void }) {
  const [rows, setRows] = useState<DecisionConstraint[]>(initial)
  const update = (id: string, patch: Partial<DecisionConstraint>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const add = (type: ConstraintType = 'downtime') => setRows((r) => [...r, { id: newId(), type, value: '', note: '' }])

  return (
    <Modal open={open} onClose={onClose} title="Edit decision constraints" subtitle="Constraints are checked against every proposed solution in the impact report." className="max-w-2xl">
      <div className="space-y-3">
        {rows.map((c) => {
          const t = CONSTRAINT_TYPES[c.type]
          return (
            <div key={c.id} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
              <select value={c.type} onChange={(e) => update(c.id, { type: e.target.value as ConstraintType })} className={field} aria-label="Constraint type">
                {Object.entries(CONSTRAINT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  value={c.value}
                  onChange={(e) => update(c.id, { value: e.target.value })}
                  placeholder={t.placeholder}
                  inputMode={t.unit ? 'decimal' : undefined}
                  className={field}
                  aria-label="Constraint value"
                />
                {t.unit && <span className="shrink-0 text-[13px] text-ink-2">{t.unit}</span>}
              </div>
              <button onClick={() => setRows((r) => r.filter((x) => x.id !== c.id))} className="rounded-md p-2 text-ink-3 hover:bg-critical-soft hover:text-critical" aria-label="Remove constraint">
                <Trash2 className="size-4" />
              </button>
              <input
                value={c.note}
                onChange={(e) => update(c.id, { note: e.target.value })}
                placeholder="Note (optional)"
                className={`${field} sm:col-span-3`}
                aria-label="Constraint note"
              />
            </div>
          )
        })}
        <button onClick={() => add()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-[14px] font-medium text-navy-700 hover:bg-slate-50">
          <Plus className="size-4" /> Add constraint
        </button>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-[14px] text-ink-2 hover:bg-slate-100">
          Cancel
        </button>
        <button
          onClick={() => {
            onSave(rows.filter((r) => r.value.trim()))
            onClose()
          }}
          className="rounded-lg bg-navy-800 px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-700"
        >
          Save constraints
        </button>
      </div>
    </Modal>
  )
}
