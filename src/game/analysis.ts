import { RULES, roundCoins } from './catalog'
import { simulateEmission } from './engine'
import { buyOfferAt, recycleGem, transferGem } from './state'
import type { GameState, Gem, GemOrigin, Slot } from './types'
import { occupantAt, normalizeSlot } from './board'

export type CircuitEstimate = { perEmission: number; perSecond: number; limited: boolean }
export type PlacementPreview =
  | { ok: false; message: string }
  | { ok: true; estimate: CircuitEstimate; deltaPerSecond: number | null; recycling: boolean }

const perSecond = (gain: number) => roundCoins(gain * 1000 / RULES.periodMs) || 0

/** One new emission on a frozen board. Never schedules a wave or credits money. */
export function estimateCircuit(board: readonly (Gem | null)[], stones: readonly boolean[] = []): CircuitEstimate {
  const result = simulateEmission(board, { stones })
  return { perEmission: result.gain, perSecond: perSecond(result.gain), limited: result.limited }
}

/** Marginal effect, including routing: full circuit minus the circuit with this cell empty. */
export function estimateGemContribution(board: readonly (Gem | null)[], index: number,
  current?: CircuitEstimate, stones: readonly boolean[] = []): { perEmission: number; perSecond: number } | null {
  current ??= estimateCircuit(board, stones)
  const occupied = occupantAt(board, index)
  if (!occupied || current.limited) return null
  const without = [...board]
  without[occupied.anchor] = null
  const alternative = estimateCircuit(without, stones)
  if (alternative.limited) return null
  const gain = roundCoins(current.perEmission - alternative.perEmission) || 0
  return { perEmission: gain, perSecond: perSecond(gain) }
}

/** Reuse real transaction validation on immutable states; discard the candidate afterwards. */
export function previewPlacement(game: GameState, origin: GemOrigin, destination: number | Slot | null,
  current = estimateCircuit(game.board, game.stones)): PlacementPreview {
  const to: Slot | null = typeof destination === 'number' ? { area: 'board', index: destination } : destination
  if (origin.area !== 'shop') origin = normalizeSlot(game.board, origin)
  const recycling = to === null && origin.area !== 'shop'
  if (origin.area !== 'shop' && origin.area === to?.area && origin.index === to.index && game[origin.area][origin.index]) {
    return { ok: true, estimate: current, deltaPerSecond: current.limited ? null : 0, recycling: false }
  }
  const transaction = to === null
    ? origin.area !== 'shop' && game[origin.area][origin.index]
      ? recycleGem(game, origin.index, game[origin.area][origin.index]!.id, origin.area) : null
    : origin.area === 'shop' ? buyOfferAt(game, origin.index, to, origin.offerId)
      : transferGem(game, origin, to)
  if (!transaction) return { ok: false, message: 'Déposez la gemme sur le circuit.' }
  if (!transaction.ok) return { ok: false, message: transaction.message }
  const estimate = estimateCircuit(transaction.game.board, transaction.game.stones)
  return { ok: true, estimate, recycling,
    deltaPerSecond: current.limited || estimate.limited ? null : perSecond(estimate.perEmission - current.perEmission) }
}
