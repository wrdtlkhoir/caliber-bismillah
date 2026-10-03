import { useEffect, useRef, useState } from 'react'

/** Animasi angka naik/turun halus saat nilai berubah (mis. ganti time range). */
export function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      from.current = target
      return
    }
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(begin + (target - begin) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, duration])

  return value
}
