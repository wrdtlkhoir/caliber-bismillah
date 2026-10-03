import clsx from 'clsx'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  Clock,
  Info,
  ListPlus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { actionCases, type ActionCase, type ActionStatus, type CapaAction } from '@/data/actions'
import { investigations, type Investigation } from '@/data/investigation'
import { currentUser, problems } from '@/data/plant'
import { rootCauses } from '@/data/rootCause'
import type { Problem } from '@/data/types'
import { AddActionModal } from '@/features/actions/AddActionModal'
import { CapaTable } from '@/features/actions/CapaTable'
import { VerificationChart } from '@/features/actions/VerificationChart'
import { formatDetected } from '@/features/investigation/AssetSummary'
import { useDecision } from '@/lib/useDecision'
import { usePersistentState } from '@/lib/usePersistentState'

type CapaState = 'open' | 'closed' | 'escalated'

interface PersistedCapa {
  actions: CapaAction[]
  state: CapaState
  reviews: Record<string, string>
}

export default function Actions() {
  const { id } = useParams()
  const problem = problems.find((p) => p.id === id)
  const ac = id ? actionCases[id] : undefined
  const inv = id ? investigations[id] : undefined

  if (!problem || !ac || !inv) return <Navigate to={`/actions/${problems[0].id}`} replace />
  return <ActionsView key={problem.id} problem={problem} ac={ac} inv={inv} />
}

