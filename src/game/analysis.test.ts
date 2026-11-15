import { describe, expect, test } from 'vitest'
import { estimateCircuit, estimateGemContribution, previewPlacement } from './analysis'
import { createInitialGame } from './state'
import { createSession, sessionReducer } from './runtime'
import { decodeSave } from './save'

function producingGame() {
  const game = createInitialGame()
  game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 9, setting: 'EW' }
  game.board[29] = { id: 'gem-2', kind: 'harvest', level: 0, invested: 6 }
  return game
}

describe('analyse sans effet sur la partie', () => {
  test('rendement du plateau fixe, indépendant du dernier flux et de la pause', () => {
    const game = producingGame()
    game.stats.lastGain = 858
    game.settings.paused = true
    expect(estimateCircuit(game.board)).toEqual({ perEmission: 2, perSecond: 0.4, limited: false })
    expect(estimateCircuit(createInitialGame().board)).toEqual({ perEmission: 0, perSecond: 0, limited: false })
  })
  test('contribution marginale d’une récolte et d’une multiplicatrice', () => {
    const game = producingGame()
    expect(estimateGemContribution(game.board, 29)).toEqual({ perEmission: 2, perSecond: 0.4 })
    expect(estimateGemContribution(game.board, 28)).toEqual({ perEmission: 1, perSecond: 0.2 })
    expect(estimateGemContribution(game.board, 0)).toBeNull()
  })
  test('la contribution inclut les bifurcations et leurs récoltes', () => {
    const game = producingGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 9, setting: 'ESW' }
    game.board[35] = { id: 'gem-3', kind: 'harvest', level: 0 }
    expect(estimateGemContribution(game.board, 28)).toEqual({ perEmission: 3, perSecond: 0.6 })
  })
  test('une gemme bloquante peut avoir une contribution négative', () => {
    const game = producingGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'NS' }
    expect(estimateGemContribution(game.board, 28)).toEqual({ perEmission: -1, perSecond: -0.2 })
  })
  test('aperçu d’un achat avec fusion : nouveau rendement, sans débit ni remplacement d’offre', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    const before = JSON.stringify(game)
    const preview = previewPlacement(game, { area: 'shop', index: 0, offerId: 'gem-8' }, 28)
    expect(preview).toMatchObject({ ok: true, estimate: { perEmission: 2, perSecond: 0.4 }, deltaPerSecond: 0.2 })
    expect(JSON.stringify(game)).toBe(before)
  })
  test('aperçu d’un déplacement, d’un recyclage et d’une position inchangée', () => {
    const game = producingGame()
    expect(previewPlacement(game, { area: 'board', index: 28 }, 30)).toMatchObject({ ok: true, deltaPerSecond: -0.2 })
    expect(previewPlacement(game, { area: 'board', index: 29 }, null)).toMatchObject({ ok: true, recycling: true, deltaPerSecond: -0.4 })
    expect(previewPlacement(game, { area: 'board', index: 28 }, 28)).toMatchObject({ ok: true, deltaPerSecond: 0 })
    expect(game.coins).toBe(30)
    expect(game.board[28]!.id).toBe('gem-1')
    expect(game.stats.emissions).toBe(0)
  })
  test('les aperçus refusent les poses incompatibles, périmées, hors grille et sans fonds', () => {
    const game = producingGame()
    const before = JSON.stringify(game)
    for (const preview of [
      previewPlacement(game, { area: 'shop', index: 0, offerId: 'gem-8' }, 28),
      previewPlacement(game, { area: 'shop', index: 0, offerId: 'gem-0' }, 30),
      previewPlacement(game, { area: 'board', index: 28 }, 63),
      previewPlacement(game, { area: 'board', index: 0 }, 0),
      previewPlacement({ ...game, coins: 0 }, { area: 'shop', index: 0, offerId: 'gem-8' }, 30),
    ]) expect(preview.ok).toBe(false)
    expect(JSON.stringify(game)).toBe(before)
  })
  test('une estimation tronquée est signalée et ne produit pas de fausse différence', () => {
    const game = createInitialGame()
    game.board = game.board.map((_, index) => ({ id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' }))
    expect(estimateCircuit(game.board).limited).toBe(true)
    expect(estimateGemContribution(game.board, 28)).toBeNull()
    expect(previewPlacement(game, { area: 'board', index: 28 }, null)).toMatchObject({ ok: true, deltaPerSecond: null })
  })
  test('changement de vue et analyses conservent les flux, leur échéance, le solde et les statistiques', () => {
    const session = sessionReducer(createSession(producingGame(), 0), { type: 'tick', now: 5000 })
    let viewed = session
    for (const viewMode of ['advanced', 'simple', 'advanced'] as const) {
      viewed = sessionReducer(viewed, { type: 'settings', patch: { viewMode } })
      estimateCircuit(viewed.game.board)
      estimateGemContribution(viewed.game.board, 28)
      previewPlacement(viewed.game, { area: 'board', index: 28 }, 30)
      expect(viewed.pending).toBe(session.pending)
      expect(viewed.nextAt).toBe(session.nextAt)
      expect(viewed.serial).toBe(session.serial)
      expect(viewed.game.board).toBe(session.game.board)
      expect(viewed.game.coins).toBe(session.game.coins)
      expect(viewed.game.stats).toBe(session.game.stats)
    }
    const control = sessionReducer(session, { type: 'tick', now: 6600 })
    const measured = sessionReducer(viewed, { type: 'tick', now: 6600 })
    expect(measured.pending).toEqual(control.pending)
    expect(measured.game.coins).toBe(control.game.coins)
    expect(measured.game.stats).toEqual(control.game.stats)
  })
  test('le mode est mémorisé et les anciennes parties adoptent la vue épurée', () => {
    const game = producingGame()
    game.settings.viewMode = 'advanced'
    expect(decodeSave(JSON.stringify(game)).game.settings.viewMode).toBe('advanced')
    const legacy = { ...game, settings: { paused: false, reducedMotion: false } }
    const restored = decodeSave(JSON.stringify(legacy))
    expect(restored.warning).toBe('')
    expect(restored.game.settings.viewMode).toBe('simple')
    expect(restored.game.board).toEqual(game.board)
    for (const viewMode of [null, 'other', 1]) {
      expect(decodeSave(JSON.stringify({ ...game, settings: { ...game.settings, viewMode } })).warning).not.toBe('')
    }
  })
})
