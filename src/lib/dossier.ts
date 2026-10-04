import type { jsPDF as JsPDF } from 'jspdf'
import type { UserOptions } from 'jspdf-autotable'
import { buildActionCase, type CapaAction } from '@/data/actions'
import type { Asset } from '@/data/dataset'
import type { Investigation } from '@/data/investigation'
import { fmtValue, plantLabel } from '@/data/plant'
import type { AuditEntry, Hypothesis } from '@/data/rootCause'
import type { Problem } from '@/data/types'
import { RC_AHP, RC_CRITERIA, rcWeight, type AhpAnalysis } from './ahpPairwise'
import { fmtDate } from './asOf'
import type { HypothesisDecision } from './useDecision'

/**
 * Dossier PDF (jsPDF + autotable, di-load saat export saja). Isi diambil dari
 * dataset pada tanggal replay; status CAPA memakai editan user di Page 4 kalau ada.
 */

const SOURCE = 'Competition dataset: Equipment Performance, Production Data, Incident Database, RCA reports'
const NAVY: [number, number, number] = [31, 58, 135]
const INK: [number, number, number] = [15, 26, 46]
const INK2: [number, number, number] = [74, 85, 104]
const LINE: [number, number, number] = [230, 233, 240]
const M = 16 // margin (mm)

type AutoTable = (doc: JsPDF, options: UserOptions) => void

/** Font standar PDF (WinAnsi) tidak punya panah/simbol matematika: ganti ke padanan ASCII. */
const GLYPHS: Record<string, string> = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '≈': '~', 'λ': 'lambda', 'σ': 'sigma', '−': '-' }
const pdfText = (s: string) => s.replace(/[→←≥≤≈λσ−]/g, (c) => GLYPHS[c])

class Report {
  y = 0
  constructor(
    private doc: JsPDF,
    private autoTable: AutoTable,
    private footer: string,
  ) {}

  private get width() {
    return this.doc.internal.pageSize.getWidth() - 2 * M
  }

  private ensure(h: number) {
    if (this.y + h > this.doc.internal.pageSize.getHeight() - 18) {
      this.doc.addPage()
      this.y = 18
    }
  }

  header(title: string, subtitle: string) {
    const d = this.doc
    d.setFillColor(...NAVY)
    d.rect(0, 0, d.internal.pageSize.getWidth(), 3, 'F')
    d.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY)
    d.text('CALIBER', M, 13)
    d.setFont('helvetica', 'normal').setTextColor(...INK2)
    d.text('Chandra Asri Plant Intelligence', M + 19, 13)
    d.setDrawColor(...LINE).line(M, 16, M + this.width, 16)
    d.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...INK)
    d.text(pdfText(title), M, 26)
    d.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK2)
    const lines = d.splitTextToSize(pdfText(subtitle), this.width)
    d.text(lines, M, 32)
    this.y = 32 + lines.length * 4.5 + 3
  }

  section(title: string) {
    this.ensure(14)
    this.y += 4
    this.doc.setFont('helvetica', 'bold').setFontSize(11.5).setTextColor(...NAVY)
    this.doc.text(title.toUpperCase(), M, this.y)
    this.y += 5
  }

  para(text: string, muted = false) {
    const d = this.doc
    d.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...(muted ? INK2 : INK))
    const lines = d.splitTextToSize(pdfText(text), this.width) as string[]
    this.ensure(lines.length * 4.4)
    d.text(lines, M, this.y)
    this.y += lines.length * 4.4 + 1.5
  }

  /** Pasangan label–nilai dua kolom. */
  facts(rows: [string, string][]) {
    this.table([], rows, { columnStyles: { 0: { cellWidth: 48, textColor: INK2 } }, theme: 'plain' })
  }

  table(head: string[], body: (string | number)[][], extra: Partial<UserOptions> = {}) {
    if (!body.length) return
    this.ensure(18) // jangan biarkan header tabel sendirian di dasar halaman
    this.autoTable(this.doc, {
      startY: this.y,
      head: head.length ? [head] : undefined,
      body: body.map((r) => r.map((c) => pdfText(String(c)))),
      margin: { left: M, right: M, bottom: 18 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: [243, 245, 249], textColor: INK, fontStyle: 'bold' },
      ...extra,
    })
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  save(filename: string) {
    const d = this.doc
    const pages = d.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      d.setPage(i)
      const h = d.internal.pageSize.getHeight()
      d.setDrawColor(...LINE).line(M, h - 12, M + this.width, h - 12)
      d.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...INK2)
      d.text(d.splitTextToSize(this.footer, this.width - 24), M, h - 8)
      d.text(`Page ${i} of ${pages}`, M + this.width, h - 8, { align: 'right' })
    }
    d.save(filename)
  }
}

