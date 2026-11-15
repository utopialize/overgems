import { describe, expect, test } from 'vitest'
import { canPlace, footprint, occupantAt, validFootprints } from './board'
import { DELTA, DIRECTIONS, gemValue } from './catalog'
import { simulateEmission } from './engine'
import { mergeGems } from './fusion'
import { buyOfferOnBoard, createInitialGame, recycleGem, transferGem } from './state'
import { createSession, sessionReducer } from './runtime'
import { decodeSave, validateGame } from './save'
import { estimateCircuit, estimateGemContribution, previewPlacement } from './analysis'
import { EXCAVATION_REWARDS, rollExcavationReward } from './rewards'
import type { Gem } from './types'

const major = (id = 'gem-1', level = 0, invested = 0): Gem => ({ id, kind: 'major', level, invested, rarity: 'rare' })
function fixture() { const game = createInitialGame(); game.stones.fill(false); return game }

describe('majeures : objet unique et quatre cellules', () => {
  test('une seule ancre, empreinte exacte, recherche depuis chaque quartier et limites', () => {
    const game = fixture(), gem = major()
    game.board[30] = gem
    expect(footprint(gem, 30)).toEqual([30, 31, 37, 38])
    for (const index of [30, 31, 37, 38]) expect(occupantAt(game.board, index)).toEqual({ gem, anchor: 30 })
    expect(game.board.filter(Boolean)).toHaveLength(1)
    expect(validFootprints(game.board, game.stones)).toBe(true)
    expect(footprint(gem, 54)).toEqual([54, 55, 61, 62])
    for (const anchor of [-1, 6, 56, 62, 63, 1.5, NaN]) expect(canPlace(game.board, game.stones, gem, anchor)).toBe(false)
    expect(occupantAt(game.board, 32)).toBeNull()
    expect(occupantAt(game.board, -1)).toBeNull()
  })
  test.each([30, 31, 37, 38])('un rocher sur n’importe laquelle des quatre cases (%s) refuse la pose sans perte', (index) => {
    const game = fixture()
    game.inventory[0] = major()
    game.stones[index] = true
    const before = JSON.stringify(game)
    const result = transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index: 30 })
    expect(result.game).toBe(game)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(game)).toBe(before)
  })
  test('une cellule couverte est occupée pour les achats, déplacements et grandes empreintes', () => {
    const game = fixture()
    game.board[30] = major()
    game.inventory[0] = { id: 'gem-2', kind: 'harvest', level: 0 }
    for (const index of [30, 31, 37, 38]) {
      expect(buyOfferOnBoard(game, 0, index, 'gem-8').game).toBe(game)
      expect(transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index }).game).toBe(game)
    }
    game.inventory[1] = major('gem-3')
    // Destination anchor is empty but another part of its footprint overlaps.
    expect(transferGem(game, { area: 'inventory', index: 1 }, { area: 'board', index: 23 }).game).toBe(game)
  })
  test('déplacement avec chevauchement de sa propre empreinte et stockage depuis un quartier couvert', () => {
    const game = fixture(); game.board[30] = major()
    const moved = transferGem(game, { area: 'board', index: 38 }, { area: 'board', index: 31 })
    expect(moved.ok).toBe(true)
    expect(moved.game.board[30]).toBeNull()
    expect(moved.game.board[31]!.id).toBe('gem-1')
    expect(validFootprints(moved.game.board, moved.game.stones)).toBe(true)
    const stored = transferGem(moved.game, { area: 'board', index: 39 }, { area: 'inventory', index: 11 })
    expect(stored.ok).toBe(true)
    expect(stored.game.board.filter(Boolean)).toHaveLength(0)
    expect(stored.game.inventory[11]!.kind).toBe('major')
    expect(transferGem(stored.game, { area: 'inventory', index: 11 }, { area: 'board', index: 54 }).ok).toBe(true)
  })
  test.each(Array.from({ length: 11 }, (_, level) => level))('fusion N%s : +4 exactement, famille et empreinte conservées', (level) => {
    const first = major('gem-1', level, 10), second = major('gem-2', level, 14)
    const merged = mergeGems(first, second)!
    expect(gemValue(merged)).toBe(gemValue(first) + 4)
    expect(merged).toMatchObject({ id: 'gem-2', kind: 'major', level: level + 1, invested: 24 })
    expect(footprint(merged, 30)).toEqual([30, 31, 37, 38])
    expect(mergeGems(first, { id: 'gem-3', kind: 'harvest', level, rarity: 'rare' })).toBeNull()
    expect(mergeGems(first, major('gem-3', level + 1))).toBeNull()
  })
  test('plafond N12, fusion depuis un quartier couvert et recyclage unique de toute la gemme', () => {
    expect(gemValue(major('gem-1', 11))).toBe(48)
    expect(mergeGems(major('gem-1', 11), major('gem-2', 11))).toBeNull()
    const game = fixture()
    game.board[30] = major('gem-1', 0, 10)
    game.inventory[0] = major('gem-2', 0, 14)
    const merged = sessionReducer(createSession(game, 0), { type: 'transfer', from: { area: 'inventory', index: 0 }, to: { area: 'board', index: 38 } })
    expect(merged.mergedId).toBe('gem-1')
    expect(merged.game.board.filter(Boolean)).toHaveLength(1)
    expect(merged.game.board[30]).toMatchObject({ kind: 'major', level: 1, invested: 24 })
    const sold = recycleGem(merged.game, 38, 'gem-1')
    expect(sold.game.coins).toBe(42)
    expect(sold.game.board.filter(Boolean)).toHaveLength(0)
    expect(recycleGem(sold.game, 30, 'gem-1').game).toBe(sold.game)
    expect(validateGame(sold.game)).toBe(true)
  })
  test.each([['board', 'board'], ['board', 'inventory'], ['inventory', 'board'], ['inventory', 'inventory']] as const)(
    'fusion majeure %s vers %s : un seul objet et libération complète de la source', (fromArea, toArea) => {
      const game = fixture(), from = fromArea === 'board' ? 28 : 0, to = toArea === 'board' ? 32 : 1
      game[fromArea][from] = major('gem-1', 0, 10)
      game[toArea][to] = major('gem-2', 0, 14)
      const result = transferGem(game, { area: fromArea, index: fromArea === 'board' ? from + 8 : from },
        { area: toArea, index: toArea === 'board' ? to + 8 : to })
      expect(result.ok).toBe(true)
      expect(result.game[fromArea][from]).toBeNull()
      expect(result.game[toArea][to]).toMatchObject({ id: 'gem-2', kind: 'major', level: 1, invested: 24 })
      expect([...result.game.board, ...result.game.inventory].filter(Boolean)).toHaveLength(1)
      expect(validateGame(result.game)).toBe(true)
      expect(result.game.coins).toBe(30)
    })
})

