import clsx from 'clsx'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Mono } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { assets } from '@/data/dataset'
import { KB_CATEGORIES, KB_ENTRIES, PAGE_PATH, type KbCategory, type KbEntry } from '@/data/knowledge'

type Filter = 'All' | KbCategory

const searchable = (e: KbEntry) => [e.term, e.expansion ?? '', e.definition, e.category, ...e.related].join(' ').toLowerCase()

export default function KnowledgeBase() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<KbEntry | null>(null)

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => KB_ENTRIES.filter((e) => !q || searchable(e).includes(q)), [q])
  const rows = matches.filter((e) => filter === 'All' || e.category === filter).sort((a, b) => a.term.localeCompare(b.term))
  const count = (f: Filter) => matches.filter((e) => f === 'All' || e.category === f).length
  const categoryEmpty = filter !== 'All' && !KB_ENTRIES.some((e) => e.category === filter)

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">Knowledge Base</h1>
        <p className="text-[15px] text-ink-2">Industrial terminology, concepts, and operational knowledge used across CALIBER.</p>
      </div>

      <label className="flex h-12 items-center gap-3 rounded-[7px] border border-slate-300 bg-white px-4 focus-within:border-info focus-within:ring-2 focus-within:ring-info/10">
        <Search className="size-5 shrink-0 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terminology, equipment concepts, RCA, maintenance..."
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          aria-label="Search knowledge base"
        />
      </label>

      <div role="tablist" aria-label="Category" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line">
        {(['All', ...KB_CATEGORIES] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={clsx(
              '-mb-px border-b-2 pb-2 text-[14px] transition',
              filter === f ? 'border-navy-800 font-medium text-navy-800' : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            {f} <span className="font-mono text-[12px] text-ink-3">{count(f)}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-[12.5px] text-ink-2">
                  <th className="w-[19%] px-5 py-2.5 font-medium">Term</th>
                  <th className="w-[12%] px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Definition</th>
                  <th className="w-[20%] px-3 py-2.5 font-medium">Related concepts</th>
                  <th className="w-[15%] px-5 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <tr key={e.term} onClick={() => setSelected(e)} className="cursor-pointer align-top transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <button onClick={() => setSelected(e)} className="text-left font-medium text-navy-800 hover:underline">
                        {e.term}
                      </button>
                      {e.expansion && <p className="text-[12.5px] text-ink-2">{e.expansion}</p>}
                    </td>
                    <td className="px-3 py-3 text-ink-2">{e.category}</td>
                    <td className="px-3 py-3 leading-relaxed text-ink">{e.definition}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-2">{e.related.join(', ') || '—'}</td>
                    <td className="px-5 py-3 text-[12.5px] text-ink-2">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-[14px] text-ink-3">
            {categoryEmpty ? 'No knowledge entries available for this category yet.' : `No entries match “${query.trim()}”.`}
          </p>
        )}
      </Card>
      <p className="text-[12.5px] text-ink-3">
        Read-only. "General industrial definition" entries are common industry definitions, not Chandra Asri internal standards.
      </p>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.term ?? ''}>
        {selected && <EntryDetail e={selected} onOpen={(term) => setSelected(KB_ENTRIES.find((x) => x.term === term) ?? null)} />}
      </Drawer>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-3">
      <h3 className="text-[13px] font-medium text-ink-2">{label}</h3>
      <div className="mt-1 text-[14px] leading-relaxed text-ink">{children}</div>
    </section>
  )
}

function EntryDetail({ e, onOpen }: { e: KbEntry; onOpen: (term: string) => void }) {
  const cases = e.cases ? assets.filter(e.cases).map((a) => a.tag) : []
  return (
    <div>
      <p className="pb-3 text-[13.5px] text-ink-2">
        {e.expansion && <span className="block text-[15px] text-ink">{e.expansion}</span>}
        {e.category} · {e.source}
      </p>
      <Section label="Definition">{e.definition}</Section>
      <Section label="Why it matters in CALIBER">{e.why}</Section>
      {e.related.length > 0 && (
        <Section label="Related terms">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {e.related.map((r) => (
              <button key={r} onClick={() => onOpen(r)} className="text-navy-700 hover:underline">
                {r}
              </button>
            ))}
          </span>
        </Section>
      )}
      <Section label="Used in">
        <ul className="space-y-0.5">
          {e.usedIn.map((p) => (
            <li key={p}>
              <Link to={PAGE_PATH[p]} className="text-navy-700 hover:underline">
                {p}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      {cases.length > 0 && (
        <Section label="Related cases">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {cases.map((t) => (
              <Link key={t} to={`/investigation/${t}`} className="text-navy-700 hover:underline">
                <Mono className="font-semibold">{t}</Mono>
              </Link>
            ))}
          </span>
        </Section>
      )}
    </div>
  )
}
