import { RULES, roundCoins } from './catalog'
import type { GameState, Gem, Transaction } from './types'

export const WORLD_RULES = { stepColumns: 7, maxColumns: 35, basePrice: 100, priceGrowth: 2 } as const
export function expansionPrice(columns: number): number {
  return Math.min(RULES.maxCoins, WORLD_RULES.basePrice * WORLD_RULES.priceGrowth ** ((columns - RULES.columns) / WORLD_RULES.stepColumns))
}
export function remapIndex(index: number, oldColumns: number, newColumns: number): number {
  return Math.floor(index / oldColumns) * newColumns + index % oldColumns
}
/** One atomic territory purchase. Existing coordinates, objects and randomness survive. */
export function buyExpansion(game: GameState): Transaction {
  if (game.columns >= WORLD_RULES.maxColumns) return { game, ok: false, message: 'Territoire maximal débloqué.' }
  const price = expansionPrice(game.columns)
  if (game.coins < price) return { game, ok: false, message: 'Pas assez d’Éclats pour étendre le territoire.' }
  const columns = game.columns + WORLD_RULES.stepColumns
  const board: (Gem | null)[] = Array.from({ length: columns * RULES.rows }, () => null)
  const stones = Array.from({ length: board.length }, () => true)
  game.board.forEach((gem, index) => { const next = remapIndex(index, game.columns, columns); board[next] = gem; stones[next] = game.stones[index]! })
  return { ok: true, game: { ...game, columns, board, stones, coins: roundCoins(game.coins - price) },
    message: 'Territoire étendu : ' + columns + ' × ' + RULES.rows + '. Les nouvelles cases sont rocheuses.' }
}
