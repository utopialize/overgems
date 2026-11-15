import type { Direction, Gem, Setting } from './types'

export const RULES = {
  columns: 7, rows: 9, sourceRow: 4, inventorySize: 12,
  periodMs: 5000, stepMs: 800, feedbackMs: 750, maxEvents: 4096,
  maxEnergy: 1e12, maxCoins: 1e15, rerollCost: 5, rerollPriceStep: 1,
  purchasePriceStep: 1, purchasesPerPriceStep: 5,
} as const
export const HARVEST_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export const MULTIPLIER_VALUES = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2] as const
export const DIRECTIONS: readonly Direction[] = ['N', 'E', 'S', 'W']
export const SETTINGS: readonly Setting[] = ['EW', 'NS', 'NE', 'ES', 'SW', 'NW', 'NES', 'ESW', 'NSW', 'NEW', 'NESW']
export const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }
export const DELTA: Record<Direction, readonly [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
export const DIRECTION_NAMES: Record<Direction, string> = { N: 'haut', E: 'droite', S: 'bas', W: 'gauche' }

export function gemValue(gem: Gem): number {
  return (gem.kind === 'harvest' ? HARVEST_VALUES : MULTIPLIER_VALUES)[gem.level]!
}
export function gemLabel(gem: Gem): string {
  return `${gem.kind === 'harvest' ? '+' : '×'}${gemValue(gem).toLocaleString('fr-FR')}`
}
export function connections(gem: Gem): Direction[] {
  return gem.kind === 'harvest' ? [] : DIRECTIONS.filter((direction) => gem.setting.includes(direction))
}
export function gemDescription(gem: Gem): string {
  const name = gem.kind === 'harvest' ? 'Récolte' : 'Amplification'
  const setting = gem.kind === 'harvest' ? 'traversée libre en ligne droite' : connections(gem).map((d) => DIRECTION_NAMES[d]).join(', ')
  return `${name} ${gemLabel(gem)}, niveau ${gem.level + 1}, ${setting}`
}
export function gemPrice(gem: Gem): number {
  const shapeCost = gem.kind === 'harvest' ? 1 : connections(gem).length - 1
  return Math.ceil((gem.kind === 'harvest' ? 6 : 10) * 2.5 ** gem.level * shapeCost)
}
export function shopPrice(gem: Gem, purchases: number): number {
  return Math.min(RULES.maxCoins, gemPrice(gem) + Math.floor(purchases / RULES.purchasesPerPriceStep) * RULES.purchasePriceStep)
}
export function rerollPrice(rerolls: number): number {
  return Math.min(RULES.maxCoins, RULES.rerollCost + rerolls * RULES.rerollPriceStep)
}
export function gemInvestment(gem: Gem): number {
  return gem.invested ?? gemPrice(gem)
}
export function recycleValue(gem: Gem): number {
  return roundCoins(gemInvestment(gem) / 2)
}
export function numberLabel(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1, notation: value >= 100_000 ? 'compact' : 'standard' })
}
export function roundCoins(value: number): number {
  return Math.round(Math.min(RULES.maxCoins, value) * 1e6) / 1e6
}
