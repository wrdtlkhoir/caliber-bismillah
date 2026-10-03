/**
 * ETL: dataset lomba (Excel + PowerPoint) → src/data/generated/dataset.json
 *
 *   npm run data            (default sumber: "./Case 2_ Intelligence Manufacturing")
 *   npm run data -- <folder>
 *
 * Sumber yang dibaca:
 *   Equipment Performance/*.xlsx  → info aset, limit alarm/trip, history kondisi mingguan, KPI reliability
 *   Production Data/*.xlsx        → PI tag metadata + data per jam (rate, pressure, vibrasi, suhu, ampere)
 *   Incident Database/*.xlsx      → 380 incident (downtime, loss, risk, status RCA/CAPA)
 *   RCA - Downtime Data/*.pptx    → laporan RCA: kronologi, verifikasi 4P & 4M+1E, root cause, CAPA, PM
 */
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'

const ROOT = path.resolve(process.argv[2] ?? 'Case 2_ Intelligence Manufacturing')
const OUT = path.resolve('src/data/generated/dataset.json')

if (!fs.existsSync(ROOT)) {
  console.error(`Dataset folder not found: ${ROOT}`)
  process.exit(1)
}

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
/** "29-Apr-2026" / "29 Apr 2026" → "2026-04-29" */
const isoDate = (s) => {
  const m = String(s).match(/(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/)
  return m ? `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}` : String(s)
}
const num = (s) => {
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}
const files = (dir, ext) =>
  fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.toLowerCase().endsWith(ext) && !f.startsWith('~$'))
    .map((f) => path.join(ROOT, dir, f))
const sheetRows = (wb, name, opts = {}) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '', ...opts })
const tagOf = (file) => path.basename(file).match(/([A-Z]{2}-\d{4}[A-Z]?)/)[1]
const clean = (s) => String(s).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()

/* ------------------------------------------------------------------ */
/* Equipment Performance                                               */
/* ------------------------------------------------------------------ */
function readEquipment(file) {
  const wb = XLSX.read(fs.readFileSync(file))
  const info = sheetRows(wb, 'Equipment Info')
  const kv = {}
  const params = []
  for (const r of info.slice(3)) {
    if (r[0]) kv[clean(r[0])] = clean(r[1])
    if (r[2] && r[3] && r[2] !== 'Parameter') {
      const [, label, unit] = clean(r[2]).match(/^(.*?)\s*\((.*)\)$/) ?? [null, clean(r[2]), '']
      const [alarm, trip] = String(r[3]).split('/').map((x) => num(x))
      params.push({ key: `p${params.length + 1}`, label, unit, alarm, trip, direction: trip >= alarm ? 'high' : 'low' })
    }
  }

  const hist = sheetRows(wb, 'Condition History')
  const history = hist
    .slice(1)
    .filter((r) => r[0] !== '')
    .map((r) => ({
      week: num(r[0]),
      date: String(r[1]).slice(0, 10),
      values: Object.fromEntries(params.map((p, i) => [p.key, num(r[2 + i])])),
      status: clean(r[6]),
      remark: clean(r[7]),
    }))

  const summary = {}
  for (const r of sheetRows(wb, 'Performance Summary').slice(3)) if (r[0]) summary[clean(r[0])] = num(r[1]) ?? clean(r[1])

  return {
    tag: kv['Equipment Tag'],
    name: kv['Equipment Name'],
    type: kv['Equipment Type'],
    eqClass: kv['Equipment Class'],
    plantName: kv['Plant / Unit'],
    plant: (kv['Plant / Unit'].match(/\(([A-Z0-9]+)\)/) ?? [])[1],
    discipline: kv['Discipline'],
    criticality: kv['Criticality'],
    designLife: kv['Design Life'],
    monitoring: kv['Monitoring Method'],
    arNo: kv['Linked RCA / AR No.'],
    failureDate: isoDate(kv['Failure Date']),
    failureMode: kv['Dominant Failure Mode'],
    params,
    history,
    summary: {
      weeks: summary['Monitoring Period (weeks)'],
      downtimeH: summary['Total Downtime (hours)'],
      periodH: summary['Period Hours'],
      availability: summary['Availability (%)'],
      failures: summary['No. of Failures (period)'],
      mtbfH: summary['MTBF (hours)'],
      mttrH: summary['MTTR (hours)'],
      alarmReadings: summary['ALARM readings'],
      tripReadings: summary['TRIP readings'],
      normalReadings: summary['NORMAL readings'],
      pmCompliance: summary['PM Compliance (%)'],
      productionLossT: summary['Production Loss (ton)'],
      lossK: summary['Estimated Loss (k USD)'],
    },
  }
}

