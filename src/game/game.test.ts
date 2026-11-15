import { describe, expect, test } from 'vitest'
import { DELTA, DIRECTIONS, MULTIPLIER_VALUES, RULES, SETTINGS, gemValue } from './catalog'
import { simulateEmission } from './engine'
import { canMerge, mergeGems } from './fusion'
import { createInitialGame, transferGem, buyOffer, buyOfferOnBoard, rerollOffers } from './state'
import { createSession, sessionReducer } from './runtime'
import { decodeSave, validateGame } from './save'
import type { Gem, Setting, Slot } from './types'

let serial = 100
const harvest = (level = 0): Gem => ({ id: `gem-${serial++}`, kind: 'harvest', level })
const multiplier = (setting: Setting, level = 0): Gem => ({ id: `gem-${serial++}`, kind: 'multiplier', level, setting })
const emptyBoard = (): (Gem | null)[] => Array.from({ length: 63 }, () => null)
const at = (x: number, y: number) => y * 7 + x
const emit = (board: (Gem | null)[]) => simulateEmission(board, { source: { x: -1, y: 0, direction: 'E' } })

// An explicit producing fixture keeps propagation tests independent of the empty start.
function createProducingGame() {
  const game = createInitialGame()
  game.stones.fill(false)
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 1 }
  game.board[29] = { id: 'gem-2', kind: 'multiplier', level: 4, setting: 'ESW' }
  game.board[30] = { id: 'gem-3', kind: 'harvest', level: 0 }
  game.board[31] = { id: 'gem-4', kind: 'harvest', level: 0 }
  game.board[36] = { id: 'gem-5', kind: 'harvest', level: 0 }
  game.inventory[0] = { id: 'gem-6', kind: 'harvest', level: 0 }
  game.inventory[1] = { id: 'gem-7', kind: 'multiplier', level: 1, setting: 'EW' }
  return game
}

