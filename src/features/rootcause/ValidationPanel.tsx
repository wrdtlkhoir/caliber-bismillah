import clsx from 'clsx'
import { ArrowRight, BadgeCheck, FilePlus2, ListPlus, RotateCcw, UserCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { Hypothesis } from '@/data/rootCause'
import { useRole } from '@/lib/role'
import type { HypothesisDecision } from '@/lib/useDecision'

type Action = 'accept' | 'modify' | 'evidence' | 'reject' | 'undo'

interface Props {
  h: Hypothesis
  decision?: HypothesisDecision
  acceptedId?: string
  placeholder: string
  onAction: (action: Action, justification: string) => void
}

export function ValidationPanel({ h, decision, acceptedId, placeholder, onAction }: Props) {
  const { id: problemId } = useParams()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { can, viewOnly } = useRole()
  const locked = !can('validateRootCause')
  const lockTitle = locked ? viewOnly : undefined

  const run = (action: Action) => {
    if ((action === 'reject' || action === 'modify') && !text.trim()) {
      setError(action === 'reject' ? 'Justification is required to reject a hypothesis.' : 'Describe the modified diagnosis in the remarks field.')
      return
    }
    setError(null)
    onAction(action, text.trim())
    setText('')
  }

  const otherAccepted = acceptedId && acceptedId !== h.id

  return (
    <Card className="overflow-hidden border-t-4 border-t-navy-900 p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-navy-900">
          <UserCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-medium text-ink">Engineer Validation</h2>
          <p className="text-[14px] text-ink-2">Final authority and legal plant accountability</p>
        </div>
        <span className={clsx('shrink-0 rounded-full px-3 py-1 text-[13.5px] font-medium', acceptedId ? 'bg-good-soft text-good' : 'bg-high-soft text-high')}>
          {acceptedId ? 'Decision Recorded' : 'Action Required'}
        </span>
      </header>

      {decision === 'accepted' ? (
        <div className="mt-5 animate-fade-up rounded-lg border border-good/30 bg-good-soft p-4">
          <p className="flex items-center gap-2 font-medium text-good">
            <BadgeCheck className="size-5" /> {h.id} accepted as validated root cause
          </p>
          <p className="mt-1 text-[14px] text-ink">{h.title}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/actions/${problemId}`} className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-[14.5px] font-medium text-white hover:bg-navy-700">
              Proceed to Action Plan <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => run('undo')}
              disabled={locked}
              title={lockTitle}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <RotateCcw className="size-4" /> Revoke decision
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => run('accept')}
              disabled={locked || decision === 'rejected' || !!otherAccepted}
              title={lockTitle}
              className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-3 py-3 text-[15.5px] font-medium text-white transition hover:bg-navy-800 disabled:opacity-40"
            >
              <BadgeCheck className="size-5" /> Accept {h.id}
            </button>
            <button
              onClick={() => run('modify')}
              disabled={locked}
              title={lockTitle}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-3 text-[15.5px] font-medium text-navy-900 transition hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
            >
              <ListPlus className="size-5" /> Modify Diagnosis
            </button>
            <button
              onClick={() => run('evidence')}
              disabled={locked}
              title={lockTitle}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-3 text-[15.5px] font-medium text-navy-900 transition hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
            >
              <FilePlus2 className="size-5" /> Request Evidence
            </button>
            {decision === 'rejected' ? (
              <button
                onClick={() => run('undo')}
                disabled={locked}
                title={lockTitle}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-3 text-[15.5px] font-medium text-ink-2 transition hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
              >
                <RotateCcw className="size-5" /> Restore {h.id}
              </button>
            ) : (
              <button
                onClick={() => run('reject')}
                disabled={locked}
                title={lockTitle}
                className="flex items-center justify-center gap-2 rounded-lg bg-critical-soft px-3 py-3 text-[15.5px] font-medium text-critical transition hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100"
              >
                <X className="size-5" /> Reject Hypothesis
              </button>
            )}
          </div>
          {locked && <p className="mt-2 text-[13px] text-ink-2">{viewOnly}. Root-cause validation is done by the Reliability Engineer.</p>}
          {otherAccepted && <p className="mt-2 text-[13px] text-ink-2">{acceptedId} is already accepted. Revoke it first to accept {h.id}.</p>}

          <label className="mt-5 block text-[14px] text-ink" htmlFor="justification">
            Engineering Justification &amp; Field Remarks:
          </label>
          <textarea
            id="justification"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            rows={3}
            disabled={locked}
            placeholder={locked ? viewOnly : placeholder}
            className={clsx(
              'mt-2 w-full resize-y rounded-lg border bg-slate-50 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:bg-white focus:ring-2 focus:ring-navy-600/20 disabled:cursor-not-allowed',
              error ? 'border-critical' : 'border-transparent',
            )}
          />
          {error && <p className="mt-1 text-[13px] text-critical">{error}</p>}
        </>
      )}
    </Card>
  )
}

export type { Action as ValidationAction }