function ActionsView({ problem, ac, inv }: { problem: Problem; ac: ActionCase; inv: Investigation }) {
  const [capa, setCapa] = usePersistentState<PersistedCapa>(`caliber.capa.${problem.id}`, { actions: ac.actions, state: 'open', reviews: {} })
  const { decisions, log } = useDecision(problem.id)
  const [addOpen, setAddOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [toast, showToast] = useToast()

  // Validasi dari Page 3 (kalau engineer sudah Accept) menggantikan data bawaan
  const acceptedId = Object.keys(decisions).find((k) => decisions[k] === 'accepted')
  const acceptedHyp = acceptedId ? rootCauses[problem.id]?.hypotheses.find((h) => h.id === acceptedId) : undefined
  const acceptedLog = [...log].reverse().find((l) => l.text.includes(`accepted ${acceptedId}`))
  const validation = acceptedHyp
    ? { id: ac.validation.id, rootCause: acceptedHyp.title, by: `${currentUser.name} (${currentUser.role})`, at: `Today ${acceptedLog?.time ?? ''} WIB` }
    : ac.validation

  const { actions } = capa
  const openActions = actions.filter((a) => a.status !== 'Done')
  const correctiveDone = actions.filter((a) => a.type === 'Corrective').every((a) => a.status === 'Done')
  const restored = !!ac.verification.after
  const systemic = ac.systemicActionIndex !== undefined ? actions[ac.systemicActionIndex] : undefined

  const workflow = [
    { label: 'Root cause validation', done: true },
    { label: 'Engineering review', done: true },
    { label: 'Maintenance work', done: correctiveDone },
    { label: 'Equipment restart', done: restored },
  ]

  const stages = ['Diagnosis', 'Validated', 'Action', 'Verification', 'Closed']
  const currentStage = capa.state === 'closed' ? 4 : correctiveDone ? 3 : 2

  const setStatus = (id: string, status: ActionStatus) =>
    setCapa((c) => ({ ...c, actions: c.actions.map((a) => (a.id === id ? { ...a, status } : a)) }))

  const viewAction = (id: string) => {
    document.getElementById(`capa-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlight(id)
    setTimeout(() => setHighlight(null), 2200)
  }

  const createReview = (fleetId: string) => {
    const rv = `RV-${fleetId.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`
    setCapa((c) => ({ ...c, reviews: { ...c.reviews, [fleetId]: rv } }))
    showToast(`${rv} created — pro-active review for ${fleetId}`)
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1.5 text-[13.5px] text-ink-2" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ink">Plant</Link> › <span>{inv.unitLabel}</span> ›{' '}
            <Link to={`/investigation/${problem.id}`} className="font-mono hover:text-ink">{problem.id}</Link> ›{' '}
            <span className="text-ink">Action &amp; Reliability Loop</span>
          </nav>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-navy-900">Action &amp; Reliability Loop</h1>
          <p className="text-[16px] text-ink-2">What should we do — and did it actually work?</p>
        </div>
        <p className="flex items-center gap-2 text-[14px] text-ink-2">
          Context Cycle: <Mono className="rounded bg-info-soft px-2 py-1 text-[13px] font-semibold text-navy-800">{ac.contextCycle}</Mono>
        </p>
      </div>

      {/* Asset strip */}
      <Card className="grid items-center gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] 2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Mono className="text-[20px] font-bold text-navy-800">{problem.id}</Mono>
            <span className="rounded bg-info-soft px-2 py-0.5 text-[13.5px] text-navy-700">{inv.assetType}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[13.5px]">
            <span className="rounded bg-high-soft px-2 py-0.5 text-high">{ac.criticality}</span>
            <span className="flex items-center gap-1.5 text-ink">
              <span className={clsx('size-2 rounded-full', restored ? 'bg-good' : 'bg-medium')} /> {ac.conditionText}
            </span>
          </div>
        </div>

        <ol className="flex items-center gap-2 overflow-x-auto border-line py-1 lg:order-last lg:col-span-2 lg:justify-center lg:border-t lg:pt-4 2xl:order-none 2xl:col-span-1 2xl:border-t-0 2xl:pt-1" aria-label="Lifecycle">
          {stages.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span className={clsx('h-0.5 w-10 shrink-0 2xl:w-6', i <= currentStage ? 'bg-navy-800' : 'bg-slate-200')} />}
              <li className="flex shrink-0 items-center gap-2" aria-current={i === currentStage ? 'step' : undefined}>
                <span
                  className={clsx(
                    'grid size-7 place-items-center rounded-full',
                    i < currentStage && 'bg-navy-800 text-white',
                    i === currentStage && 'border-[3px] border-info bg-white ring-4 ring-info-soft',
                    i > currentStage && 'border-2 border-slate-300 bg-white',
                  )}
                >
                  {i < currentStage ? <Check className="size-3.5" strokeWidth={3} /> : i === currentStage && <span className="size-2.5 rounded-full bg-info" />}
                </span>
                <span className={clsx('text-[13.5px]', i === currentStage ? 'font-semibold text-navy-700' : i < currentStage ? 'text-ink' : 'text-ink-3')}>{s}</span>
              </li>
            </Fragment>
          ))}
        </ol>

        <div className="text-right">
          <p className="text-[15px] text-ink">
            Reliability Lead: <span className="font-medium">{problem.lead}</span>
          </p>
          <Mono className="text-[13px] text-ink-2">Detected: {formatDetected(problem.detectedAt)}</Mono>
        </div>
      </Card>

      {/* Validation banner */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl bg-navy-800 px-5 py-4 text-white shadow-card">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10">
          <ShieldCheck className="size-6 text-teal" />
        </span>
        <div className="min-w-0 flex-1 basis-80">
          <p className="text-[12.5px] font-medium uppercase tracking-wide text-white/70">Authoritative human validation</p>
          <p className="text-[18px] font-medium">Validated root cause: {validation.rootCause}</p>
        </div>
        <Mono className="rounded-md bg-white/10 px-3 py-1.5 text-[13px]">{validation.id}</Mono>
        <span className="rounded-md bg-white/10 px-3 py-1.5 text-[13.5px]">
          {validation.by} · {validation.at}
        </span>
      </section>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="CAPA Effectiveness Rate" value={`${ac.kpis.effectiveness.value}%`} badge={<><span aria-hidden>▲</span> {ac.kpis.effectiveness.delta} <span className="text-[12px] font-normal">{ac.kpis.effectiveness.benchmark}</span></>} badgeTone="good" foot="Verified non-recurrence ›90d" />
        <Kpi label="Action Closure Time" value={<>{ac.kpis.closure.value}<span className="ml-1 font-sans text-xl font-normal text-ink-2">d</span></>} badge={<><span aria-hidden>▼</span> {ac.kpis.closure.delta} <span className="text-[12px] font-normal">vs fleet</span></>} badgeTone="info" foot={ac.kpis.closure.benchmark} />
        <Kpi label="Repeat Failure Rate" value={<span className="text-good">{ac.kpis.repeat.value}%</span>} badge={ac.kpis.repeat.badge} badgeTone="good" foot={ac.kpis.repeat.benchmark} />
        <Kpi label="Awaiting Verification" value={<span className="text-high">{ac.kpis.awaiting.value}</span>} badge="Active Watch" badgeTone="high" foot={ac.kpis.awaiting.note} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* CAPA */}
        <Card className="min-w-0 p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[21px] font-medium text-ink">Action Plan (CAPA)</h2>
              <p className="text-[15px] text-ink-2">Structured execution to eliminate immediate risk and systemic recurrence</p>
            </div>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-lg bg-info-soft px-4 py-2 text-[15px] font-medium text-navy-700 hover:brightness-95">
              <ListPlus className="size-4" /> Add Action Item
            </button>
          </header>

          <ol className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-navy-900 px-4 py-3.5">
            {workflow.map((w, i) => (
              <Fragment key={w.label}>
                {i > 0 && <span className="text-white/40">→</span>}
                <li className={clsx('flex items-center gap-1.5 text-[14px]', w.done ? 'text-teal' : 'text-white/60')}>
                  {w.done ? <CircleCheck className="size-4" /> : <Clock className="size-4" />}
                  {i + 1}. {w.label}
                </li>
              </Fragment>
            ))}
          </ol>

          <div className="mt-4">
            <CapaTable actions={actions} highlightId={highlight} onStatus={setStatus} />
          </div>
        </Card>

        {/* Verification */}
        <Card className="flex flex-col p-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[21px] font-medium leading-tight text-ink">Post-Action Verification</h2>
              <p className="mt-1 text-[13.5px] text-ink-2">
                {ac.verification.title}
                <br />— Before vs After
              </p>
            </div>
            <span className={clsx('flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[13px] font-medium', restored ? 'bg-good-soft text-good' : 'bg-medium-soft text-[#b7860b]')}>
              {restored ? <>Condition Restored <Check className="size-3.5" /></> : 'Verification Pending'}
            </span>
          </header>

          <div className="mt-4">
            <VerificationChart v={ac.verification} />
          </div>

          <ul className="mt-4 space-y-2">
            {ac.verification.checks.map((c) => (
              <li key={c.title} className={clsx('flex gap-3 rounded-lg px-3 py-3', c.state === 'done' ? 'bg-good-soft/60' : 'bg-slate-100')}>
                {c.state === 'done' ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-good" /> : <Clock className="mt-0.5 size-5 shrink-0 text-ink-2" />}
                <div>
                  <p className="text-[15px] font-medium text-ink">{c.title}</p>
                  <p className={clsx('text-[13.5px] text-ink-2', c.mono && 'font-mono text-ink')}>{c.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {capa.state === 'open' ? (
              <>
                <button onClick={() => setCloseOpen(true)} className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-[15px] font-medium text-white hover:bg-navy-700">
                  <BadgeCheck className="size-4" /> Close CAPA
                </button>
                <button onClick={() => setEscalateOpen(true)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-critical hover:bg-critical-soft">
                  <RotateCcw className="size-4" /> Reopen / Escalate
                </button>
              </>
            ) : (
              <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2.5">
                <span className={clsx('flex items-center gap-2 text-[14.5px] font-medium', capa.state === 'closed' ? 'text-good' : 'text-critical')}>
                  {capa.state === 'closed' ? <BadgeCheck className="size-4" /> : <TriangleAlert className="size-4" />}
                  {capa.state === 'closed' ? 'CAPA closed' : 'Escalated to Plant Manager'}
                </span>
                <button onClick={() => setCapa((c) => ({ ...c, state: 'open' }))} className="text-[13.5px] font-medium text-navy-700 hover:underline">
                  Reopen
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Systemic warning */}
        {systemic && ac.systemicText && (
          <Card className={clsx('flex flex-col border-l-4 p-5', systemic.status === 'Done' ? 'border-l-good' : 'border-l-navy-900')}>
            <h2 className="flex items-center gap-3 text-[18px] font-medium text-ink">
              {systemic.status === 'Done' ? <CircleCheck className="size-6 text-good" /> : <Info className="size-6 text-ink-2" />}
              {systemic.status === 'Done' ? 'Symptom and system cause addressed' : 'Symptom fixed, system cause still open'}
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              {systemic.status === 'Done' ? `${systemic.title} is complete. Monitor recurrence until the verification window ends.` : ac.systemicText}
            </p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-6 text-[14px]">
              <button onClick={() => viewAction(systemic.id)} className="flex items-center gap-1.5 font-medium text-navy-700 hover:underline">
                View Action #{(ac.systemicActionIndex ?? 0) + 1} ({systemic.team.toLowerCase()} {systemic.status === 'Done' ? 'done' : 'expedite'}) <ArrowRight className="size-4" />
              </button>
              <span className="text-ink-2">Assigned to: {systemic.owner}</span>
            </div>
          </Card>
        )}

        {/* Fleet learning */}
        <Card className={clsx('p-5', !systemic && 'lg:col-span-2')}>
          <header className="flex items-start justify-between gap-3">
            <h2 className="flex items-start gap-3 text-[18px] font-medium text-ink">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
                <Sparkles className="size-5" />
              </span>
              Cross-Equipment Learning — Fleet Vulnerability
            </h2>
            <span className="shrink-0 rounded bg-info-soft px-2 py-1 text-[13px] text-navy-700">AI Intelligence</span>
          </header>
          <p className="mt-2 text-[13.5px] text-ink-2">{ac.fleet.intro}</p>
          <ul className="mt-3 space-y-2">
            {ac.fleet.items.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-[15px] text-ink">
                    <Mono className="font-semibold">{f.id}</Mono> <span className="text-ink-2">({f.name})</span>
                  </p>
                  <p className={clsx('text-[13px]', f.level === 'ELEVATED' ? 'text-critical' : f.level === 'MODERATE' ? 'text-high' : 'text-ink')}>
                    {f.level} · {f.note}
                  </p>
                </div>
                {capa.reviews[f.id] ? (
                  <span className="flex items-center gap-1.5 text-[13.5px] text-good">
                    <Check className="size-4" /> <Mono>{capa.reviews[f.id]}</Mono>
                  </span>
                ) : (
                  <button onClick={() => createReview(f.id)} className="rounded-md bg-white px-3 py-1.5 text-[13.5px] font-medium text-navy-900 shadow-card hover:bg-slate-100">
                    Create Pro-active Review
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Loop footer */}
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 px-5 py-4">
        <ol className="flex flex-wrap items-center gap-2 text-[14px]">
          {['Problem', 'Diagnosis', 'Human Validation', 'Action', 'Outcome'].map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span className="text-ink-3">→</span>}
              <li className="rounded-md bg-white px-2.5 py-1 text-ink shadow-card">{s}</li>
            </Fragment>
          ))}
        </ol>
        <p className="max-w-xl text-right text-[15px] text-ink">
          {capa.state === 'closed'
            ? 'This case is now verified institutional knowledge. RCA model weights and cross-fleet failure priors have been automatically calibrated for future recommendations.'
            : 'Once verified and closed, this case becomes institutional knowledge used to calibrate RCA weights and cross-fleet failure priors.'}
        </p>
      </Card>

      <AddActionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        nextId={`A${actions.length + 1}-${Date.now().toString(36)}`}
        onAdd={(a) => {
          setCapa((c) => ({ ...c, actions: [...c.actions, a] }))
          showToast(`${a.ref} created — ${a.title}`)
        }}
      />

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Close CAPA?" className="max-w-lg">
        {openActions.length > 0 ? (
          <div className="rounded-lg border border-high/30 bg-high-soft p-4 text-[14px] text-ink">
            <p className="flex items-center gap-2 font-medium text-high">
              <TriangleAlert className="size-4" /> {openActions.length} action{openActions.length > 1 ? 's are' : ' is'} still open
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {openActions.map((a) => (
                <li key={a.id}>
                  {a.title} <span className="text-ink-2">({a.status})</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ink-2">Closing now accepts the residual recurrence risk. Recommended: keep the CAPA open until all actions are verified.</p>
          </div>
        ) : (
          <p className="text-[14.5px] text-ink">All actions are done and the condition is verified. The case will be archived to the Knowledge Base.</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setCloseOpen(false)} className="rounded-lg px-4 py-2 text-[14.5px] text-ink-2 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={() => {
              setCapa((c) => ({ ...c, state: 'closed' }))
              setCloseOpen(false)
              showToast(`CAPA ${ac.contextCycle} closed`)
            }}
            className={clsx('rounded-lg px-4 py-2 text-[14.5px] font-medium text-white', openActions.length ? 'bg-high hover:brightness-95' : 'bg-navy-800 hover:bg-navy-700')}
          >
            {openActions.length ? 'Close anyway' : 'Close CAPA'}
          </button>
        </div>
      </Modal>

      <EscalateModal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        onEscalate={(reason) => {
          setCapa((c) => ({ ...c, state: 'escalated' }))
          setEscalateOpen(false)
          showToast(`Escalated to Plant Manager: ${reason.slice(0, 60)}`)
        }}
      />
      {toast}
    </div>
  )
}

function Kpi({ label, value, badge, badgeTone, foot }: { label: string; value: React.ReactNode; badge: React.ReactNode; badgeTone: 'good' | 'info' | 'high'; foot: string }) {
  const tone = { good: 'bg-good-soft text-good', info: 'bg-info-soft text-navy-700', high: 'bg-high-soft text-high' }[badgeTone]
  return (
    <Card className="p-5">
      <p className="text-[12.5px] font-medium uppercase tracking-wide text-ink-2">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[34px] font-bold leading-none text-navy-800">{value}</span>
        <span className={clsx('rounded px-2 py-1 text-[13px] font-medium', tone)}>{badge}</span>
      </div>
      <p className="mt-3 text-[13.5px] text-ink-2">{foot}</p>
    </Card>
  )
}

function EscalateModal({ open, onClose, onEscalate }: { open: boolean; onClose: () => void; onEscalate: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Reopen / Escalate" subtitle="Escalation notifies the Plant Manager and Reliability Lead." className="max-w-lg">
      <label className="text-[14px] text-ink" htmlFor="esc-reason">
        Reason *
      </label>
      <textarea
        id="esc-reason"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Water content rising again after 5 days; suspect second leak path."
        className="mt-2 w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-[14.5px] outline-none focus:bg-white focus:ring-2 focus:ring-navy-600/20"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-[14.5px] text-ink-2 hover:bg-slate-100">
          Cancel
        </button>
        <button
          disabled={!reason.trim()}
          onClick={() => {
            onEscalate(reason.trim())
            setReason('')
          }}
          className="rounded-lg bg-critical px-4 py-2 text-[14.5px] font-medium text-white hover:brightness-95 disabled:opacity-40"
        >
          Escalate
        </button>
      </div>
    </Modal>
  )
}