describe('récolte et propagation', () => {
  test.each(DIRECTIONS)('traversée %s, énergie inchangée et gain proportionnel', (direction) => {
    const board = emptyBoard()
    board[at(3, 3)] = harvest(4)
    const [dx, dy] = DELTA[direction]
    const result = simulateEmission(board, { power: 20, source: { x: 3 - dx, y: 3 - dy, direction } })
    expect(result.gain).toBe(100)
    expect(result.events.find((e) => e.type === 'harvest')).toMatchObject({ energy: 20, direction })
    expect(result.events.filter((e) => e.type === 'move').at(-1)).toMatchObject({ energy: 20, direction })
  })
  test('exemple de référence : +2 → ×2 en T → deux +5 = 22 Éclats', () => {
    const board = emptyBoard()
    board[0] = harvest(1)
    board[1] = multiplier('ESW', 9)
    board[2] = harvest(4)
    board[8] = harvest(4)
    const result = emit(board)
    expect(result.gain).toBe(22)
    expect(result.events.filter((e) => e.type === 'harvest').map((e) => e.gain)).toEqual([2, 10, 10])
    expect(result.events.filter((e) => e.type === 'move' && e.step === 2).map((e) => e.energy)).toEqual([2, 2])
  })
  test.each(SETTINGS)('sertissage %s : les quatre entrées sont vérifiées', (setting) => {
    for (const direction of DIRECTIONS) {
      const board = emptyBoard()
      board[at(3, 3)] = multiplier(setting, 9)
      const [dx, dy] = DELTA[direction]
      const result = simulateEmission(board, { power: 10, source: { x: 3 - dx, y: 3 - dy, direction } })
      const entrance = DIRECTIONS[(DIRECTIONS.indexOf(direction) + 2) % 4]!
      const accepts = setting.includes(entrance)
      expect(result.events.some((e) => e.type === 'multiply')).toBe(accepts)
      expect(result.gain).toBe(0)
      const outgoing = result.events.filter((e) => e.type === 'move' && e.step === 1)
      expect(outgoing.map((e) => e.direction)).toEqual(accepts ? DIRECTIONS.filter((d) => setting.includes(d) && d !== entrance) : [])
      expect(outgoing.every((e) => e.energy === 20)).toBe(true)
    }
  })
  test('deux branches se croisent dans une récolte sans se confondre', () => {
    const board = emptyBoard()
    board[at(0, 0)] = multiplier('ESW')
    board[at(1, 0)] = harvest(1)
    board[at(2, 0)] = multiplier('SW')
    board[at(0, 1)] = multiplier('NE')
    board[at(1, 1)] = harvest(1)
    board[at(2, 1)] = harvest(4)
    const result = emit(board)
    const crossings = result.events.filter((e) => e.type === 'harvest' && e.to.x === 2 && e.to.y === 1)
    expect(crossings).toHaveLength(2)
    expect(new Set(crossings.map((e) => e.direction))).toEqual(new Set(['E', 'S']))
    expect(result.gain).toBe(16.72)
  })
  test('ordre des gemmes : amplifier avant la récolte est plus rentable', () => {
    const board = emptyBoard()
    board[0] = multiplier('EW', 9); board[1] = harvest(4)
    expect(emit(board).gain).toBe(10)
    ;[board[0], board[1]] = [board[1]!, board[0]!]
    expect(emit(board).gain).toBe(5)
  })
  test('cases vides et bords arrêtent les branches', () => {
    expect(emit(emptyBoard()).gain).toBe(0)
    const board = emptyBoard()
    for (let x = 0; x < 7; x++) board[x] = harvest()
    const result = emit(board)
    expect(result.gain).toBe(7)
    expect(result.events.at(-1)?.reason).toBe('edge')
  })
  test('une boucle s’arrête sur un état déjà parcouru par sa branche', () => {
    const board = emptyBoard()
    board[0] = multiplier('ESW'); board[1] = multiplier('SW')
    board[7] = multiplier('NE'); board[8] = multiplier('NW')
    const result = emit(board)
    expect(result.events.some((e) => e.reason === 'loop')).toBe(true)
    expect(result.events.length).toBeLessThan(150)
    expect(result.limited).toBe(false)
  })
  test('ramifications exponentielles et valeurs excessives restent bornées et signalées', () => {
    const board = emptyBoard().map(() => multiplier('NESW'))
    const result = simulateEmission(board, { maxEvents: 128 })
    expect(result.limited).toBe(true)
    expect(result.events.length).toBeLessThanOrEqual(128)
    expect(simulateEmission(board, { power: 10, maxEnergy: 10 }).limited).toBe(true)
    expect(simulateEmission(board, { power: Infinity }).limited).toBe(true)
  })
  test('le moteur est déterministe, indépendant des émissions précédentes et ne modifie pas le plateau', () => {
    const board = createProducingGame().board
    const before = JSON.stringify(board)
    expect(simulateEmission(board)).toEqual(simulateEmission(board))
    expect(JSON.stringify(board)).toBe(before)
  })
})

