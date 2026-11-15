import { describe, expect, test } from 'vitest'
import { RULES } from './catalog'
import { createEmission, advanceEmission, simulateEmission } from './engine'
import { createInitialGame } from './state'
import { createSession, sessionReducer } from './runtime'
import { decodeSave } from './save'

describe('impulsions vivantes', () => {
  test('déplacer la même récolte devant une branche ne la recrédite pas ; l’émission suivante peut la récolter', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    expect(session.game.coins).toBe(31)
    for (let x = 0; x < 2; x++) {
      session = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 28 + x },
        to: { area: 'board', index: 29 + x }, now: 5801 + x * 800 })
      session = sessionReducer(session, { type: 'tick', now: 6600 + x * 800 })
      expect(session.game.coins).toBe(31)
      expect(session.pending[0]!.result.events.filter((event) => event.type === 'harvest')).toHaveLength(1)
      expect(session.pending[0]!.start).toBe(5000)
    }
    session = sessionReducer(session, { type: 'tick', now: 10000 })
    session = sessionReducer(session, { type: 'tick', now: 12400 })
    expect(session.game.coins).toBe(32)
    expect(session.pending.find((wave) => wave.id === 2)!.result.gain).toBe(1)
  })
  test('une multiplicatrice déplacée route encore la branche sans amplifier une deuxième fois', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'EW' }
    game.board[30] = { id: 'gem-2', kind: 'harvest', level: 0 }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    session = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 28 }, to: { area: 'board', index: 29 }, now: 5801 })
    session = sessionReducer(session, { type: 'tick', now: 6600 })
    expect(session.pending[0]!.frontier[0]!.energy).toBe(1.1)
    expect(session.pending[0]!.result.events.filter((event) => event.type === 'multiply')).toHaveLength(1)
    session = sessionReducer(session, { type: 'tick', now: 7400 })
    expect(session.game.coins).toBe(31.1)
  })
  test('les branches filles héritent des activations antérieures avec des ensembles indépendants', () => {
    const game = createInitialGame()
    const gem = { id: 'gem-1', kind: 'harvest' as const, level: 0 }
    game.board[28] = gem
    game.board[29] = { id: 'gem-2', kind: 'multiplier', level: 0, setting: 'ESW' }
    const first = advanceEmission(game.board, createEmission())
    const split = advanceEmission(game.board, first)
    expect(split.frontier).toHaveLength(2)
    expect(split.frontier[0]!.activatedGems).not.toBe(split.frontier[1]!.activatedGems)
    expect(first.frontier[0]!.activatedGems).toEqual(new Set(['gem-1']))
    game.board[28] = null
    game.board[30] = gem
    const next = advanceEmission(game.board, split)
    expect(next.result.gain).toBe(1)
    expect(next.result.events.filter((event) => event.type === 'harvest')).toHaveLength(1)
  })
  test('800 ms par case, même à travers une grille entièrement vide', () => {
    const start = createSession(createInitialGame(), 0)
    const emitted = sessionReducer(start, { type: 'tick', now: 5000 })
    expect(emitted.pending[0]!.stepMs).toBe(800)
    expect(sessionReducer(emitted, { type: 'tick', now: 5799 })).toBe(emitted)
    const arrived = sessionReducer(emitted, { type: 'tick', now: 5800 })
    expect(arrived.pending[0]!.frontier[0]).toMatchObject({ position: { x: 1, y: 4 }, energy: 1, step: 1 })
    expect(arrived.pending[0]!.done).toBe(false)
    expect(arrived.game.coins).toBe(30)
    const forecast = simulateEmission(start.game.board)
    expect(forecast.events.filter((event) => event.type === 'move')).toHaveLength(8)
    expect(forecast.events.at(-1)).toMatchObject({ type: 'end', reason: 'edge', to: { x: 7, y: 4 } })
  })
  test('un sertissage fermé arrête réellement la progression après les cases vides', () => {
    const game = createInitialGame()
    game.board[31] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'NS' }
    const result = simulateEmission(game.board)
    expect(result.events.at(-1)).toMatchObject({ reason: 'connection', to: { x: 3, y: 4 } })
    expect(result.events.some((event) => event.to.x > 3)).toBe(false)
  })
  test('une gemme nouvellement achetée agit sur le flux déjà parti à son arrivée', () => {
    let session = sessionReducer(createSession(createInitialGame(), 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    const pending = session.pending
    session = sessionReducer(session, { type: 'buy', index: 1, destination: 29, offerId: session.game.offers[1]!.gem.id })
    expect(session.pending).toBe(pending)
    expect(session.game.coins).toBe(20)
    session = sessionReducer(session, { type: 'tick', now: 6600 })
    expect(session.pending[0]!.frontier[0]!.energy).toBe(1.1)
    session = sessionReducer(session, { type: 'buy', index: 0, destination: 30, offerId: session.game.offers[0]!.gem.id })
    expect(session.game.coins).toBe(14)
    session = sessionReducer(session, { type: 'tick', now: 7400 })
    expect(session.game.coins).toBe(15.1)
    expect(session.pending[0]!.result.gain).toBe(1.1)
    expect(sessionReducer(session, { type: 'tick', now: 7401 }).game.coins).toBe(15.1)
  })
  test('déplacer une récolte devant une boule conserve le flux et change sa rencontre future', () => {
    const game = createInitialGame()
    game.board[29] = { id: 'gem-1', kind: 'harvest', level: 0 }
    const emitted = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    let moved = sessionReducer(emitted, { type: 'transfer', from: { area: 'board', index: 29 }, to: { area: 'board', index: 31 } })
    expect(moved.pending).toBe(emitted.pending)
    expect(moved.pending[0]!.start).toBe(5000)
    expect(moved.nextAt).toBe(emitted.nextAt)
    moved = sessionReducer(moved, { type: 'tick', now: 6600 })
    expect(moved.game.coins).toBe(30)
    moved = sessionReducer(moved, { type: 'tick', now: 8200 })
    expect(moved.game.coins).toBe(31)
  })
  test('fusionner pendant le trajet conserve la boule et applique la nouvelle valeur à l’arrivée', () => {
    const game = createInitialGame()
    game.board[29] = { id: 'gem-1', kind: 'harvest', level: 0 }
    const emitted = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    let merged = sessionReducer(emitted, { type: 'buy', index: 0, destination: 29, offerId: game.offers[0]!.gem.id })
    expect(merged.pending).toBe(emitted.pending)
    merged = sessionReducer(merged, { type: 'tick', now: 6600 })
    expect(merged.game.coins).toBe(26)
  })
  test('recycler un amplificateur déjà traversé ne retire pas la puissance acquise', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 5, setting: 'EW', invested: 10 }
    game.board[30] = { id: 'gem-2', kind: 'harvest', level: 0 }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    expect(session.pending[0]!.frontier[0]!.energy).toBe(2)
    const pending = session.pending
    session = sessionReducer(session, { type: 'recycle', index: 28, gemId: 'gem-1' })
    expect(session.pending).toBe(pending)
    expect(session.game.coins).toBe(35)
    session = sessionReducer(session, { type: 'tick', now: 7400 })
    expect(session.game.coins).toBe(37)
    expect(session.pending[0]!.frontier[0]!.energy).toBe(2)
  })
  test('une pose sans rapport avec le trajet ne solde ni ne redémarre une émission', () => {
    const initial = createInitialGame()
    const emitted = sessionReducer(createSession(initial, 0), { type: 'tick', now: 5000 })
    const placed = sessionReducer(emitted, { type: 'buy', index: 0, destination: 0, offerId: initial.offers[0]!.gem.id })
    expect(placed.pending).toBe(emitted.pending)
    expect(placed.serial).toBe(1)
    expect(placed.nextAt).toBe(10000)
    expect(placed.game.coins).toBe(24)
  })
  test('une bifurcation crée des branches de puissance intégrale et des historiques distincts', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 5, setting: 'ESW' }
    const initial = createEmission()
    const next = advanceEmission(game.board, initial)
    expect(next.frontier.map((pulse) => pulse.energy)).toEqual([2, 2])
    expect(next.frontier[0]!.branch).not.toBe(next.frontier[1]!.branch)
    expect(next.frontier[0]!.visited).not.toBe(next.frontier[1]!.visited)
    expect(initial.frontier[0]!.visited.size).toBe(0)
    expect(initial.result.events).toHaveLength(1)
    expect(next.result.gain).toBe(0)
  })
  test('les arrivées incrémentales et la prévision statique donnent exactement les mêmes événements', () => {
    const game = createInitialGame()
    game.board[30] = { id: 'gem-1', kind: 'multiplier', level: 5, setting: 'ESW' }
    game.board[32] = { id: 'gem-2', kind: 'harvest', level: 3 }
    game.board[44] = { id: 'gem-3', kind: 'harvest', level: 1 }
    let running = createEmission()
    while (!running.done) running = advanceEmission(game.board, running)
    expect(running.result).toEqual(simulateEmission(game.board))
    expect(running.result.gain).toBe(14)
  })
  test('les flux simultanés ont des identités distinctes et terminent une seule fois', () => {
    let session = sessionReducer(createSession(createInitialGame(), 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 10000 })
    expect(session.pending.map((wave) => wave.id)).toEqual([1, 2])
    session = sessionReducer(session, { type: 'tick', now: 11400 })
    expect(session.game.stats.emissions).toBe(1)
    expect(session.pending[0]!.completedAt).toBe(10880)
    expect(sessionReducer(session, { type: 'tick', now: 11401 }).game.stats.emissions).toBe(1)
  })
  test('suspendre sauvegarde seulement les gains déjà récoltés, sans simuler les futures rencontres', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    game.board[34] = { id: 'gem-2', kind: 'harvest', level: 3 }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    expect(session.game.coins).toBe(31)
    session = sessionReducer(session, { type: 'suspend', now: 6000 })
    expect(session.game.coins).toBe(31)
    expect(session.pending).toHaveLength(0)
    expect(decodeSave(JSON.stringify(session.game)).game.coins).toBe(31)
    session = sessionReducer(session, { type: 'resume', now: 600000 })
    expect(sessionReducer(session, { type: 'tick', now: 600001 }).game.coins).toBe(31)
  })
  test('un tick tardif conserve les arrivées mais ne crée pas d’émissions de rattrapage', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 20000 })
    expect(session.game.coins).toBe(31)
    expect(session.game.stats.emissions).toBe(1)
    expect(session.serial).toBe(2)
    expect(session.nextAt).toBe(25000)
    expect(RULES.stepMs).toBe(800)
  })
})
