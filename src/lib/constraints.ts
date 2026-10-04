import { usePersistentState } from './usePersistentState'

export type ConstraintType = 'downtime' | 'budget' | 'spares' | 'manpower' | 'permit' | 'production' | 'other'

export interface DecisionConstraint {
  id: string
  type: ConstraintType
  value: string
  note: string
}

export const CONSTRAINT_TYPES: Record<ConstraintType, { label: string; placeholder: string; unit?: string }> = {
  downtime: { label: 'Max downtime window', placeholder: '12', unit: 'hours' },
  budget: { label: 'Budget limit', placeholder: '50', unit: 'k US$' },
  spares: { label: 'Spare parts availability', placeholder: 'Bearing in stock, cooler bundle 6 weeks lead time' },
  manpower: { label: 'Manpower / crew', placeholder: '1 rotating crew per shift' },
  permit: { label: 'Work permit / safety', placeholder: 'Hot work needs 24 h permit' },
  production: { label: 'Production commitment', placeholder: 'No rate cut before 15 May shipment' },
  other: { label: 'Other', placeholder: 'Describe the constraint' },
}

/** Constraint keputusan per aset, disimpan di localStorage. */
export function useConstraints(tag: string) {
  return usePersistentState<DecisionConstraint[]>(`caliber.constraints.${tag}`, [])
}

export const constraintLabel = (c: DecisionConstraint) => {
  const t = CONSTRAINT_TYPES[c.type]
  return `${t.label}: ${c.value}${t.unit ? ` ${t.unit}` : ''}`
}
