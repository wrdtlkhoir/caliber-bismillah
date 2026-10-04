import { useCallback, useEffect, useState } from 'react'
import type { AuditEntry } from '@/data/rootCause'

export type HypothesisDecision = 'accepted' | 'rejected'

interface DecisionState {
  decisions: Record<string, HypothesisDecision>
  log: AuditEntry[]
}

const EMPTY: DecisionState = { decisions: {}, log: [] }
const keyOf = (problemId: string) => `caliber.rc.${problemId}`

function load(problemId: string): DecisionState {
  try {
    const raw = localStorage.getItem(keyOf(problemId))
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function nowWib() {
  const d = new Date()
  const opt = { timeZone: 'Asia/Jakarta' } as const
  return `${d.toLocaleDateString('en-GB', { ...opt, day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { ...opt, hour: '2-digit', minute: '2-digit' })}`
}

/** Keputusan engineer per problem, disimpan di localStorage supaya bertahan saat pindah halaman. */
export function useDecision(problemId: string) {
  const [state, setState] = useState(() => load(problemId))

  useEffect(() => {
    try {
      localStorage.setItem(keyOf(problemId), JSON.stringify(state))
    } catch {
      /* storage tidak tersedia — keputusan hanya bertahan di sesi ini */
    }
  }, [problemId, state])

  const record = useCallback((entry: Omit<AuditEntry, 'time'>, decision?: { id: string; value: HypothesisDecision | null }) => {
    setState((s) => {
      const decisions = { ...s.decisions }
      if (decision) {
        if (decision.value) decisions[decision.id] = decision.value
        else delete decisions[decision.id]
      }
      return { decisions, log: [...s.log, { ...entry, time: nowWib() }] }
    })
  }, [])

  const reset = useCallback(() => setState(EMPTY), [])

  return { ...state, record, reset }
}