async function newReport(asOf: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const generated = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  return new Report(doc, autoTable, `Data as of ${fmtDate(asOf)}. ${SOURCE}. Generated ${generated} WIB.`)
}

/** CAPA yang tersimpan di Page 4 (status hasil update user), kalau ada. */
function persistedCapa(tag: string): CapaAction[] | null {
  try {
    const raw = localStorage.getItem(`caliber.capa.v2.${tag}`)
    return raw ? (JSON.parse(raw).actions as CapaAction[]) : null
  } catch {
    return null
  }
}

/** Bagian bersama: dampak finansial, CAPA + status, dan verifikasi. */
function actionSections(r: Report, a: Asset, asOf: string, opts: { financialEstimate?: string } = {}) {
  const rcaKnown = a.rca && a.rca.dateReported <= asOf ? a.rca : null
  const ac = rcaKnown ? buildActionCase(a, asOf) : null

  r.section('Financial impact')
  if (rcaKnown) {
    r.facts([
      ['Estimated loss (RCA)', `US$ ${rcaKnown.impact.lossK.toLocaleString('en-US')}k`],
      ['Production loss', `${rcaKnown.impact.productionLossT.toLocaleString('en-US')} t`],
      ['Downtime', `${rcaKnown.impact.downtimeH} h`],
      ['Scope', rcaKnown.impact.scope],
    ])
  } else r.para(opts.financialEstimate ?? 'No RCA impact record at this replay date.', true)

  r.section('Recommended actions & status')
  if (ac) {
    const actions = persistedCapa(a.tag) ?? ac.actions
    r.table(
      ['#', 'Action', 'Type', 'Owner', 'Due', 'Status'],
      actions.map((x, i) => [i + 1, x.title, x.type, x.owner, fmtDate(x.due), x.status]),
      { columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 72 } } },
    )
    if (ac.rca.pmSchedule.length) r.table(['PM', 'Description', 'Interval', 'Group'], ac.rca.pmSchedule.map((p) => [p.no, p.description, p.interval, p.group]))

    r.section('Verification status')
    r.para(`Condition: ${ac.conditionText}.`)
    r.table(
      ['Check', 'Result', 'State'],
      ac.verification.checks.map((c) => [c.title, c.text, c.state === 'done' ? 'Done' : 'Pending']),
    )
  } else {
    r.para('No CAPA has been issued at this replay date (the RCA report is not yet available).', true)
    r.section('Verification status')
    r.para('Not started. Verification follows CAPA execution.', true)
  }
}

