export const PULSE_VISUALS = { radius: 9, burstMs: 280, particleCount: 6 } as const

/** Display rounding only. The simulation keeps its full energy value. */
export function powerLabel(energy: number): string {
  return energy.toLocaleString('fr-FR', {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
    notation: energy >= 1000 ? 'compact' : 'standard',
  })
}