/* ------------------------------------------------------------------ */
/* Production Data (PI)                                                */
/* ------------------------------------------------------------------ */
function readProduction(file) {
  const wb = XLSX.read(fs.readFileSync(file))
  const [head, ...tagRows] = sheetRows(wb, 'PI Tag')
  const tags = tagRows
    .filter((r) => r[0])
    .map((r) => Object.fromEntries(head.map((h, i) => [h, num(r[i]) ?? clean(r[i])])))
  const sheet = wb.SheetNames.find((n) => n !== 'PI Tag')
  const [cols, ...rows] = sheetRows(wb, sheet)
  const valueCols = cols.slice(1).filter((c) => c !== 'RUN_STATUS')
  const statusIdx = cols.indexOf('RUN_STATUS')
  return {
    tags,
    start: String(rows[0][0]).replace(' ', 'T'),
    stepMinutes: 60,
    columns: valueCols.map((c) => c.replace(/^[A-Z0-9]+_(?=[A-Z])/, '')), // KO3201_VIB → VIB
    rawColumns: valueCols,
    values: valueCols.map((c) => rows.map((r) => num(r[cols.indexOf(c)]))),
    running: rows.map((r) => (r[statusIdx] === 'ON' ? 1 : 0)),
  }
}

/* ------------------------------------------------------------------ */
/* Incident Database                                                   */
/* ------------------------------------------------------------------ */
function readIncidents(file) {
  const wb = XLSX.read(fs.readFileSync(file))
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Incident Database'], { range: 2, raw: false, defval: '' })
  const na = (s) => (s === 'n/a' || s === '' ? null : s)
  return rows.map((r) => ({
    serial: num(r['Serial No']),
    mto: r['MTO No.'],
    ar: na(r['AR No.']),
    plant: r['Plant'],
    tag: r['Tag Number'],
    eqClass: r['Eq. Class'],
    date: String(r['Date of Occur.']).slice(0, 10),
    title: r['Risk Case Title'],
    impact: r['Highest Impact'],
    preRisk: r['Pre-Risk'],
    riskScore: num(r['Risk Score']),
    pic: r['PIC (RCA)'],
    status: r['Overall Status'],
    discipline: r['Discipline'],
    eqType: r['Eq. Type'],
    component: r['Component'],
    mechanism: r['F Mechanism'],
    downtimeH: num(r['Downtime (hrs)']) ?? 0,
    actLossK: num(r['Act. Loss (k US$)']) ?? 0,
    potLossK: num(r['Pot. Loss (k US$)']) ?? 0,
    totalLossK: num(r['Total Loss (k US$)']) ?? 0,
    rcaDue: na(String(r['RCA Due Date']).slice(0, 10)),
  }))
}

/* ------------------------------------------------------------------ */
/* RCA reports (PPTX)                                                  */
/* ------------------------------------------------------------------ */
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

