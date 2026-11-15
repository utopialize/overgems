import { RULES, SETTINGS, offerPrice } from './catalog'
import type { GameState, Gem, Offer } from './types'

/** A saved PRNG makes offers reproducible, including after a reload. */
export function nextRandom(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}
export function generateOffer(game: GameState): { offer: Offer; seed: number; nextId: number } {
  const seed = nextRandom(game.seed)
  const second = nextRandom(seed)
  const third = nextRandom(second)
  const highest = Math.max(0, ...[...game.board, ...game.inventory].map((gem) => gem?.level ?? 0))
  const level = second % 5 === 0 ? Math.min(3, Math.max(0, highest - 1)) : 0
  const id = `gem-${game.nextId}`
  if (game.stones.some(Boolean) && third % RULES.toolChanceDivisor === 0) {
    const item = { id: `tool-${game.nextId}`, kind: 'pickaxe' as const }
    return { offer: { item, price: offerPrice(item, game.purchases) }, seed: third, nextId: game.nextId + 1 }
  }
  const gem: Gem = seed % 10 < 5 ? { id, kind: 'harvest', level }
    : { id, kind: 'multiplier', level, setting: SETTINGS[third % SETTINGS.length]! }
  return { offer: { item: gem, price: offerPrice(gem, game.purchases) }, seed: third, nextId: game.nextId + 1 }
}
