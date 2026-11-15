import { expect, test } from 'vitest'
import { buyExpansion, expansionPrice, remapIndex, WORLD_RULES } from './world'
import { createInitialGame, buyOfferOnBoard, transferGem, recycleGem } from './state'
import { createSession, sessionReducer } from './runtime'
import { simulateEmission } from './engine'
import { footprint, occupantAt } from './board'
import { decodeSave, validateGame } from './save'
import { estimateCircuit, previewPlacement } from './analysis'

function expanded(columns = 14) {
  let game = createInitialGame(); game.coins = 10000
  while (game.columns < columns) game = buyExpansion(game).game
  return game
}
test('quatre extensions permanentes : tarifs, rochers intégraux et contenu initial conservé', () => {
  let game = createInitialGame(); game.coins = 2000
  game.board[30] = { id: 'gem-1', kind: 'major', level: 1, rarity: 'rare', invested: 20 }
  const gem = game.board[30]
  for (const [columns, price] of [[14, 100], [21, 200], [28, 400], [35, 800]]) {
    const before = game, raw = JSON.stringify(game)
    expect(expansionPrice(game.columns)).toBe(price)
    const transaction = buyExpansion(game)
    expect(transaction.ok).toBe(true); game = transaction.game
    expect(game.columns).toBe(columns)
    expect(game.coins).toBe(before.coins - price!)
    for (let y = 0; y < 9; y++) for (let x = 0; x < game.columns; x++) {
      if (x >= before.columns) { expect(game.stones[y * game.columns + x]).toBe(true); expect(game.board[y * game.columns + x]).toBeNull() }
      else { expect(game.stones[y * game.columns + x]).toBe(before.stones[y * before.columns + x]); expect(game.board[y * game.columns + x]).toBe(before.board[y * before.columns + x]) }
    }
    expect(game.board[4 * game.columns + 2]).toBe(gem)
    expect(game.inventory).toBe(before.inventory); expect(game.seed).toBe(before.seed)
    expect(game.excavationSeed).toBe(before.excavationSeed); expect(game.purchases).toBe(before.purchases)
    expect(game.stats).toBe(before.stats); expect(JSON.stringify(before)).toBe(raw)
    expect(decodeSave(JSON.stringify(game)).game).toEqual(game)
  }
  expect(game.coins).toBe(500)
  expect(buyExpansion(game).game).toBe(game)
  expect(WORLD_RULES.maxColumns).toBe(35)
})
test('refus sans fonds sans modification ; aucune nécessité de finir les excavations précédentes', () => {
  const initial = createInitialGame()
  expect(buyExpansion(initial).game).toBe(initial)
  initial.coins = 300
  const first = buyExpansion(initial).game
  expect(first.stones.filter(Boolean)).toHaveLength(81)
  expect(buyExpansion(first).game.columns).toBe(21)
})
test('majeure à cheval sur deux zones : quatre cellules, une identité, fusion et recyclage entiers', () => {
  const game = expanded()
  const anchor = 4 * 14 + 6
  const gem = { id: 'gem-1', kind: 'major' as const, rarity: 'rare' as const, level: 0, invested: 0 }
  game.inventory[0] = gem
  expect(transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index: anchor }).game).toBe(game)
  for (const index of footprint(gem, anchor, 14)) game.stones[index] = false
  const placed = transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index: anchor }).game
  expect(placed.board[anchor]).toBe(gem)
  for (const index of footprint(gem, anchor, 14)) expect(occupantAt(placed.board, index)!.gem.id).toBe(gem.id)
  placed.inventory[1] = { ...gem, id: 'gem-2' }
  const merged = transferGem(placed, { area: 'inventory', index: 1 }, { area: 'board', index: anchor + 15 }).game
  expect(merged.board[anchor]!.level).toBe(1)
  expect(estimateCircuit(merged.board, merged.stones).perEmission).toBe(8)
  expect(recycleGem(merged, anchor + 15, 'gem-1').game.board.filter(Boolean)).toHaveLength(0)
  const blocked = transferGem(placed, { area: 'board', index: anchor }, { area: 'board', index: 4 * 14 + 13 })
  expect(blocked.game).toBe(placed)
})
test('35×9 : calcul et crédit à travers tout le monde, même sans caméra sur la dernière colonne', () => {
  const game = expanded(35); game.stones.fill(false)
  game.board[4 * 35 + 34] = { id: 'gem-1', kind: 'harvest', level: 11 }
  const result = simulateEmission(game.board, { stones: game.stones })
  expect(result.gain).toBe(12); expect(result.limited).toBe(false)
  expect(result.events.at(-1)).toMatchObject({ reason: 'edge', to: { x: 35, y: 4 } })
  expect(estimateCircuit(game.board, game.stones).perSecond).toBe(2.4)
  let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
  session = sessionReducer(session, { type: 'tick', now: 33000 })
  expect(session.game.coins).toBe(game.coins + 12)
  expect(sessionReducer(session, { type: 'tick', now: 33001 }).game.coins).toBe(game.coins + 12)
})
test('agrandir pendant la propagation conserve identité, puissance et historiques stables en coordonnées monde', () => {
  const game = createInitialGame(); game.coins = 1000
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
  session = sessionReducer(session, { type: 'tick', now: 5800 })
  const pending = session.pending, history = pending[0]!.frontier[0]!.visited
  session = sessionReducer(session, { type: 'expand', now: 6000 })
  expect(session.pending).toBe(pending)
  expect(session.pending[0]!.frontier[0]!.visited).toBe(history)
  expect(session.game.board[56]!.id).toBe('gem-1')
  expect(session.game.coins).toBe(901)
  expect(previewPlacement(session.game, { area: 'board', index: 56 }, { area: 'inventory', index: 0 })).toMatchObject({ ok: true, deltaPerSecond: -0.2 })
})
test('ouvrir une extension puis excaver avant le contact laisse la vague franchir l’ancienne frontière', () => {
  const game = createInitialGame(); game.coins = 1000
  game.offers[0] = { item: { kind: 'pickaxe', id: 'tool-8' }, price: 8 }
  let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
  session = sessionReducer(session, { type: 'tick', now: 10600 })
  session = sessionReducer(session, { type: 'expand', now: 10700 })
  session = sessionReducer(session, { type: 'buy', index: 0, destination: 4 * 14 + 7, offerId: 'tool-8', now: 10701 })
  session = sessionReducer(session, { type: 'tick', now: 11400 })
  const wave = session.pending.find((emission) => emission.id === 1)!
  expect(wave.done).toBe(false)
  expect(wave.frontier[0]!.position.x).toBe(8)
  session = sessionReducer(session, { type: 'tick', now: 11680 })
  expect(session.pending.find((emission) => emission.id === 1)!.result.events.at(-1)).toMatchObject({ reason: 'stone', to: { x: 8, y: 4 } })
})
test('les nouveaux rochers utilisent la même récompense, sans débit d’un aperçu', () => {
  const game = expanded(), rock = 4 * 14 + 9
  game.offers[0] = { item: { kind: 'pickaxe', id: 'tool-8' }, price: 8 }
  const before = JSON.stringify(game)
  expect(previewPlacement(game, { area: 'shop', index: 0, offerId: 'tool-8' }, rock).ok).toBe(true)
  expect(JSON.stringify(game)).toBe(before)
  const dug = buyOfferOnBoard(game, 0, rock, 'tool-8', [{ kind: 'major', weight: 1 }])
  expect(dug.game.inventory[0]?.kind).toBe('major')
  expect(dug.game.stones[rock]).toBe(false)
  expect(dug.game.excavations).toBe(1)
  expect(dug.game.coins).toBe(game.coins - 8)
  expect(validateGame(dug.game)).toBe(true)
})
test('migration 7×9 sans nouveau rocher, puis sauvegarde étendue et validation stricte des dimensions', () => {
  const game = createInitialGame(); game.stones.fill(false)
  game.board[30] = { id: 'gem-1', kind: 'major', level: 2, rarity: 'rare', invested: 12 }
  game.inventory[0] = { id: 'gem-2', kind: 'harvest', level: 4 }
  const legacy = { ...game, columns: undefined }
  const loaded = decodeSave(JSON.stringify(legacy))
  expect(loaded.warning).toBe(''); expect(loaded.game).toEqual(game)
  for (const columns of [0, 8, 36, 7.5, null, '14']) expect(decodeSave(JSON.stringify({ ...game, columns })).warning).not.toBe('')
  const large = expanded(35); large.excavations = 270
  expect(decodeSave(JSON.stringify(large)).game).toEqual(large)
  expect(remapIndex(30, 7, 35)).toBe(142)
})
test('un monde dense 35×9 reste borné par le même budget et signale sa prévision partielle', () => {
  const game = expanded(35); game.stones.fill(false)
  game.board = game.board.map((_, index) => ({ id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' }))
  const result = simulateEmission(game.board)
  expect(result.limits).toEqual(['events']); expect(result.events.length).toBeLessThanOrEqual(4096)
  expect(simulateEmission(game.board)).toEqual(result)
})
