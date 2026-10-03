import { Construction } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { NAV } from '@/components/layout/Sidebar'

export default function ComingSoon() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const route = useParams()
  const title = NAV.find((n) => n.to !== '/' && pathname.startsWith(n.to))?.label ?? 'Page'
  const id = route.id ?? params.get('id')

  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-info-soft text-navy-700">
        <Construction className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-ink-2">
        Halaman ini sedang dibangun{id && <> — konteks: <span className="font-mono font-medium text-ink">{id}</span></>}.
      </p>
      <Link to="/" className="mt-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
        Kembali ke Overview
      </Link>
    </div>
  )
}
