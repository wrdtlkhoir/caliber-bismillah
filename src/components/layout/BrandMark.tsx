/**
 * Logo resmi (public/logo.png, simbol + tulisan "Chandra Asri").
 * File aslinya punya padding transparan lebar (konten ≈ x 16.2–83.1%, y 32.6–64.1%, rasio 4.24:1),
 * jadi padding dipotong lewat CSS tanpa mengubah file.
 */
export function BrandMark() {
  return (
    <span className="relative block h-[34px] aspect-[4.238] overflow-hidden">
      <img
        src="/logo.png"
        alt="Chandra Asri"
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: '149.6%', left: '-24.26%', top: '-103.2%' }}
      />
    </span>
  )
}
