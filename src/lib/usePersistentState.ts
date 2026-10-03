import { useEffect, useState } from 'react'

/** useState yang disimpan di localStorage (fallback ke memori kalau storage tidak tersedia). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* abaikan */
    }
  }, [key, value])

  return [value, setValue] as const
}
