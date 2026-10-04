import clsx from 'clsx'
import { ArrowRight, BadgeCheck, CircleUserRound, Clock, Download, ListOrdered, MapPin, Waypoints, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { assetByTag } from '@/data/dataset'
import { buildProblem, buildProblems, currentUser, plantLabel } from '@/data/plant'
import { buildRootCause, type RootCauseCase } from '@/data/rootCause'
import { rankProblems } from '@/lib/ahp'
import { useAsOf } from '@/lib/asOf'
import type { Problem } from '@/data/types'
import { synthesize } from '@/lib/ahpPairwise'
import { exportRcaDossier } from '@/lib/dossier'
import { severityMeta } from '@/lib/severity'
import { useConstraints } from '@/lib/constraints'
import { useDecision } from '@/lib/useDecision'
import { usePairwise } from '@/lib/usePairwise'
import { formatDetected } from '@/features/investigation/AssetSummary'
import { AuditTrail } from '@/features/rootcause/AuditTrail'
import { ConstraintsEditor, ConstraintsPanel } from '@/features/rootcause/ConstraintsPanel'
import { SolutionImpact } from '@/features/rootcause/SolutionImpact'
import { HypothesisCard } from '@/features/rootcause/HypothesisCard'
import { KnowledgePath } from '@/features/rootcause/KnowledgePath'
import { PriorCheck } from '@/features/rootcause/PriorCheck'
import { RankingPanel } from '@/features/rootcause/RankingPanel'
import { ValidationPanel, type ValidationAction } from '@/features/rootcause/ValidationPanel'

const ENGINE = 'Evidence from RCA 4P / 4M+1E, CM trends and the Incident DB'

export default function RootCause() {
  const { id } = useParams()
  const { asOf } = useAsOf()
  const asset = assetByTag(id)
  const rc = useMemo(() => (asset ? buildRootCause(asset, asOf) : null), [asset, asOf])

  if (!asset || !rc) return <Navigate to={`/root-cause/${rankProblems(buildProblems(asOf))[0]?.id ?? 'KO-3201'}`} replace />
  return <RootCauseView key={asset.tag} problem={buildProblem(asset, asOf)} rc={rc} />
}

function RootCauseView({ problem, rc }: { problem: Problem; rc: RootCauseCase }) {
  const a = rc.asset
  const { asOf } = useAsOf()
  const pairwise = usePairwise()
  const [constraints, setConstraints] = useConstraints(problem.id)
  const [constraintsOpen, setConstraintsOpen] = useState(false)
  const ranked = useMemo(() => synthesize(rc.hypotheses, pairwise.analysis.weights), [rc, pairwise.analysis.weights])
  const { decisions, log, record } = useDecision(problem.id)
  const [selectedId, setSelectedId] = useState(ranked[0].id)
  const [toast, showToast] = useToast()

  const selected = ranked.find((h) => h.id === selectedId) ?? ranked[0]
  const rank = ranked.indexOf(selected) + 1
  const acceptedId = Object.keys(decisions).find((k) => decisions[k] === 'accepted')
  const sev = severityMeta[problem.severity]
  const stage = acceptedId ? 'Validated' : 'Diagnosis'

  const onAction = (action: ValidationAction, note: string) => {
    const who = currentUser.name
    const suffix = note ? ` Remarks: “${note}”` : ''
    const h = selected
    switch (action) {
      case 'accept':
        record({ actor: 'Engineer Decision', text: `${who} accepted ${h.id} (${h.title}) as validated root cause.${suffix}` }, { id: h.id, value: 'accepted' })
        showToast(`${h.id} accepted, RCA validated`)
        break
      case 'reject': {
        record({ actor: 'Engineer Decision', text: `${who} rejected ${h.id} (${h.title}).${suffix}` }, { id: h.id, value: 'rejected' })
        const next = ranked.find((x) => x.id !== h.id && decisions[x.id] !== 'rejected')
        if (next) setSelectedId(next.id)
        break
      }
      case 'modify':
        record({ actor: 'Engineer Decision', text: `${who} modified diagnosis for ${h.id}:${suffix}` })
        showToast('Diagnosis modification logged')
        break
      case 'evidence': {
        const missing = h.evidence.filter((e) => e.status !== 'support').map((e) => e.source)
        record({
          actor: 'Lead Engineer',
          text: `${who} requested additional evidence for ${h.id}${missing.length ? ` (${[...new Set(missing)].join(', ')})` : ''}.${suffix}`,
        })
        showToast(`Evidence request sent for ${h.id}`)
        break
      }
      case 'undo':
        record({ actor: 'Engineer Decision', text: `${who} revoked the decision on ${h.id}.${suffix}` }, { id: h.id, value: null })
        break
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Asset header */}
      <Card className="flex flex-wrap items-center gap-5 px-5 py-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-navy-900">
          <Wrench className="size-7" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Mono className="text-[20px] font-bold text-navy-800">{problem.id}</Mono>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[14px] text-ink">{a.type}</span>
            <span className={clsx('flex items-center gap-1.5 rounded px-2 py-0.5 text-[14px]', sev.soft, sev.text)}>
              <span className={clsx('size-1.5 rounded-full', problem.severity === 'medium' ? 'bg-ink-2' : sev.bar)} /> {sev.label}
            </span>
            <span className="flex items-center gap-1.5 rounded bg-good-soft px-2 py-0.5 text-[14px] text-good">
              <span className="size-1.5 rounded-full bg-good" /> Class {a.eqClass}, {a.criticality} criticality
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-navy-700" /> {plantLabel(a.plant)} ({a.plant})
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> Failure: <Mono className="text-ink">{formatDetected(a.failureDate)}</Mono>
            </span>
            <span className="flex items-center gap-1.5">
              <CircleUserRound className="size-4" /> Lead: <span className="text-ink">{problem.lead}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="flex items-center gap-2 text-[14.5px] text-ink">
            <BadgeCheck className={clsx('size-5', acceptedId ? 'text-good' : 'text-navy-700')} /> {stage}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to={`/actions?asset=${problem.id}`}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[15px] font-medium text-navy-800 hover:border-slate-300"
          >
            Go to Action &amp; Reliability <ArrowRight className="size-4" />
          </Link>
          <button
            onClick={() => exportRcaDossier(problem, a, ranked, decisions, [...rc.audit, ...log], asOf, pairwise.analysis)}
            className="flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-[15.5px] font-medium text-white shadow-card hover:bg-navy-700"
          >
            <Download className="size-4" /> Export RCA Dossier
          </button>
          </div>
        </div>
      </Card>

      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="font-mono text-[13.5px] text-ink-2" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ink">Plant</Link> / {a.plant} /{' '}
            <Link to={`/investigation/${problem.id}`} className="font-semibold text-ink hover:underline">
              {problem.id}
            </Link>{' '}
            / <span className="text-teal">Root Cause &amp; Decision</span>
          </nav>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Root Cause &amp; Decision Synthesis</h1>
          <p className="text-[16px] text-ink-2">Why is it happening, and which hypothesis should we verify first?</p>
        </div>
        <p className="flex items-center gap-2 text-[14px] text-ink-2">
          <Waypoints className="size-4 text-teal" /> {ENGINE}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-line bg-surface p-5 shadow-card" aria-labelledby="hyp-title">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-navy-700">
                  <ListOrdered className="size-5" />
                </span>
                <div>
                  <p className="text-[13.5px] text-ink-2">AI hypotheses, pending engineer validation</p>
                  <h2 id="hyp-title" className="text-[20px] font-medium text-navy-900">
                    Triangulated Root Causes
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[13.5px] font-medium text-ink-2">{ranked.length} Ranked Candidates</span>
            </header>
            <div className="mt-4 space-y-4">
              {ranked.map((h, i) => (
                <HypothesisCard
                  key={h.id}
                  h={h}
                  rank={i + 1}
                  selected={h.id === selected.id}
                  decision={decisions[h.id]}
                  onSelect={() => setSelectedId(h.id)}
                />
              ))}
            </div>
          </section>
          <SolutionImpact asset={a} hypothesis={selected} constraints={constraints} onEditConstraints={() => setConstraintsOpen(true)} />
          {rc.prior && <PriorCheck prior={rc.prior} problemId={problem.id} />}
        </div>

        <div className="space-y-5">
          <RankingPanel h={selected} rank={rank} pairwise={pairwise} />
          <ConstraintsPanel constraints={constraints} onEdit={() => setConstraintsOpen(true)} />
          <ValidationPanel
            key={selected.id}
            h={selected}
            decision={decisions[selected.id]}
            acceptedId={acceptedId}
            placeholder={rc.placeholder}
            onAction={onAction}
          />
          <AuditTrail entries={[...rc.audit, ...log]} eventNo={rc.eventNo} unitLabel={a.plant} />
        </div>
      </div>

      <KnowledgePath path={rc.path} />
      {constraintsOpen && <ConstraintsEditor open initial={constraints} onClose={() => setConstraintsOpen(false)} onSave={setConstraints} />}
      {toast}
    </div>
  )
}

