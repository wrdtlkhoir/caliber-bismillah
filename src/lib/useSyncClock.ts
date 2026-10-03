import { useCallback, useEffect, useState } from 'react'

/** Simulasi sinkronisasi real-time dengan historian: auto-sync tiap 5 menit. */
const INITIAL_OFFSET_MS = 2 * 60_000
const AUTO_SYNC_MS = 5 * 60_000

export function useSyncClock() {
  const [lastSync, setLastSync] = useState(() => Date.now() - INITIAL_OFFSET_MS)
  const [now, setNow] = useState(Date.now())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const sync = useCallback(() => {
    setSyncing(true)
    setTimeout(() => {
      setLastSync(Date.now())
      setNow(Date.now())
      setSyncing(false)
    }, 900)
  }, [])

  useEffect(() => {
    if (now - lastSync >= AUTO_SYNC_MS) sync()
  }, [now, lastSync, sync])

  const mins = Math.floor((now - lastSync) / 60_000)
  const label = syncing ? 'syncing…' : mins < 1 ? 'just now' : `${mins}m ago`
  return { label, syncing, sync }
}
