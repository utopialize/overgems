import type { LimitReason } from './types'

export const LIMIT_LABELS: Record<LimitReason, string> = {
  events: 'budget d’événements atteint', power: 'puissance maximale atteinte',
  coins: 'plafond d’Éclats atteint', 'invalid-power': 'puissance invalide',
}
export function limitLabel(reasons: readonly LimitReason[]): string { return reasons.map((reason) => LIMIT_LABELS[reason]).join(' · ') }
