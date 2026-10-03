/** Placeholder logo. Ganti dengan logo resmi hasil export dari Figma (public/logo.svg). */
export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82c4" />
            <stop offset="1" stopColor="#1b2c5c" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="url(#bm)" />
        <path
          d="M3.5 12.5c7-3.5 18-3.5 25 0M3 17.5c7.5-3.2 18.5-3.2 26 0M5.5 22.5c6.5-2.4 14.5-2.4 21 0"
          stroke="#e8f6fb"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight text-navy-800">Chandra Asri</span>
    </div>
  )
}