describe('majeures : récolte et branches', () => {
  for (const direction of DIRECTIONS) for (const lane of [0, 1]) {
    test('traversée ' + direction + ', voie ' + lane + ' : un seul gain et puissance inchangée', () => {
      const game = fixture(); game.board[23] = major() // (2,3) to (3,4)
      const [dx, dy] = DELTA[direction]
      const entry = direction === 'E' ? { x: 2, y: 3 + lane } : direction === 'W' ? { x: 3, y: 3 + lane }
        : direction === 'S' ? { x: 2 + lane, y: 3 } : { x: 2 + lane, y: 4 }
      const result = simulateEmission(game.board, { power: 2.5, source: { x: entry.x - dx, y: entry.y - dy, direction } })
      expect(result.gain).toBe(10)
      expect(result.events.filter((event) => event.type === 'harvest')).toHaveLength(1)
      expect(result.events.filter((event) => event.type === 'enter')).toHaveLength(2)
      expect(result.events.filter((event) => event.type === 'move').every((event) => event.energy === 2.5 && event.direction === direction)).toBe(true)
      expect(result.events.at(-1)?.reason).toBe('edge')
    })
  }
  test('deux branches qui se croisent dans la majeure récoltent chacune une fois', () => {
    const game = fixture(); game.board[23] = major()
    game.board[28] = { id: 'gem-2', kind: 'multiplier', level: 0, setting: 'ESW' }
    game.board[35] = { id: 'gem-3', kind: 'multiplier', level: 0, setting: 'NE' }
    game.board[38] = { id: 'gem-4', kind: 'multiplier', level: 0, setting: 'NW' }
    const result = simulateEmission(game.board)
    const harvests = result.events.filter((event) => event.type === 'harvest')
    expect(harvests).toHaveLength(2)
    expect(new Set(harvests.map((event) => event.branch)).size).toBe(2)
    expect(result.gain).toBe(9.724)
    expect(result.limited).toBe(false)
  })
  test('une branche revenant par une autre face ne récolte pas à nouveau', () => {
    const game = fixture(); game.board[30] = major()
    game.board[32] = { id: 'gem-2', kind: 'multiplier', level: 0, setting: 'SW' }
    game.board[39] = { id: 'gem-3', kind: 'multiplier', level: 0, setting: 'NW' }
    const result = simulateEmission(game.board)
    expect(result.gain).toBe(4)
    expect(result.events.filter((event) => event.type === 'enter' && [30, 31, 37, 38].includes(event.to.y * 7 + event.to.x))).toHaveLength(4)
  })
  test('déplacer puis stocker/reposer la majeure ne réinitialise pas la vague ni ses activations', () => {
    const game = fixture(); game.board[28] = major()
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    expect(session.game.coins).toBe(34)
    const start = session.pending[0]!.start
    for (const [from, to, now] of [[28, 29, 5801], [29, 30, 6601]]) {
      session = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: from! }, to: { area: 'board', index: to! }, now })
      session = sessionReducer(session, { type: 'tick', now: now! + 799 })
      expect(session.game.coins).toBe(34)
      expect(session.pending[0]!.start).toBe(start)
    }
    session = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 38 }, to: { area: 'inventory', index: 0 }, now: 7401 })
    session = sessionReducer(session, { type: 'transfer', from: { area: 'inventory', index: 0 }, to: { area: 'board', index: 33 }, now: 7402 })
    session = sessionReducer(session, { type: 'tick', now: 9800 })
    expect(session.pending[0]!.result.events.filter((event) => event.type === 'harvest')).toHaveLength(1)
    expect(session.game.coins).toBe(34)
  })
  test('rendement, contribution depuis un quartier couvert et aperçu retirent l’objet entier sans effet', () => {
    const game = fixture(); game.board[30] = major()
    const before = JSON.stringify(game)
    expect(estimateCircuit(game.board, game.stones).perSecond).toBe(0.8)
    expect(estimateGemContribution(game.board, 38, undefined, game.stones)).toEqual({ perEmission: 4, perSecond: 0.8 })
    expect(previewPlacement(game, { area: 'board', index: 38 }, null)).toMatchObject({ ok: true, deltaPerSecond: -0.8 })
    expect(previewPlacement(game, { area: 'board', index: 38 }, { area: 'inventory', index: 0 })).toMatchObject({ ok: true, deltaPerSecond: -0.8 })
    expect(JSON.stringify(game)).toBe(before)
  })
  test('après la majeure, une pierre arrête au contact sans altérer la récolte ni la puissance', () => {
    const game = fixture(); game.board[30] = major(); game.stones[32] = true
    const result = simulateEmission(game.board, { stones: game.stones })
    expect(result.gain).toBe(4)
    expect(result.events.at(-1)).toMatchObject({ type: 'end', reason: 'stone', to: { x: 4, y: 4 }, progress: 0.35, energy: 1 })
  })
})

