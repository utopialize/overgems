import { RULES, roundCoins } from './catalog'
import { simulateEmission } from './engine'
import { buyOfferOnBoard, recycleGem, transferGem } from './state'
import type { GameState, Gem, GemOrigin } from './types'

export type CircuitEstimate = { perEmission: number; perSecond: number; limited: boolean }
export type PlacementPreview =
  | { ok: false; message: string }
  | { ok: true; estimate: CircuitEstimate; deltaPerSecond: number | null; recycling: boolean }

const perSecond = (gain: number) => roundCoins(gain * 1000 / RULES.periodMs) || 0

/** One new emission on a frozen board. Never schedules a wave or credits money. */
export function estimateCircuit(board: readonly (Gem | null)[]): CircuitEstimate {
  const result = simulateEmission(board)
  return { perEmission: result.gain, perSecond: perSecond(result.gain), limited: result.limited }
}

/** Marginal effect, including routing: full circuit minus the circuit with this cell empty. */
export function estimateGemContribution(board: readonly (Gem | null)[], index: number,
  current = estimateCircuit(board)): { perEmission: number; perSecond: number } | null {
  if (!board[index] || current.limited) return null
  const without = [...board]
  without[index] = null
  const alternative = estimateCircuit(without)
  if (alternative.limited) return null
  const gain = roundCoins(current.perEmission - alternative.perEmission) || 0
  return { perEmission: gain, perSecond: perSecond(gain) }
}

/** Reuse real transaction validation on immutable states; discard the candidate afterwards. */
export function previewPlacement(game: GameState, origin: GemOrigin, destination: number | null,
  current = estimateCircuit(game.board)): PlacementPreview {
  const recycling = destination === null && origin.area === 'board'
  if (origin.area === 'board' && origin.index === destination && game.board[origin.index]) {
    return { ok: true, estimate: current, deltaPerSecond: current.limited ? null : 0, recycling: false }
  }
  const transaction = destination === null
    ? origin.area === 'board' && game.board[origin.index]
      ? recycleGem(game, origin.index, game.board[origin.index]!.id) : null
    : origin.area === 'shop' ? buyOfferOnBoard(game, origin.index, destination, origin.offerId)
      : transferGem(game, origin, { area: 'board', index: destination })
  if (!transaction) return { ok: false, message: 'Déposez la gemme sur le circuit.' }
  if (!transaction.ok) return { ok: false, message: transaction.message }
  const estimate = estimateCircuit(transaction.game.board)
  return { ok: true, estimate, recycling,
    deltaPerSecond: current.limited || estimate.limited ? null : perSecond(estimate.perEmission - current.perEmission) }
}
