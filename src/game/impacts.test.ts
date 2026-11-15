import { describe, expect, test } from 'vitest'
import { createInitialGame } from './state'
import { createSession, sessionReducer } from './runtime'
import { simulateEmission } from './engine'
import { powerLabel } from '../pixi/pulseVisuals'

describe('puissance et collisions', () => {
  test('trois ×1,1 conservent la puissance composée ; seule la bulle est arrondie', () => {
    const game = createInitialGame()
    for (let x = 0; x < 3; x++) game.board[28 + x] = { id: 'gem-' + (x + 1), kind: 'multiplier', level: 0, setting: 'EW' }
    game.board[31] = { id: 'gem-4', kind: 'harvest', level: 0 }
    const result = simulateEmission(game.board)
    const powers = result.events.filter((event) => event.type === 'multiply').map((event) => event.energy)
    expect(powers[0]).toBeCloseTo(1.1, 12)
    expect(powers[1]).toBeCloseTo(1.21, 12)
    expect(powers[2]).toBeCloseTo(1.331, 12)
    expect(powers.map(powerLabel)).toEqual(['1,1', '1,2', '1,3'])
    expect(powerLabel(1)).toBe('1,0')
    expect(powerLabel(1.4641)).toBe('1,5')
    expect(result.gain).toBe(1.331)
  })
  test('au bord, la branche termine au contact plutôt qu’au centre d’une case extérieure', () => {
    let session = sessionReducer(createSession(createInitialGame(), 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 10879 })
    expect(session.pending.find((wave) => wave.id === 1)!.done).toBe(false)
    session = sessionReducer(session, { type: 'tick', now: 10880 })
    const ended = session.pending.find((wave) => wave.id === 1)!
    expect(ended.frontier).toHaveLength(0)
    expect(ended.completedAt).toBe(10880)
    expect(ended.result.events.at(-1)).toMatchObject({ type: 'end', reason: 'edge', atStep: 7.35 })
    expect(ended.result.events.at(-1)!.progress).toBeCloseTo(0.35, 12)
  })
  test('un obstacle termine la branche au contact sans entrer dans la gemme', () => {
    const game = createInitialGame()
    game.board[30] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'NS' }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 6879 })
    expect(session.pending[0]!.done).toBe(false)
    session = sessionReducer(session, { type: 'tick', now: 6880 })
    expect(session.pending[0]!.completedAt).toBe(6880)
    expect(session.pending[0]!.result.events.at(-1)).toMatchObject({ reason: 'connection', atStep: 2.35 })
    expect(session.pending[0]!.result.events.some((event) => event.type === 'enter' && event.to.x === 2)).toBe(false)
    expect(session.game.coins).toBe(30)
  })
  test('une branche qui éclate ne détruit pas ses branches sœurs', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'ESW' }
    game.board[29] = { id: 'gem-2', kind: 'multiplier', level: 0, setting: 'NS' }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 6080 })
    expect(session.pending[0]!.done).toBe(false)
    expect(session.pending[0]!.frontier).toHaveLength(1)
    expect(session.pending[0]!.frontier[0]).toMatchObject({ direction: 'S', energy: 1.1 })
    session = sessionReducer(session, { type: 'tick', now: 6600 })
    expect(session.pending[0]!.frontier[0]!.position).toEqual({ x: 0, y: 6 })
  })
  test('poser un obstacle sur une boule en mouvement provoque le contact immédiatement', () => {
    const game = createInitialGame()
    game.offers[1]!.gem = { id: 'gem-9', kind: 'multiplier', level: 0, setting: 'NS' }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'buy', index: 1, destination: 29, offerId: 'gem-9', now: 6450 })
    expect(session.pending[0]!.completedAt).toBe(6450)
    expect(session.pending[0]!.result.events.at(-1)).toMatchObject({ reason: 'connection', progress: 0.8125 })
    expect(session.game.coins).toBe(20)
  })
  test('déplacer un obstacle avant le contact laisse passer la boule', () => {
    const game = createInitialGame()
    game.board[29] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'NS' }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 29 }, to: { area: 'board', index: 0 }, now: 6000 })
    session = sessionReducer(session, { type: 'tick', now: 6600 })
    expect(session.pending[0]!.done).toBe(false)
    expect(session.pending[0]!.frontier[0]!.position).toEqual({ x: 2, y: 4 })
    expect(session.pending[0]!.result.events.some((event) => event.reason === 'connection')).toBe(false)
  })
  test('un placement après une arrivée ne peut pas bloquer rétroactivement la boule', () => {
    const game = createInitialGame()
    game.offers[1]!.gem = { id: 'gem-9', kind: 'multiplier', level: 0, setting: 'NS' }
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'buy', index: 1, destination: 28, offerId: 'gem-9', now: 5900 })
    expect(session.pending[0]!.done).toBe(false)
    expect(session.pending[0]!.frontier[0]!.position).toEqual({ x: 1, y: 4 })
  })
})
