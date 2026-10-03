import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { ActionPriority, ActionType, CapaAction } from '@/data/actions'

const field = 'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[14.5px] text-ink outline-none focus:ring-2 focus:ring-navy-600/20'

export function AddActionModal({ open, onClose, onAdd, nextId }: { open: boolean; onClose: () => void; onAdd: (a: CapaAction) => void; nextId: string }) {
  const [form, setForm] = useState({
    title: '',
    type: 'Corrective' as ActionType,
    owner: '',
    team: '',
    due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    priority: 'High' as ActionPriority,
    criteria: '',
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.owner.trim()) return
    onAdd({
      id: nextId,
      title: form.title.trim(),
      ref: `WO-${new Date().getFullYear()}-${Math.floor(9000 + Math.random() * 999)}`,
      team: form.team.trim() || 'Reliability',
      type: form.type,
      owner: form.owner.trim(),
      due: form.due,
      priority: form.priority,
      status: 'Not started',
      criteria: form.criteria.trim() || '—',
    })
    setForm((f) => ({ ...f, title: '', owner: '', team: '', criteria: '' }))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Action Item" subtitle="A work order reference is generated automatically." className="max-w-xl">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="text-[13.5px] text-ink-2 sm:col-span-2">
          Action item *
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={field} placeholder="e.g. Verify cooler water-side pressure" />
        </label>
        <label className="text-[13.5px] text-ink-2">
          Type
          <select value={form.type} onChange={(e) => set('type', e.target.value as ActionType)} className={field}>
            <option>Corrective</option>
            <option>Preventive</option>
            <option>Proactive</option>
          </select>
        </label>
        <label className="text-[13.5px] text-ink-2">
          Priority
          <select value={form.priority} onChange={(e) => set('priority', e.target.value as ActionPriority)} className={field}>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
          </select>
        </label>
        <label className="text-[13.5px] text-ink-2">
          Owner *
          <input required value={form.owner} onChange={(e) => set('owner', e.target.value)} className={field} placeholder="e.g. M. Irfan" />
        </label>
        <label className="text-[13.5px] text-ink-2">
          Team
          <input value={form.team} onChange={(e) => set('team', e.target.value)} className={field} placeholder="e.g. Maint Mech" />
        </label>
        <label className="text-[13.5px] text-ink-2">
          Due date
          <input type="date" value={form.due} onChange={(e) => set('due', e.target.value)} className={field} />
        </label>
        <label className="text-[13.5px] text-ink-2 sm:col-span-2">
          Verification criteria
          <input value={form.criteria} onChange={(e) => set('criteria', e.target.value)} className={field} placeholder="How do we know it worked?" />
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[14.5px] text-ink-2 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-navy-800 px-4 py-2 text-[14.5px] font-medium text-white hover:bg-navy-700">
            Add action
          </button>
        </div>
      </form>
    </Modal>
  )
}
