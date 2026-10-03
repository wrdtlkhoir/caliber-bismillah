import { CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(t)
  }, [message])

  const node = message ? (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-fade-up items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-xl">
      <CircleCheck className="size-4 text-good" />
      {message}
    </div>
  ) : null

  return [node, useCallback((m: string) => setMessage(m), [])] as const
}
