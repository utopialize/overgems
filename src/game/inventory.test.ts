import { expect, test } from 'vitest'
import { buyOffer, buyOfferAt, buyOfferOnBoard, createInitialGame, recycleGem, transferGem } from './state'
import { createSession, sessionReducer } from './runtime'
import { decodeSave, validateGame } from './save'
import { previewPlacement } from './analysis'
import { rollExcavationReward } from './rewards'
import type { Gem } from './types'

test('achat ciblé dans l’inventaire, fusion et référence périmée restent atomiques', () => {
  const game = createInitialGame()
  const bought = buyOfferAt(game, 0, { area: 'inventory', index: 11 }, 'gem-8')
  expect(bought.ok).toBe(true)
  expect(bought.game.coins).toBe(24)
  expect(bought.game.inventory[11]).toMatchObject({ id: 'gem-8', invested: 6 })
  const fused = buyOfferAt(bought.game, 2, { area: 'inventory', index: 11 }, 'gem-10')
  expect(fused.game.inventory[11]).toMatchObject({ level: 1, invested: 12 })
  expect(fused.game.purchases).toBe(2)
  expect(buyOfferAt(fused.game, 2, { area: 'inventory', index: 10 }, 'gem-10').game).toBe(fused.game)
  expect(validateGame(fused.game)).toBe(true)
})
test('inventaire plein : achat et transfert incompatibles refusés, fusion possible sans perte', () => {
  const game = createInitialGame()
  game.nextId = 100
  game.inventory = game.inventory.map((_, i) => ({ id: 'gem-' + (20 + i), kind: 'harvest', level: 0 }))
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  expect(buyOffer(game, 0).game).toBe(game)
  expect(buyOfferAt(game, 1, { area: 'inventory', index: 0 }, 'gem-9').game).toBe(game)
  const merged = transferGem(game, { area: 'board', index: 28 }, { area: 'inventory', index: 0 })
  expect(merged.ok).toBe(true)
  expect(merged.game.board[28]).toBeNull()
  expect(merged.game.inventory[0]!.level).toBe(1)
  expect(merged.game.inventory.filter(Boolean)).toHaveLength(12)
  expect(decodeSave(JSON.stringify(merged.game)).game).toEqual(merged.game)
})
test('inventaire vers plateau et retour préservent les flux et l’identité', () => {
  const game = buyOffer(createInitialGame(), 0).game
  let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
  const pending = session.pending
  session = sessionReducer(session, { type: 'transfer', from: { area: 'inventory', index: 0 }, to: { area: 'board', index: 28 } })
  expect(session.pending).toBe(pending)
  session = sessionReducer(session, { type: 'tick', now: 5800 })
  expect(session.game.coins).toBe(25)
  const again = sessionReducer(session, { type: 'transfer', from: { area: 'board', index: 28 }, to: { area: 'inventory', index: 11 } })
  expect(again.pending).toBe(session.pending)
  expect(again.game.inventory[11]!.id).toBe('gem-8')
  expect(recycleGem(again.game, 11, 'gem-8', 'inventory').game.coins).toBe(28)
})
test('aperçus de stockage et de pose restent purs', () => {
  const game = buyOffer(createInitialGame(), 0).game
  const before = JSON.stringify(game)
  expect(previewPlacement(game, { area: 'inventory', index: 0 }, 28)).toMatchObject({ ok: true, deltaPerSecond: 0.2 })
  expect(previewPlacement(game, { area: 'shop', index: 2, offerId: 'gem-10' }, { area: 'inventory', index: 0 })).toMatchObject({ ok: true, deltaPerSecond: 0 })
  expect(JSON.stringify(game)).toBe(before)
})
test('récompense configurable, rareté conservée, aucun bonus implicite et refus sans perte quand plein', () => {
  const game = createInitialGame()
  game.offers[0] = { item: { kind: 'pickaxe', id: 'tool-8' }, price: 8 }
  const rock = game.stones.findIndex(Boolean)
  const rules = [{ kind: 'harvest' as const, rarity: 'rare' as const, weight: 1 }]
  const before = JSON.stringify(game)
  const dug = buyOfferOnBoard(game, 0, rock, 'tool-8', rules)
  expect(dug.reward).toMatchObject({ rarity: 'rare', invested: 0, kind: 'harvest' })
  expect(dug.game.inventory[0]).toBe(dug.reward)
  expect(dug.game.coins).toBe(22)
  expect(recycleGem(dug.game, 0, dug.reward!.id, 'inventory').game.coins).toBe(22)
  expect(decodeSave(JSON.stringify(dug.game)).game).toEqual(dug.game)
  expect(JSON.stringify(game)).toBe(before)
  game.nextId = 100
  game.inventory = game.inventory.map((_, i) => ({ id: 'gem-' + (20 + i), kind: 'harvest', level: 0 }))
  const blocked = buyOfferOnBoard(game, 0, rock, 'tool-8', rules)
  expect(blocked.game).toBe(game)
  expect(blocked.ok).toBe(false)
  const freed = { ...game, inventory: [...game.inventory] }
  freed.inventory[7] = null
  expect(buyOfferOnBoard(freed, 0, rock, 'tool-8', rules).reward!.rarity).toBe('rare')
})
test('une gemme rare ne fusionne pas avec une classique ; deux rares fusionnent et restent rares', () => {
  const game = createInitialGame()
  game.inventory[0] = { id: 'gem-1', kind: 'harvest', level: 0, rarity: 'rare' }
  game.board[28] = { id: 'gem-2', kind: 'harvest', level: 0 }
  expect(transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index: 28 }).game).toBe(game)
  game.board[28] = { ...game.board[28]!, rarity: 'rare' }
  expect(transferGem(game, { area: 'inventory', index: 0 }, { area: 'board', index: 28 }).game.board[28]).toMatchObject({ rarity: 'rare', level: 1 })
  expect(decodeSave(JSON.stringify({ ...game, inventory: [{ ...game.inventory[0], rarity: 'invalid' }, ...game.inventory.slice(1)] })).warning).not.toBe('')
})
test('tirages extensibles reproductibles, branches de table et absence de récompense', () => {
  for (const seed of [0, 1, 123456, 0xffffffff]) {
    expect(rollExcavationReward(seed, 20)).toEqual(rollExcavationReward(seed, 20))
    expect(rollExcavationReward(seed, 20, [{ kind: 'none', weight: 1 }]).gem).toBeUndefined()
    const gem = rollExcavationReward(seed, 20, [{ kind: 'multiplier', weight: 1, level: 2 }]).gem as Gem
    expect(gem).toMatchObject({ kind: 'multiplier', level: 2, invested: 0 })
  }
})
