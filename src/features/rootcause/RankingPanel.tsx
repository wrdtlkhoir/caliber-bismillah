import clsx from 'clsx'
import { CircleAlert, CircleCheck, LayoutDashboard, PencilLine, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Card, Mono } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { currentUser } from '@/data/plant'
import type { Hypothesis } from '@/data/rootCause'
import { analyzeMatrix, buildMatrix, CR_THRESHOLD, DEFAULT_UPPER, fraction, RC_CRITERIA, rcWeight, SAATY_SCALE } from '@/lib/ahpPairwise'
import { fmtDate } from '@/lib/asOf'
import { CRITERION_OWNERS, ownsCriterion, useRole } from '@/lib/role'
import type { PairwiseState } from '@/lib/usePairwise'

const pct = (v: number) => `${Math.round(v * 100)}%`

export function RankingPanel({ h, rank, pairwise }: { h: Hypothesis & { priority: number }; rank: number; pairwise: PairwiseState }) {
  const [open, setOpen] = useState(false)
  const { can, viewOnly } = useRole()
  const { analysis, judgment } = pairwise
  const consistent = analysis.cr < CR_THRESHOLD

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-medium text-navy-900">{rank === 1 ? `Why is ${h.id} ranked first?` : `Why is ${h.id} ranked #${rank}?`}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-2">Analytic hierarchy process over six criteria</p>
        </div>
        <Mono
          className={clsx('flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px]', consistent ? 'bg-good-soft text-good' : 'bg-critical-soft text-critical')}
          title={`λmax ${analysis.lambdaMax.toFixed(3)}, CI ${analysis.ci.toFixed(3)}`}
        >
          {consistent ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
          CR {analysis.cr.toFixed(2)}
        </Mono>
      </header>

      <ol className="mt-5 space-y-4">
        {RC_CRITERIA.map((c, i) => (
          <li key={c.key}>
            <div className="flex items-baseline justify-between text-[14.5px]">
              <span className="text-ink">
                {i + 1}. {c.label} <Mono className="text-[12.5px] text-ink-2">({pct(rcWeight(c.key, analysis.weights))} weight)</Mono>
              </span>
              <Mono className="text-[13px] font-semibold text-ink">{pct(h.scores[c.key])}</Mono>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-navy-700 transition-[width] duration-500" style={{ width: pct(h.scores[c.key]) }} />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
        <span className="flex items-center gap-2 text-[16px] font-medium text-ink">
          <LayoutDashboard className="size-4" /> Composite index score
        </span>
        <Mono className="text-[19px] font-bold text-navy-800">{h.priority.toFixed(2)} / 1.00</Mono>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="text-ink-2">
          {judgment ? (
            <>
              Weights set by <span className="font-medium text-ink">{judgment.filledBy}</span> ({judgment.role}), {fmtDate(judgment.at.slice(0, 10))}
            </>
          ) : (
            'Weights from the baseline expert judgment'
          )}
        </span>
        <button
          onClick={() => setOpen(true)}
          title={can('editPairwise') ? undefined : viewOnly}
          className="flex items-center gap-1.5 font-medium text-navy-700 hover:underline"
        >
          <PencilLine className="size-4" /> {can('editPairwise') ? 'Fill pairwise matrix' : 'View pairwise matrix'}
        </button>
      </div>

      {open && <PairwiseEditor pairwise={pairwise} onClose={() => setOpen(false)} />}
    </Card>
  )
}

/** Modal isian pairwise: user memilih nilai Saaty di segitiga atas, bobot & CR dihitung langsung. */
function PairwiseEditor({ pairwise, onClose }: { pairwise: PairwiseState; onClose: () => void }) {
  const [draft, setDraft] = useState(() => pairwise.upper.map((r) => [...r]))
  const [filledBy, setFilledBy] = useState(pairwise.judgment?.filledBy ?? currentUser.name)
  const { role, viewOnly } = useRole()
  const owns = RC_CRITERIA.map((c) => ownsCriterion(role, c.key))
  /** Sel i-vs-j bisa diedit kalau role memiliki salah satu kriterianya. */
  const editable = (i: number, j: number) => owns[i] || owns[j]
  const cells = RC_CRITERIA.flatMap((_, i) => RC_CRITERIA.map((_, j) => [i, j] as const)).filter(([i, j]) => j > i)
  const editableCount = cells.filter(([i, j]) => editable(i, j)).length
  const editsAll = editableCount === cells.length
  const matrix = buildMatrix(draft)
  const a = analyzeMatrix(matrix)
  const consistent = a.cr < CR_THRESHOLD

  const setCell = (i: number, j: number, v: number) =>
    setDraft((d) => d.map((row, r) => (r === i ? row.map((x, k) => (k === j - i - 1 ? v : x)) : row)))

  return (
    <Modal
      open
      onClose={onClose}
      title="Pairwise comparison matrix"
      subtitle="For each pair, pick how much more important the row criterion is than the column criterion (Saaty scale 1/9 to 9). The lower half fills itself."
      className="max-w-5xl"
    >
      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-ink-2">
        {editableCount === 0 ? (
          <>
            <span className="font-medium text-ink">{viewOnly}.</span> No criterion in this matrix belongs to your role.
          </>
        ) : editsAll ? (
          <>You can edit every comparison as {role}.</>
        ) : (
          <>
            As {role} you can edit comparisons involving{' '}
            <span className="font-medium text-ink">{RC_CRITERIA.filter((_, i) => owns[i]).map((c) => c.label).join(', ')}</span>. Other cells are view only.
          </>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-center text-[13px]">
          <thead>
            <tr className="text-ink-2">
              <th className="px-2 py-2 text-left font-medium">Criterion</th>
              <th className="px-2 py-2 text-left font-medium">Owner</th>
              {RC_CRITERIA.map((c, i) => (
                <th key={c.key} className="px-1 py-2 font-medium" title={c.label}>
                  C{i + 1}
                </th>
              ))}
              <th className="bg-info-soft px-3 py-2 font-semibold text-navy-800">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap px-2 py-1.5 text-left text-ink">
                  <Mono className="mr-1.5 text-ink-3">C{i + 1}</Mono>
                  {RC_CRITERIA[i].label}
                </td>
                <td className={clsx('whitespace-nowrap px-2 py-1.5 text-left text-[12px]', owns[i] ? 'font-medium text-navy-800' : 'text-ink-2')}>
                  {CRITERION_OWNERS[RC_CRITERIA[i].key].join(', ')}
                </td>
                {row.map((v, j) => (
                  <td key={j} className="px-1 py-1.5">
                    {j > i ? (
                      <select
                        value={SAATY_SCALE.findIndex((s) => Math.abs(s - v) < 1e-6)}
                        onChange={(e) => setCell(i, j, SAATY_SCALE[Number(e.target.value)])}
                        disabled={!editable(i, j)}
                        title={editable(i, j) ? undefined : viewOnly}
                        className={clsx(
                          'w-[62px] rounded-md border bg-white px-1 py-1 font-mono text-[13px] outline-none focus:ring-2 focus:ring-navy-600/20',
                          !editable(i, j)
                            ? 'cursor-not-allowed border-dashed border-slate-300 bg-slate-50 text-ink-2'
                            : v > 1
                              ? 'border-navy-700/40 font-semibold text-navy-800'
                              : v < 1
                                ? 'border-line text-ink-2'
                                : 'border-line text-ink',
                        )}
                        aria-label={`${RC_CRITERIA[i].label} vs ${RC_CRITERIA[j].label}`}
                      >
                        {SAATY_SCALE.map((s, k) => (
                          <option key={k} value={k}>
                            {fraction(s)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Mono className="block py-1 text-ink-3">{fraction(v)}</Mono>
                    )}
                  </td>
                ))}
                <td className="bg-info-soft px-3 py-1.5 font-mono font-semibold text-navy-800">{pct(a.weights[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['λmax', a.lambdaMax.toFixed(3)],
          ['CI', a.ci.toFixed(3)],
          ['RI (n = 6)', '1.24'],
          ['CR = CI / RI', a.cr.toFixed(3)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[12px] text-ink-2">{k}</dt>
            <dd className="font-mono text-[16px] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className={clsx('mt-3 flex items-center gap-2 text-[14px]', consistent ? 'text-good' : 'text-critical')}>
        {consistent ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
        {consistent
          ? `Consistent (CR ${a.cr.toFixed(3)} is below ${CR_THRESHOLD}). These weights can be saved.`
          : `Inconsistent (CR ${a.cr.toFixed(3)}). Revise the comparisons until CR is below ${CR_THRESHOLD}.`}
      </p>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <label className="text-[13px] text-ink-2">
          Filled by
          <input
            value={filledBy}
            onChange={(e) => setFilledBy(e.target.value)}
            disabled={editableCount === 0}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-navy-600/20 disabled:bg-slate-50 disabled:text-ink-2"
          />
        </label>
        <label className="text-[13px] text-ink-2">
          Role
          <p className="mt-1 rounded-lg border border-line bg-slate-50 px-3 py-2 text-[14px] text-ink">{role}</p>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          // hanya sel milik role yang dikembalikan ke baseline
          onClick={() => setDraft((d) => d.map((row, i) => row.map((x, k) => (editable(i, i + k + 1) ? DEFAULT_UPPER[i][k] : x))))}
          disabled={editableCount === 0}
          title={editableCount === 0 ? viewOnly : undefined}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RotateCcw className="size-4" /> Load baseline judgment
        </button>
        <div className="flex gap-2">
          {pairwise.judgment && editsAll && (
            <button
              onClick={() => {
                pairwise.reset()
                onClose()
              }}
              className="rounded-lg px-4 py-2 text-[14px] text-critical hover:bg-critical-soft"
            >
              Clear saved weights
            </button>
          )}
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[14px] text-ink-2 hover:bg-slate-100">
            Cancel
          </button>
          <button
            disabled={editableCount === 0 || !consistent || !filledBy.trim()}
            title={editableCount === 0 ? viewOnly : undefined}
            onClick={() => {
              pairwise.save({ upper: draft, filledBy: filledBy.trim(), role })
              onClose()
            }}
            className="rounded-lg bg-navy-800 px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-700 disabled:opacity-40"
          >
            Save weights
          </button>
        </div>
      </div>
    </Modal>
  )
}