describe('majeures : excavation et compatibilité des sauvegardes', () => {
  test('récompense rare configurée, stockable même sans aucune empreinte libre sur le plateau', () => {
    const game = createInitialGame()
    game.stones.fill(true)
    game.offers[0] = { item: { kind: 'pickaxe', id: 'tool-8' }, price: 8 }
    const rules = [{ kind: 'major' as const, weight: 1 }]
    const dug = buyOfferOnBoard(game, 0, 0, 'tool-8', rules)
    expect(dug.ok).toBe(true)
    expect(dug.reward).toMatchObject({ kind: 'major', level: 0, rarity: 'rare', invested: 0 })
    expect(dug.game.inventory[0]).toBe(dug.reward)
    expect(dug.game.board.filter(Boolean)).toHaveLength(0)
    expect(transferGem(dug.game, { area: 'inventory', index: 0 }, { area: 'board', index: 0 }).game).toBe(dug.game)
    expect(decodeSave(JSON.stringify(dug.game)).game).toEqual(dug.game)
    expect(EXCAVATION_REWARDS.find((rule) => rule.kind === 'major')!.weight).toBe(2)
    expect(rollExcavationReward(game.excavationSeed, 30, rules).gem!.kind).toBe('major')
  })
  test('sauvegarde d’un seul objet par majeure, inventaire, fusion et restauration', () => {
    const game = fixture(); game.board[30] = major(); game.inventory[11] = major('gem-2', 1)
    const restored = decodeSave(JSON.stringify(game))
    expect(restored.warning).toBe('')
    expect(restored.game).toEqual(game)
    expect(restored.game.board.filter(Boolean)).toHaveLength(1)
    expect(occupantAt(restored.game.board, 38)!.gem.id).toBe('gem-1')
  })
  test('inventaire plein : la majeure tirée est conservée avec la pierre et son hasard jusqu’à libérer une place', () => {
    const game = createInitialGame(); game.nextId = 100
    game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
    game.inventory = game.inventory.map((_, index) => ({ id: 'gem-' + (20 + index), kind: 'harvest', level: 0 }))
    const rules = [{ kind: 'major' as const, weight: 1 }], rock = game.stones.findIndex(Boolean)
    expect(buyOfferOnBoard(game, 0, rock, 'tool-8', rules).game).toBe(game)
    const freed = { ...game, inventory: [...game.inventory] }; freed.inventory[11] = null
    const dug = buyOfferOnBoard(freed, 0, rock, 'tool-8', rules)
    expect(dug.ok).toBe(true)
    expect(dug.game.inventory[11]).toMatchObject({ kind: 'major', invested: 0 })
    expect(dug.game.coins).toBe(22)
    expect(decodeSave(JSON.stringify(dug.game)).game).toEqual(dug.game)
  })
  test('anciennes sauvegardes préservées ; bords, chevauchements et pierres sous une majeure rejetés', () => {
    const legacy = createInitialGame()
    legacy.board[28] = { id: 'gem-1', kind: 'harvest', level: 7, invested: 500 }
    legacy.inventory[0] = { id: 'gem-2', kind: 'multiplier', level: 2, setting: 'SW' }
    legacy.coins = 123.456
    expect(decodeSave(JSON.stringify(legacy)).game).toEqual(legacy)
    for (const index of [6, 56, 62]) { const game = fixture(); game.board[index] = major(); expect(validateGame(game)).toBe(false) }
    for (const index of [30, 31, 37, 38]) {
      const game = fixture(); game.board[30] = major(); game.stones[index] = true
      expect(decodeSave(JSON.stringify(game)).warning).not.toBe('')
    }
    for (const index of [31, 37, 38]) {
      const game = fixture(); game.board[30] = major(); game.board[index] = major('gem-2')
      expect(validateGame(game)).toBe(false)
    }
  })
})