async function slideLines(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
  const slides = []
  for (const n of names) {
    const xml = await zip.file(n).async('string')
    slides.push(
      xml
        .split('</a:p>')
        .map((p) => decode(p.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
        .filter((l) => l && !/^\d\d\/\d\d$/.test(l) && !/^RCA & CAPA\/PAA\s*\|/.test(l)),
    )
  }
  return slides
}

const after = (lines, key) => lines[lines.indexOf(key) + 1]
const groups = (lines, size) => {
  const out = []
  for (let i = 0; i + size <= lines.length; i += size) out.push(lines.slice(i, i + size))
  return out
}
const between = (lines, startPred, endPred) => {
  const s = lines.findIndex(startPred)
  if (s < 0) return []
  const rest = lines.slice(s + 1)
  const e = rest.findIndex(endPred)
  return e < 0 ? rest : rest.slice(0, e)
}

async function readRca(file) {
  const s = await slideLines(file)
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11] = s

  const chronoLines = between(s3, (l) => l === 'Chronology of Events', (l) => l.startsWith('Problem:'))
  const chronology = groups(chronoLines, 2).map(([when, text]) => {
    const [, d, t] = when.match(/^(\d{1,2}-[A-Za-z]{3}-\d{4})\s*(\d{2}:\d{2})?/) ?? []
    return { date: isoDate(d), time: t ?? null, text }
  })

  const verification = (lines, stop) =>
    groups(between(lines, (l) => l === 'Evidence / Finding', (l) => l.startsWith(stop)), 4).map(([id, item, result, evidence]) => ({
      id,
      item,
      result,
      evidence,
    }))

  const rootCauseLine = s7.find((l) => l.startsWith('ROOT CAUSE:')) ?? ''
  const priority = s8.filter((l) => /^([PX]\d\s*)+$/.test(l)).flatMap((l) => l.split(/\s+/))

  const statusIdx = s9.indexOf('Status')
  const proIdx = s9.findIndex((l) => l.startsWith('PRO-ACTIVE ACTION'))
  const corrective = groups(s9.slice(statusIdx + 1, proIdx), 5)
  const proStatus = s9.indexOf('Status', proIdx)
  const proactive = groups(s9.slice(proStatus + 1), 5)
  const action = (kind) => ([rc, text, plan, pic, status]) => ({ kind, rc, text, planDate: isoDate(plan), pic, status: status ?? null })

  const riskStart = s10.indexOf('RISK ANALYSIS OF CORRECTIVE ACTION')
  const pmStart = s10.indexOf('PM SCHEDULE ESTABLISHED')
  const prevHeader = s10.indexOf('PIC')
  const preventive = groups(s10.slice(prevHeader + 1, riskStart), 5).map(([rc, cause, text, plan, pic]) => ({
    kind: 'preventive',
    rc,
    cause,
    text,
    planDate: isoDate(plan),
    pic,
    status: null,
  }))
  const riskHeader = s10.indexOf('PIC', riskStart)
  const risks = groups(s10.slice(riskHeader + 1, pmStart), 5).map(([action, risk, countermeasure, plan, pic]) => ({
    action,
    risk,
    countermeasure,
    planDate: isoDate(plan),
    pic,
  }))
  const pmHeader = s10.indexOf('Interval', pmStart)
  const pmSchedule = groups(s10.slice(pmHeader + 1), 4).map(([no, description, group, interval]) => ({ no, description, group, interval }))

  const fourW = (k) => after(s4, k)
  const uptime = fourW('Uptime Loss:') ?? ''
  const [, dt, ton, usd] = uptime.match(/([\d.]+) hours\s*→\s*([\d.,]+) ton\s*→\s*\$([\d.,]+)k/) ?? []

  return {
    arNo: after(s1, 'AR NUMBER'),
    title: after(s2, 'Title / Problem'),
    arType: after(s2, 'AR Type'),
    plant: after(s2, 'Plant / Unit'),
    discipline: after(s2, 'Discipline'),
    dateOccurrence: isoDate(after(s2, 'Date Occurrence')),
    dateReported: isoDate(after(s2, 'Date Reported')),
    immediateAction: after(s2, 'Immediate Action'),
    severity: after(s2, 'SEVERITY'),
    preRisk: after(s2, 'PRE-RISK'),
    problemStatement: after(s2, 'PROBLEM STATEMENT'),
    chronology,
    historicalEvidence: after(s4, 'HISTORICAL DATA & EVIDENCE'),
    impact: {
      what: fourW('What:'),
      when: fourW('When:'),
      scope: fourW('Scope:'),
      downtimeH: num(dt),
      productionLossT: num(ton),
      lossK: num(usd),
    },
    actualCondition: after(s5, 'ACTUAL CONDITION (Before Improvement)'),
    targetCondition: after(s5, 'TARGET CONDITION (Project Y)'),
    parameterVerification: verification(s6, 'NG ='),
    fourMVerification: verification(s7, 'ROOT CAUSE:'),
    rootCause: rootCauseLine.replace(/^ROOT CAUSE:\s*/, ''),
    priorityRootCauses: priority,
    actions: [...corrective.map(action('corrective')), ...proactive.map(action('proactive')), ...preventive],
    risks,
    pmSchedule,
    closure: { productionLossT: num(after(s11, 'PRODUCTION LOSS')?.replace(' ton', '')) },
  }
}

/* ------------------------------------------------------------------ */

const equipment = files('Equipment Performance', '.xlsx').map(readEquipment)
const production = Object.fromEntries(files('Production Data', '.xlsx').map((f) => [tagOf(f), readProduction(f)]))
const incidents = readIncidents(files('Incident Database', '.xlsx')[0])
const rcaList = await Promise.all(files('RCA - Downtime Data', '.pptx').map(readRca))
const rca = Object.fromEntries(rcaList.map((r) => [r.arNo, r]))

const assets = equipment
  .map((e) => ({ ...e, production: production[e.tag] ?? null, rca: rca[e.arNo] ?? null }))
  .sort((a, b) => a.tag.localeCompare(b.tag))

// Validasi ringan supaya kesalahan parsing langsung ketahuan
for (const a of assets) {
  const r = a.rca
  if (!r) console.warn(`! ${a.tag}: RCA report not found for ${a.arNo}`)
  else {
    if (r.parameterVerification.length < 3) console.warn(`! ${a.tag}: only ${r.parameterVerification.length} 4P rows parsed`)
    if (r.actions.length < 4) console.warn(`! ${a.tag}: only ${r.actions.length} actions parsed`)
    if (!r.rootCause) console.warn(`! ${a.tag}: root cause not parsed`)
  }
  if (!a.production) console.warn(`! ${a.tag}: production data missing`)
}

const dataset = {
  generatedAt: new Date().toISOString(),
  source: path.basename(ROOT),
  assets,
  incidents,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(dataset))
console.log(
  `✓ ${assets.length} assets, ${incidents.length} incidents, ${rcaList.length} RCA reports → ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`,
)
