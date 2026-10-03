import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { Mono } from '@/components/ui/Card'
import type { ActionPriority, ActionStatus, ActionType, CapaAction } from '@/data/actions'

const TYPE: Record<ActionType, string> = {
  Corrective: 'bg-info-soft text-navy-700',
  Preventive: 'bg-teal-soft text-teal',
  Proactive: 'bg-good-soft text-good',
}

const PRIORITY: Record<ActionPriority, string> = {
  Critical: 'bg-critical-soft text-critical',
  High: 'bg-high-soft text-high',
  Medium: 'bg-slate-100 text-ink',
}

const STATUS: Record<ActionStatus, string> = {
  Done: 'bg-good-soft text-good',
  'In progress': 'bg-info-soft text-navy-700',
  'Not started': 'bg-slate-100 text-ink-2',
}

export const initials = (name: string) =>
  name
    .replace(/[^A-Za-z. ]/g, '')
    .split(/[ .]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')

export function formatDue(iso: string) {
  return new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

function isOverdue(a: CapaAction) {
  return a.status !== 'Done' && new Date(`${a.due}T23:59:59+07:00`) < new Date()
}

interface Props {
  actions: CapaAction[]
  highlightId: string | null
  onStatus: (id: string, status: ActionStatus) => void
}

export function CapaTable({ actions, highlightId, onStatus }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] 2xl:min-w-[980px] text-left">
        <thead>
          <tr className="bg-slate-100 text-[15px] text-ink">
            <th className="w-[34%] rounded-l-lg px-4 py-3 font-medium 2xl:w-[24%]">Action item</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Owner</th>
            <th className="px-3 py-3 font-medium">Due date</th>
            <th className="px-3 py-3 font-medium">Priority</th>
            <th className="rounded-r-lg px-3 py-3 font-medium 2xl:rounded-none">Status</th>
            <th className="hidden w-[22%] rounded-r-lg px-4 py-3 font-medium 2xl:table-cell">Verification criteria</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {actions.map((a, i) => (
            <tr
              key={a.id}
              id={`capa-${a.id}`}
              className={clsx('transition-colors duration-700', highlightId === a.id ? 'bg-info-soft' : a.status === 'In progress' && 'bg-slate-50/70')}
            >
              <td className="px-4 py-4">
                <p className="text-[15.5px] leading-snug text-ink">
                  <Mono className="mr-1.5 text-[12px] text-ink-3">#{i + 1}</Mono>
                  {a.title}
                </p>
                <Mono className={clsx('mt-1 block text-[12.5px]', a.type === 'Preventive' ? 'text-teal' : 'text-ink-2')}>
                  {a.ref} · {a.team}
                </Mono>
                <p className="mt-1.5 text-[12.5px] text-ink-2 2xl:hidden">
                  <span className="font-medium text-ink">Verify:</span> {a.criteria}
                </p>
              </td>
              <td className="px-3 py-4">
                <span className={clsx('rounded px-2 py-0.5 text-[14px]', TYPE[a.type])}>{a.type}</span>
              </td>
              <td className="px-3 py-4">
                <span className="flex items-center gap-2 whitespace-nowrap text-[15px] text-ink">
                  <span className="grid size-7 place-items-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">{initials(a.owner)}</span>
                  {a.owner}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4">
                <Mono className={clsx('text-[13.5px]', isOverdue(a) ? 'font-semibold text-critical' : 'text-ink')}>{formatDue(a.due)}</Mono>
                {isOverdue(a) && <span className="block text-[12px] text-critical">Overdue</span>}
              </td>
              <td className="px-3 py-4">
                <span className={clsx('rounded px-2 py-0.5 text-[14px]', PRIORITY[a.priority])}>{a.priority}</span>
              </td>
              <td className="px-3 py-4">
                <label className={clsx('relative inline-flex items-center rounded text-[14px]', STATUS[a.status])}>
                  <select
                    value={a.status}
                    onChange={(e) => onStatus(a.id, e.target.value as ActionStatus)}
                    className="cursor-pointer appearance-none bg-transparent py-0.5 pl-2 pr-6 outline-none"
                    aria-label={`Status of ${a.title}`}
                  >
                    {(['Not started', 'In progress', 'Done'] as const).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" />
                </label>
              </td>
              <td className="hidden px-4 py-4 font-mono text-[12.5px] leading-relaxed text-ink 2xl:table-cell">{a.criteria}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
