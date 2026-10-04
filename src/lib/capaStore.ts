import type { CapaAction } from '@/data/actions'

/**
 * Penyimpanan CAPA per problem di localStorage. Dipakai bersama oleh halaman loop per aset
 * (`/actions/:tag`) dan halaman All Actions (`/actions`) supaya status selalu sinkron.
 */
export type CapaState = 'open' | 'closed' | 'escalated'

export interface PersistedCapa {
  actions: CapaAction[]
  state: CapaState
  reviews: Record<string, string>
}

export const capaKey = (tag: string) => `caliber.capa.v2.${tag}`

export function readCapa(tag: string, initial: CapaAction[]): PersistedCapa {
  try {
    const raw = localStorage.getItem(capaKey(tag))
    if (raw) return JSON.parse(raw) as PersistedCapa
  } catch {
    /* storage tidak tersedia */
  }
  return { actions: initial, state: 'open', reviews: {} }
}

/** Daftar CAPA tersimpan untuk aset ini, atau null kalau user belum pernah mengubahnya. */
export function storedCapa(tag: string): CapaAction[] | null {
  try {
    const raw = localStorage.getItem(capaKey(tag))
    return raw ? (JSON.parse(raw) as PersistedCapa).actions : null
  } catch {
    return null
  }
}

export function writeCapa(tag: string, value: PersistedCapa) {
  try {
    localStorage.setItem(capaKey(tag), JSON.stringify(value))
  } catch {
    /* storage tidak tersedia: perubahan hanya bertahan di sesi ini */
  }
}