/** Dossier investigasi (Page 2) pada tanggal replay. */
export async function exportDossier(problem: Problem & { ahp: number }, inv: Investigation, asOf: string, rank?: { rank: number; total: number }) {
  const a = inv.asset
  const r = await newReport(asOf)
  r.header(`Investigation Dossier: ${a.tag}`, `${a.name}, ${a.type}. ${plantLabel(a.plant)} (${a.plant}).`)

  r.section('Problem summary')
  r.facts([
    ['Problem', `${inv.headline}: ${problem.title}`],
    ['Equipment', `${a.tag}, Class ${a.eqClass}, ${a.criticality} criticality`],
    ['Severity / priority', `${problem.severity.toUpperCase()}, AHP score ${problem.ahp.toFixed(2)}${rank ? ` (rank #${rank.rank} of ${rank.total})` : ''}`],
    ['Status', `${problem.status}, health phase ${inv.health.phase}`],
    ['RCA PIC', problem.lead],
  ])

  r.section('Evidence: condition monitoring (latest weekly reading)')
  r.table(
    ['Parameter', 'Value', 'Alarm', 'Trip', '4-wk change', 'Projection'],
    inv.health.params.map((p) => [
      p.param.label,
      `${fmtValue(p.param, p.value)} ${p.param.unit}`,
      p.param.alarm,
      p.param.trip,
      `${p.changePct.toFixed(0)}%`,
      p.daysToTrip ? `trip in ~${p.daysToTrip} d` : p.daysToAlarm ? `alarm in ~${p.daysToAlarm} d` : 'n/a',
    ]),
  )
  r.table(['Step', 'Finding', 'Detail'], inv.impact.map((s) => [s.title, s.headline, s.detail]))
  r.para(`Data confidence ${inv.confidence.pct}%. ${inv.confidence.note}`, true)

  r.section('Similar historical incidents (Incident Database)')
  r.table(
    ['Ref', 'Tag', 'Title', 'Match', 'Downtime', 'Total loss', 'Status'],
    inv.incidents.slice(0, 8).map((s) => [
      s.incident.ar ?? s.incident.mto,
      s.incident.tag,
      s.incident.title,
      `${Math.round(s.score * 100)}%`,
      `${s.incident.downtimeH} h`,
      `$${s.incident.totalLossK}k`,
      s.incident.status,
    ]),
  )

  r.section('Root cause / hypothesis')
  const rcaKnown = a.rca && a.rca.dateReported <= asOf ? a.rca : null
  r.para(rcaKnown ? `Verified in ${rcaKnown.arNo}: ${rcaKnown.rootCause}` : `Leading hypothesis: ${inv.impact[1].headline}. ${inv.impact[1].detail}. Not yet verified by RCA.`)

  const fin = inv.impact.find((s) => s.kind === 'financial')
  actionSections(r, a, asOf, { financialEstimate: fin ? `${fin.headline} (${fin.detail}). Estimate from similar incidents, not a recorded loss.` : undefined })

  r.save(`${a.tag}-investigation-dossier.pdf`)
}

/** Dossier RCA (Page 3): ranking hipotesis AHP, keputusan engineer, CAPA, dan audit trail. */
export async function exportRcaDossier(
  problem: Problem,
  a: Asset,
  ranked: (Hypothesis & { priority: number })[],
  decisions: Record<string, HypothesisDecision>,
  audit: AuditEntry[],
  asOf: string,
  ahp: AhpAnalysis = RC_AHP,
) {
  const rca = a.rca
  const r = await newReport(asOf)
  r.header(`RCA Dossier: ${a.tag}${rca ? ` (${rca.arNo})` : ''}`, `${a.name}. ${plantLabel(a.plant)} (${a.plant}). RCA PIC: ${problem.lead}.`)

  r.section('Problem summary')
  r.facts([
    ['Problem statement', rca?.problemStatement ?? problem.title],
    ['Severity', `${problem.severity.toUpperCase()}${rca ? `, RCA severity ${rca.severity}, pre-risk ${rca.preRisk}` : ''}`],
    ['Status', problem.status],
    ['Failure date', fmtDate(a.failureDate)],
  ])

  r.section('Root cause / hypotheses (AHP ranking)')
  r.table(
    ['Rank', 'ID', 'Hypothesis', 'AHP score', 'Confidence', 'Decision'],
    ranked.map((h, i) => [i + 1, h.id, h.title, h.priority.toFixed(2), `${h.confidence}%`, decisions[h.id] ?? 'pending']),
    { columnStyles: { 2: { cellWidth: 70 } } },
  )
  r.para(`Criteria weights (CR = ${ahp.cr.toFixed(3)}): ${RC_CRITERIA.map((c) => `${c.label} ${(rcWeight(c.key, ahp.weights) * 100).toFixed(1)}%`).join(', ')}.`, true)

  r.section('Evidence')
  for (const h of ranked) {
    r.para(`${h.id}: ${h.title}. ${h.summary}`)
    r.table(['Status', 'Evidence', 'Source'], h.evidence.map((e) => [e.status, e.text, e.source]), { columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 40 } } })
  }

  actionSections(r, a, asOf)

  r.section('Decision audit trail')
  r.table(['Time', 'Actor', 'Entry'], audit.map((e) => [e.time, e.actor, e.text]), { columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 32 } } })

  r.save(`${a.tag}-rca-dossier.pdf`)
}
