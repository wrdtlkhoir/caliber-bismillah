import clsx from 'clsx'
import { ArrowRight, BrainCircuit, Check, ChevronRight, Download, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { assetByTag, assets, type Asset } from '@/data/dataset'
import { buildInvestigation } from '@/data/investigation'
import { buildProblem, buildProblems, plantLabel, urgentActionsAt } from '@/data/plant'
import { rankProblems } from '@/lib/ahp'
import { fmtDate, useAsOf } from '@/lib/asOf'
import { exportDossier } from '@/lib/dossier'
import { useRole } from '@/lib/role'
import { AskCaliberChat } from '@/features/investigation/AskCaliberChat'
import { AssetSummary } from '@/features/investigation/AssetSummary'
import { PiReplay } from '@/features/investigation/PiReplay'
import { RelevantParameters } from '@/features/investigation/RelevantParameters'
import { BenchmarkPanel, ConfidencePanel, ImpactPanel } from '@/features/investigation/SidePanels'
import { SimilarIncidents } from '@/features/investigation/SimilarIncidents'

export default function Investigation() {
  const { id } = useParams()
  const { asOf } = useAsOf()
  const asset = assetByTag(id)
  if (!asset) {
    const top = rankProblems(buildProblems(asOf))[0]?.id ?? assets[0].tag
    return <Navigate to={`/investigation/${top}`} replace />
  }
  return <InvestigationView key={asset.tag} asset={asset} asOf={asOf} />
}

function InvestigationView({ asset, asOf }: { asset: Asset; asOf: string }) {
  const navigate = useNavigate()
  const [askOpen, setAskOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const [toast, showToast] = useToast()
  const { can, viewOnly } = useRole()

  const inv = useMemo(() => buildInvestigation(asset, asOf), [asset, asOf])
  const ranked = useMemo(() => rankProblems(buildProblems(asOf)), [asOf])
  const problem = useMemo(() => ranked.find((p) => p.id === asset.tag) ?? rankProblems([buildProblem(asset, asOf)])[0], [ranked, asset, asOf])
  const rank = ranked.indexOf(problem) + 1

  const requestField = () => {
    const wr = `WR-${asOf.slice(0, 4)}-${String(Math.floor(1000 + Math.random() * 9000))}`
    setRequested(true)
    showToast(`${wr} created: ${inv.fieldAction.replace('Request ', '')} for ${asset.tag}`)
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[15px] text-ink-2" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ink">Plant</Link>
            <ChevronRight className="size-4 text-ink-3" />
            <span>{plantLabel(asset.plant)}</span>
            <ChevronRight className="size-4 text-ink-3" />
            <Mono className="font-semibold text-ink">{asset.tag}</Mono>
          </nav>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-ink">
            {asset.tag}: {inv.headline}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <HeaderButton icon={Download} onClick={() => exportDossier(problem, inv, asOf, rank ? { rank, total: ranked.length } : undefined)}>
            Export Dossier
          </HeaderButton>
          <HeaderButton icon={BrainCircuit} onClick={() => setAskOpen(true)} variant="teal">
            Ask CALIBER
          </HeaderButton>
        </div>
      </div>

      <AssetSummary problem={problem} inv={inv} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <RelevantParameters inv={inv} />
          <PiReplay asset={asset} asOf={asOf} />
        </div>
        <div className="space-y-5">
          <BenchmarkPanel inv={inv} value={inv.benchmark.value} digits={inv.params.find((p) => p.key === inv.benchmark.paramKey)?.digits ?? 1} />
          <ImpactPanel steps={inv.impact} />
          <ConfidencePanel c={inv.confidence} />
        </div>
      </div>

      <SimilarIncidents asset={asset} incidents={inv.incidents} />

      {/* Action bar */}
      <Card className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <p className="flex max-w-[620px] items-start gap-2 font-mono text-[12.5px] text-ink-2">
          <RefreshCw className="mt-0.5 size-4 shrink-0 text-good" />
          <span>
            Sources: {inv.sources.join(', ')}. Data as of {fmtDate(asOf)}.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={requestField}
            disabled={requested || !can('requestField')}
            title={can('requestField') ? undefined : viewOnly}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-medium text-navy-900 transition hover:bg-slate-100 disabled:hover:bg-transparent',
              requested ? 'disabled:text-good' : 'disabled:text-ink-3',
            )}
          >
            {requested && <Check className="size-4" />}
            {requested ? 'Field request sent' : inv.fieldAction}
          </button>
          <button
            onClick={() => navigate(`/root-cause/${asset.tag}`)}
            className="flex items-center gap-3 rounded-lg bg-navy-800 px-5 py-2.5 text-[15px] font-medium text-white shadow-card transition hover:bg-navy-700"
          >
            Go to Root Cause &amp; Decision
            <ArrowRight className="size-4" />
          </button>
        </div>
      </Card>

      <Drawer open={askOpen} onClose={() => setAskOpen(false)} title="Ask CALIBER">
        <AskCaliberChat
          problem={problem}
          rank={rank || 1}
          total={Math.max(ranked.length, 1)}
          inv={inv}
          asOf={asOf}
          action={urgentActionsAt(asOf).all.find((a) => a.problemId === asset.tag)}
        />
      </Drawer>

      {toast}
    </div>
  )
}

const VARIANT = {
  default: 'border-line bg-surface text-ink',
  teal: 'border-line bg-surface text-navy-800 [&_svg]:text-navy-700',
  primary: 'border-navy-800 bg-navy-800 text-white hover:bg-navy-700',
}

function HeaderButton({
  icon: Icon,
  children,
  className,
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ComponentType<{ className?: string }>; variant?: keyof typeof VARIANT }) {
  return (
    <button
      {...props}
      className={clsx(
        'flex min-w-[150px] items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-[15px] font-medium shadow-card transition hover:brightness-[0.98]',
        VARIANT[variant],
        className,
      )}
    >
      <Icon className="size-5" />
      {children}
    </button>
  )
}
