import clsx from 'clsx'
import { useState } from 'react'
import { paretoHead, type ParetoRow } from '@/data/plant'

const W = 320
const H = 176
const PAD = { l: 38, r: 32, t: 10, b: 20 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const CUTOFF = 80

const fmtK = (v: number) => `$${Math.round(v).toLocaleString('en-US')}k`
const fmtAxis = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}M` : `${Math.round(v)}k`)

export function LossPareto({ rows, periodLabel }: { rows: ParetoRow[]; periodLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)

  if (!rows.length) return <p className="py-8 text-center text-[13.5px] text-ink-3">No incidents recorded in {periodLabel}.</p>

  const n = rows.length
  const head = paretoHead(rows, CUTOFF)
  const headPct = rows[head - 1].cumPct
  const total = rows.reduce((s, r) => s + r.lossK, 0)
  const max = rows[0].lossK
  const step = PLOT_W / n
  const barW = Math.max(4, Math.min(20, step * 0.68))
  const x = (i: number) => PAD.l + step * i + step / 2
  const yLoss = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H
  const yPct = (p: number) => PAD.t + PLOT_H - (p / 100) * PLOT_H
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yPct(r.cumPct).toFixed(1)}`).join(' ')
  const splitX = PAD.l + step * head
  // 80% hanya acuan: kalau butuh lebih dari separuh kategori untuk mencapainya, loss memang menyebar
  const few = n <= 4
  const spread = !few && head / n > 0.5

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Pareto of total loss by failure mechanism, ${periodLabel}`} onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map((p) => (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yPct(p)} y2={yPct(p)} stroke="var(--color-line)" />
            <text x={W - PAD.r + 4} y={yPct(p) + 3} fontSize={9} fill="var(--color-ink-3)" fontFamily="var(--font-mono)">
              {p}%
            </text>
            <text x={PAD.l - 5} y={yPct(p) + 3} fontSize={9} fill="var(--color-ink-3)" textAnchor="end" fontFamily="var(--font-mono)">
              {p === 0 ? '0' : fmtAxis((max * p) / 100)}
            </text>
          </g>
        ))}

        <line x1={PAD.l} x2={W - PAD.r} y1={yPct(CUTOFF)} y2={yPct(CUTOFF)} stroke="var(--color-ink-3)" strokeDasharray="3 3" />
        <text x={W - PAD.r + 4} y={yPct(CUTOFF) + 3} fontSize={9} fill="var(--color-ink-2)" fontFamily="var(--font-mono)">
          80%
        </text>
        {head < n && <line x1={splitX} x2={splitX} y1={PAD.t} y2={PAD.t + PLOT_H} stroke="var(--color-ink-3)" strokeDasharray="2 3" />}

        {rows.map((r, i) => (
          <g key={r.category} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - step / 2} y={PAD.t} width={step} height={PLOT_H} fill={hover === i ? 'rgb(15 23 42 / 0.04)' : 'transparent'} />
            <rect
              x={x(i) - barW / 2}
              y={yLoss(r.lossK)}
              width={barW}
              height={PAD.t + PLOT_H - yLoss(r.lossK)}
              rx={1.5}
              fill="var(--color-navy-700)"
              fillOpacity={i < head ? 1 : 0.28}
            />
            <text x={x(i)} y={H - 6} fontSize={9} fill={i < head ? 'var(--color-ink)' : 'var(--color-ink-3)'} textAnchor="middle" fontFamily="var(--font-mono)">
              {i + 1}
            </text>
          </g>
        ))}

        <path d={line} fill="none" stroke="var(--color-navy-950)" strokeWidth={1.5} strokeLinejoin="round" />
        {rows.map((r, i) => (
          <circle key={r.category} cx={x(i)} cy={yPct(r.cumPct)} r={hover === i ? 3.2 : 2} fill="var(--color-navy-950)" />
        ))}
      </svg>

      <p className="mt-2 text-[13px] leading-snug text-ink">
        {n <= 2 ? (
          <>Only {n} mechanism{n === 1 ? '' : 's'} recorded in this period, too few for a meaningful Pareto.</>
        ) : (
          <>
            Top contributors account for <span className="font-semibold tabular">{headPct.toFixed(0)}%</span> of {fmtK(total)} total loss:{' '}
            <span className="font-medium">{rows.slice(0, head).map((r) => r.category).join(', ')}</span> ({head} of {n} mechanisms).
          </>
        )}
      </p>
      {n > 2 && (
        <p className="mt-1 text-[12.5px] leading-snug text-ink-2">
          {few
            ? `Only ${n} mechanisms in this period, so read the ranking rather than the 80% split. ${rows[0].category} is the largest at ${rows[0].sharePct.toFixed(0)}%.`
            : spread
              ? `Loss is spread out: it takes ${head} of ${n} mechanisms to reach 80%. ${rows[0].category} is the largest single contributor at ${rows[0].sharePct.toFixed(0)}%; prioritise by risk as well as loss.`
              : `The other ${n - head} mechanism${n - head === 1 ? '' : 's'} still account for ${(100 - headPct).toFixed(0)}% and remain in scope.`}
        </p>
      )}

      <table className="mt-3 w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-ink-2">
            <th className="w-6 py-1 font-medium">#</th>
            <th className="py-1 font-medium">Mechanism</th>
            <th className="py-1 text-right font-medium">Loss</th>
            <th className="py-1 text-right font-medium">Share</th>
            <th className="py-1 text-right font-medium">Cum.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.category}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={clsx(
                'tabular',
                i === head && head < n && 'border-t border-dashed border-slate-300',
                hover === i && 'bg-slate-50',
                i < head ? 'text-ink' : 'text-ink-3',
              )}
            >
              <td className="py-1 font-mono">{i + 1}</td>
              <td className={clsx('py-1', i < head && 'font-medium')}>
                {r.category} <span className="text-ink-3">({r.count})</span>
              </td>
              <td className="py-1 text-right">{fmtK(r.lossK)}</td>
              <td className="py-1 text-right">{r.sharePct.toFixed(0)}%</td>
              <td className="py-1 text-right">{r.cumPct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
        Total loss = actual + potential loss (k US$), Incident Database, {periodLabel}. Mechanism from the F Mechanism field; truncated source values are mapped
        from the incident title. 80% is a prioritisation reference, not a target.
      </p>
    </div>
  )
}
