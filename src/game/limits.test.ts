import { expect, test } from 'vitest'
import { simulateEmission, createEmission, advanceEmission } from './engine'
import { createInitialGame } from './state'
import { createSession, sessionReducer } from './runtime'

function dense(size: number) {
  const game = createInitialGame(); game.stones.fill(false)
  for (let y = 3; y < 3 + size; y++) for (let x = 0; x < size; x++) {
    const index = y * 7 + x
    game.board[index] = { id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' }
  }
  return game
}

test('neuf croix suffisent à multiplier les branches : la vraie limite est le budget, pas la puissance', () => {
  const game = dense(3), result = simulateEmission(game.board)
  expect(result.limits).toEqual(['events'])
  expect(result.events.length).toBeLessThanOrEqual(4096)
  expect(result.events.some((event) => event.reason === 'loop')).toBe(true)
  expect(result.events.filter((event) => event.type === 'move').length).toBeGreaterThan(1000)
  expect(Math.max(...result.events.map((event) => event.energy))).toBeLessThan(10)
  expect(simulateEmission(game.board)).toEqual(result)
})
test('les causes puissance, entrée invalide et Éclats sont distinguées', () => {
  const game = createInitialGame(); game.stones.fill(false)
  game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'EW' }
  expect(simulateEmission(game.board, { power: 1e12 }).limits).toEqual(['power'])
  expect(createEmission({ power: Infinity }).result.limits).toEqual(['invalid-power'])
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 11 }
  const result = simulateEmission(game.board, { power: 1e14, maxEnergy: 1e15 })
  expect(result.limits).toEqual(['coins'])
  expect(result.gain).toBe(0)
})
test('l’exécution vivante et la théorie sont identiques et les anciens ensembles ne sont pas mutés', () => {
  const game = dense(2), before = createEmission()
  let running = before
  while (!running.done) running = advanceEmission(game.board, running)
  expect(running.result).toEqual(simulateEmission(game.board))
  expect(before.frontier[0]!.visited.size).toBe(0)
  expect(before.frontier[0]!.activatedGems.size).toBe(0)
})
test('une limitation identifie son flux ; une modification du plateau retire l’alerte historique', () => {
  const game = dense(3)
  let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
  session = sessionReducer(session, { type: 'tick', now: 20000 })
  expect(session.limitNotice).toContain('flux #1 limité')
  expect(session.limitNotice).toContain('budget d’événements')
  const edited = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 28 }, to: { area: 'inventory', index: 0 } })
  expect(edited.limitNotice).toBe('')
  expect(edited.warning).toBe(false)
  expect(edited.pending).toBe(session.pending)
})