describe('fusion et intégrité des objets', () => {
  test.each(Array.from({ length: 11 }, (_, level) => level))('récolte au niveau d’indice %s : chaque fusion ajoute exactement 1', (level) => {
    const first = harvest(level), second = harvest(level)
    const result = mergeGems(first, second)!
    expect(gemValue(first)).toBe(level + 1)
    expect(gemValue(result)).toBe(level + 2)
    expect(gemValue(result) - gemValue(first)).toBe(1)
    expect(result.level).toBe(level + 1)
  })
  test.each(Array.from({ length: 11 }, (_, level) => level))('multiplicatrice au niveau d’indice %s : chaque fusion ajoute exactement 0,1 au facteur', (level) => {
    const first = multiplier('ESW', level), second = multiplier('ESW', level)
    const result = mergeGems(first, second)!
    expect(gemValue(first)).toBe((level + 11) / 10)
    expect(gemValue(result)).toBe((level + 12) / 10)
    expect(gemValue(result) - gemValue(first)).toBeCloseTo(0.1, 12)
    expect(result).toMatchObject({ level: level + 1, setting: 'ESW' })
  })
  test('les deux catégories s’arrêtent au niveau 12 : +12 et ×2,2', () => {
    expect(gemValue(harvest(11))).toBe(12)
    expect(gemValue(multiplier('EW', 11))).toBe(2.2)
    expect(mergeGems(harvest(11), harvest(11))).toBeNull()
    expect(mergeGems(multiplier('EW', 11), multiplier('EW', 11))).toBeNull()
  })
  test('fusion de deux récoltes identiques', () => {
    const result = mergeGems(harvest(), harvest())!
    expect(result.kind).toBe('harvest')
    expect(gemValue(result)).toBe(2)
  })
  test.each(SETTINGS)('le sertissage %s reste immuable après fusion', (setting) => {
    const result = mergeGems(multiplier(setting), multiplier(setting))!
    expect(result).toMatchObject({ kind: 'multiplier', level: 1, setting })
    expect(gemValue(result)).toBe(MULTIPLIER_VALUES[1])
  })
  test('catégories, niveaux et géométries distincts ne fusionnent pas', () => {
    expect(canMerge(harvest(), multiplier('EW'))).toBe(false)
    expect(canMerge(harvest(), harvest(1))).toBe(false)
    expect(canMerge(multiplier('EW'), multiplier('NS'))).toBe(false)
    expect(canMerge(multiplier('ESW'), multiplier('NES'))).toBe(false)
    expect(canMerge(harvest(11), harvest(11))).toBe(false)
  })
  const pairs: [Slot['area'], Slot['area']][] = [['board', 'board'], ['inventory', 'inventory'], ['board', 'inventory'], ['inventory', 'board']]
  test.each(pairs)('fusion de %s vers %s et libération de la source', (fromArea, toArea) => {
    const game = createProducingGame()
    game[fromArea][0] = multiplier('ESW')
    game[toArea][1] = multiplier('ESW')
    const transaction = transferGem(game, { area: fromArea, index: 0 }, { area: toArea, index: 1 })
    expect(transaction.ok).toBe(true)
    expect(transaction.game[fromArea][0]).toBeNull()
    expect(transaction.game[toArea][1]).toMatchObject({ kind: 'multiplier', level: 1, setting: 'ESW' })
    expect(game[fromArea][0]).not.toBeNull()
  })
  test('un déplacement conserve identité et sertissage ; une action invalide ne perd rien', () => {
    const game = createProducingGame()
    const moved = transferGem(game, { area: 'board', index: 29 }, { area: 'board', index: 0 })
    expect(moved.game.board[0]).toBe(game.board[29])
    for (const index of [-1, 63, 0.5, NaN]) {
      expect(transferGem(game, { area: 'board', index: 29 }, { area: 'board', index }).game).toBe(game)
    }
    expect(transferGem(game, { area: 'board', index: 29 }, { area: 'board', index: 28 }).game).toBe(game)
  })
})

