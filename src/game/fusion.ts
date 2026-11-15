import { HARVEST_VALUES, gemValue, gemInvestment, roundCoins } from './catalog'
import type { Gem } from './types'

export function canMerge(first: Gem, second: Gem): boolean {
  return first.id !== second.id && first.kind === second.kind && first.level === second.level
    && (first.rarity ?? 'common') === (second.rarity ?? 'common')
    && gemValue(first) === gemValue(second) && first.level < HARVEST_VALUES.length - 1
    && (first.kind === 'harvest' || (second.kind === 'multiplier' && first.setting === second.setting))
}
export function mergeGems(first: Gem, second: Gem): Gem | null {
  return canMerge(first, second) ? { ...second, level: second.level + 1,
    invested: roundCoins(gemInvestment(first) + gemInvestment(second)) } : null
}
