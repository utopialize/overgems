import { SETTINGS } from './catalog'
import { nextRandom } from './economy'
import type { Gem } from './types'

export type RewardRule = { kind: 'none' | Gem['kind']; weight: number; rarity?: Gem['rarity']; level?: number }
/** Relative weights, independent of mineral finds. No passive bonus from rarity. */
export const EXCAVATION_REWARDS: readonly RewardRule[] = [
  { kind: 'none', weight: 70 },
  { kind: 'harvest', weight: 20 },
  { kind: 'multiplier', weight: 8 },
  { kind: 'harvest', rarity: 'rare', weight: 2 },
]

export function rollExcavationReward(seed: number, nextId: number, rules = EXCAVATION_REWARDS): { seed: number; gem?: Gem } {
  const draw = nextRandom(seed), variant = nextRandom(draw)
  const valid = rules.filter((rule) => Number.isFinite(rule.weight) && rule.weight > 0)
  const total = valid.reduce((sum, rule) => sum + rule.weight, 0)
  let cursor = (draw >>> 0) / 0x100000000 * total
  const selected = valid.find((rule) => { cursor -= rule.weight; return cursor < 0 })
  if (!selected || selected.kind === 'none') return { seed: variant }
  const base = { id: 'gem-' + nextId, level: Math.max(0, Math.min(11, Math.floor(selected.level ?? 0))),
    rarity: selected.rarity ?? 'common', invested: 0 } as const
  return { seed: variant, gem: selected.kind === 'harvest' ? { ...base, kind: 'harvest' }
    : { ...base, kind: 'multiplier', setting: SETTINGS[(variant >>> 16) % SETTINGS.length]! } }
}