describe('économie, horloge et sauvegarde', () => {
  test('une sauvegarde existante garde niveaux, objets, monnaie et investissements avec les nouvelles valeurs linéaires', () => {
    const game = createInitialGame()
    game.coins = 123.456
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 11, invested: 700 }
    game.inventory[0] = { id: 'gem-2', kind: 'multiplier', level: 11, setting: 'ESW', invested: 900 }
    const restored = decodeSave(JSON.stringify(game))
    expect(restored.warning).toBe('')
    expect(restored.game).toEqual(game)
    expect(gemValue(restored.game.board[28]!)).toBe(12)
    expect(gemValue(restored.game.inventory[0]!)).toBe(2.2)
  })
  test('nouvelle partie : grille vide, réserve dormante vide et premier achat abordable', () => {
    const game = createInitialGame()
    expect(game.board.every((gem) => gem === null)).toBe(true)
    expect(game.inventory.every((gem) => gem === null)).toBe(true)
    expect(game.offers[0]!.item.kind).toBe('harvest')
    expect(game.coins).toBeGreaterThanOrEqual(game.offers[0]!.price)
    expect(validateGame(game)).toBe(true)
  })
  test('achat directement posé : un seul débit, sans passage par la réserve', () => {
    const game = createInitialGame()
    const offer = game.offers[0]!
    const result = buyOfferOnBoard(game, 0, 28, offer.item.id)
    expect(result.ok).toBe(true)
    expect(result.game.board[28]).toEqual({ ...offer.item, invested: offer.price })
    expect(result.game.coins).toBe(game.coins - offer.price)
    expect(result.game.inventory).toBe(game.inventory)
    expect(result.game.offers[0]!.item.id).not.toBe(offer.item.id)
    expect(validateGame(result.game)).toBe(true)
  })
  test('achat et fusion en une pose : niveau augmenté, prix unique', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    const result = buyOfferOnBoard(game, 0, 28, game.offers[0]!.item.id)
    expect(result.merged).toBe(true)
    expect(result.game.board[28]).toEqual({ id: 'gem-1', kind: 'harvest', level: 1, invested: 12 })
    expect(result.game.coins).toBe(24)
    expect(validateGame(result.game)).toBe(true)
  })
  test('dépôt incompatible, hors grille, offre périmée et fonds insuffisants : aucun débit', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'EW' }
    for (const destination of [28, -1, 63, 0.5, NaN]) {
      expect(buyOfferOnBoard(game, 0, destination, game.offers[0]!.item.id).game).toBe(game)
    }
    expect(buyOfferOnBoard(game, 0, 29, 'gem-0').game).toBe(game)
    expect(buyOfferOnBoard(game, 99, 29, 'gem-0').game).toBe(game)
    game.coins = 0
    expect(buyOfferOnBoard(game, 0, 29, game.offers[0]!.item.id).game).toBe(game)
  })
  test('l’horloge émet exactement à 5 secondes, avec une puissance initiale de 1', () => {
    const session = createSession(createInitialGame(), 0)
    expect(sessionReducer(session, { type: 'tick', now: 4999 })).toBe(session)
    const first = sessionReducer(session, { type: 'tick', now: 5000 })
    expect(first.serial).toBe(1)
    expect(first.pending[0]!.result.events[0]!.energy).toBe(1)
    expect(first.pending[0]!.result.gain).toBe(0)
    const beforeNext = sessionReducer(first, { type: 'tick', now: 9999 })
    expect(beforeNext.serial).toBe(1)
    expect(beforeNext.game.coins).toBe(30)
    expect(sessionReducer(beforeNext, { type: 'tick', now: 10000 }).serial).toBe(2)
  })
  test('un achat périmé ne redébite pas et une pose refusée ne coupe pas le flux', () => {
    let session = createSession(createProducingGame(), 0)
    const offerId = session.game.offers[0]!.item.id
    session = sessionReducer(session, { type: 'buy', index: 0, destination: 0, offerId })
    const balance = session.game.coins
    const duplicate = sessionReducer(session, { type: 'buy', index: 0, destination: 1, offerId })
    expect(duplicate.game.coins).toBe(balance)
    const emitting = sessionReducer(session, { type: 'tick', now: 5000 })
    const denied = sessionReducer(emitting, { type: 'buy', index: 2, destination: 29, offerId: emitting.game.offers[2]!.item.id })
    expect(denied.game).toBe(emitting.game)
    expect(denied.pending).toBe(emitting.pending)
  })
  test('les valeurs flottantes proviennent des vrais gains et facteurs du moteur', () => {
    const result = simulateEmission(createProducingGame().board)
    expect(result.events.find((event) => event.type === 'multiply')).toMatchObject({ factor: 1.5, energy: 1.5 })
    expect(result.events.filter((event) => event.type === 'harvest').map((event) => event.gain)).toEqual([2, 1.5, 1.5, 1.5])
  })
  test('achat : un seul paiement, une gemme dans la réserve et une offre remplacée', () => {
    const game = createProducingGame()
    const next = buyOffer(game, 0).game
    expect(next.coins).toBe(24)
    expect(next.inventory[2]).toEqual({ ...game.offers[0]!.item, invested: game.offers[0]!.price })
    expect(next.offers[0]!.item.id).not.toBe(game.offers[0]!.item.id)
    expect(next.offers.slice(1)).toEqual(game.offers.slice(1))
    expect(validateGame(next)).toBe(true)
  })
  test('monnaie insuffisante ou réserve pleine : aucun débit et aucune perte', () => {
    const game = createProducingGame()
    game.coins = 0
    expect(buyOffer(game, 0).game).toBe(game)
    expect(rerollOffers(game).game).toBe(game)
    game.coins = 100
    game.inventory = game.inventory.map(() => harvest())
    expect(buyOffer(game, 0).game).toBe(game)
  })
  test('renouvellement reproductible et prix exact', () => {
    const game = createProducingGame()
    expect(rerollOffers(game)).toEqual(rerollOffers(game))
    expect(rerollOffers(game).game.coins).toBe(game.coins - RULES.rerollCost)
    expect(new Set(rerollOffers(game).game.offers.map((o) => o.item.id)).size).toBe(3)
  })
  test('les récoltes arrivent au passage et la statistique de fin est créditée une seule fois', () => {
    const initial = createSession(createProducingGame(), 0)
    const emitted = sessionReducer(initial, { type: 'tick', now: 5000 })
    expect(emitted.game.coins).toBe(30)
    const collected = sessionReducer(emitted, { type: 'tick', now: 5800 })
    expect(collected.game.coins).toBe(32)
    expect(collected.game.stats.emissions).toBe(0)
    const completed = sessionReducer(collected, { type: 'tick', now: 12000 })
    expect(completed.game.stats.lastGain).toBe(6.5)
    expect(completed.game.coins).toBe(36.5)
    expect(sessionReducer(completed, { type: 'tick', now: 12100 })).toBe(completed)
    const restored = decodeSave(JSON.stringify(completed.game)).game
    expect(createSession(restored, 0).game.coins).toBe(36.5)
  })
  test('pause, reprise et dix minutes de simulation sans production hors ligne', () => {
    let session = createSession(createProducingGame(), 0)
    session = sessionReducer(session, { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'suspend', now: 5100 })
    const balance = session.game.coins
    session = sessionReducer(session, { type: 'resume', now: 600000 })
    session = sessionReducer(session, { type: 'tick', now: 600001 })
    expect(session.game.coins).toBe(balance)
    for (let now = 600100; now <= 1200000; now += 100) session = sessionReducer(session, { type: 'tick', now })
    expect(session.game.stats.emissions).toBeGreaterThanOrEqual(118)
    expect(session.game.stats.lastGain).toBe(6.5)
    expect(validateGame(session.game)).toBe(true)
    const paused = sessionReducer(session, { type: 'settings', patch: { paused: true } })
    expect(sessionReducer(paused, { type: 'tick', now: 1e9 })).toBe(paused)
  })
  test('un déplacement conserve le trajet en cours et ne crédite aucun gain futur', () => {
    const emitted = sessionReducer(createSession(createProducingGame(), 0), { type: 'tick', now: 5000 })
    let session = sessionReducer(emitted, { type: 'transfer', from: { area: 'board', index: 31 }, to: { area: 'board', index: 32 } })
    expect(session.game.coins).toBe(30)
    expect(session.pending).toBe(emitted.pending)
    session = sessionReducer(session, { type: 'tick', now: 8200 })
    expect(session.game.coins).toBe(35)
    session = sessionReducer(session, { type: 'tick', now: 9000 })
    expect(session.game.coins).toBe(36.5)
    expect(sessionReducer(session, { type: 'tick', now: 9050 }).game.coins).toBe(36.5)
  })
  test('sauvegarde complète et données invalides', () => {
    const game = createProducingGame()
    expect(decodeSave(JSON.stringify(game))).toEqual({ game, warning: '' })
    expect(decodeSave(null).warning).toBe('')
    for (const raw of ['{', '{}', 'null', JSON.stringify({ ...game, version: 2 }), JSON.stringify({ ...game, coins: -10 })]) {
      expect(decodeSave(raw).warning).not.toBe('')
    }
    game.inventory[0] = game.board[28]!
    expect(validateGame(game)).toBe(false)
  })
})
