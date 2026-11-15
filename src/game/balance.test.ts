import { describe, expect, test } from 'vitest'
import { gemPrice, recycleValue, rerollPrice } from './catalog'
import { createInitialGame, buyOfferOnBoard, recycleGem, rerollOffers } from './state'
import { decodeSave, validateGame } from './save'

describe('prix progressifs et recyclage', () => {
  test('les prix montent de 1 Éclat tous les cinq achats et les nouveaux tirages suivent le palier', () => {
    let game = createInitialGame()
    game.coins = 200
    for (let i = 0; i < 5; i++) {
      game = buyOfferOnBoard(game, 0, i, game.offers[0]!.gem.id).game
      expect(game.purchases).toBe(i + 1)
      expect(game.offers[1]!.price).toBe(i === 4 ? 11 : 10)
      expect(game.offers[0]!.price).toBe(gemPrice(game.offers[0]!.gem) + Math.floor((i + 1) / 5))
    }
    const rerolled = rerollOffers(game).game
    expect(rerolled.purchases).toBe(5)
    expect(rerolled.offers.every((offer) => offer.price === gemPrice(offer.gem) + 1)).toBe(true)
  })
  test('chaque renouvellement réussi augmente son propre tarif et conserve le palier des gemmes', () => {
    const initial = createInitialGame()
    expect(rerollPrice(initial.rerolls)).toBe(5)
    const first = rerollOffers(initial).game
    expect(first.coins).toBe(25)
    expect(first.rerolls).toBe(1)
    expect(rerollPrice(first.rerolls)).toBe(6)
    const second = rerollOffers(first).game
    expect(second.coins).toBe(19)
    expect(second.rerolls).toBe(2)
    expect(rerollPrice(second.rerolls)).toBe(7)
    expect(second.purchases).toBe(0)
    expect(decodeSave(JSON.stringify(second)).game.rerolls).toBe(2)
    second.coins = 6
    expect(rerollOffers(second).game).toBe(second)
  })
  test('un achat refusé ne modifie ni les prix ni le compteur', () => {
    const initial = createInitialGame()
    expect(buyOfferOnBoard(initial, 0, -1, initial.offers[0]!.gem.id).game).toBe(initial)
    const bought = buyOfferOnBoard(initial, 1, 28, initial.offers[1]!.gem.id).game
    expect(buyOfferOnBoard(bought, 0, 28, bought.offers[0]!.gem.id).game).toBe(bought)
    expect(buyOfferOnBoard(bought, 1, 29, initial.offers[1]!.gem.id).game).toBe(bought)
  })
  test('recycler détruit la gemme et rembourse une seule fois 50 % du prix payé', () => {
    const initial = createInitialGame()
    const bought = buyOfferOnBoard(initial, 0, 28, initial.offers[0]!.gem.id).game
    const gem = bought.board[28]!
    expect(gem.invested).toBe(6)
    const sold = recycleGem(bought, 28, gem.id).game
    expect(sold.board[28]).toBeNull()
    expect(sold.coins).toBe(27)
    expect(sold.purchases).toBe(1)
    expect(sold.offers).toBe(bought.offers)
    expect(sold.stats).toBe(bought.stats)
    expect(recycleGem(sold, 28, gem.id).game).toBe(sold)
    expect(validateGame(sold)).toBe(true)
  })
  test('le remboursement conserve le coût historique, même après inflation et fusion', () => {
    const initial = createInitialGame()
    initial.purchases = 4
    const first = buyOfferOnBoard(initial, 0, 28, initial.offers[0]!.gem.id).game
    const fused = buyOfferOnBoard(first, 2, 28, first.offers[2]!.gem.id).game
    expect(fused.board[28]!.level).toBe(1)
    expect(fused.board[28]!.invested).toBe(13)
    expect(recycleValue(fused.board[28]!)).toBe(6.5)
    expect(recycleGem(fused, 28, fused.board[28]!.id).game.coins).toBe(23.5)
    expect(decodeSave(JSON.stringify(fused)).game).toEqual(fused)
  })
  test('une référence de gemme périmée ou hors grille ne détruit rien', () => {
    const game = createInitialGame()
    const bought = buyOfferOnBoard(game, 0, 28, game.offers[0]!.gem.id).game
    expect(recycleGem(bought, 28, 'gem-0').game).toBe(bought)
    for (const index of [-1, 63, NaN, 1.5]) expect(recycleGem(bought, index, bought.board[28]!.id).game).toBe(bought)
  })
  test('une ancienne gemme sans coût enregistré utilise sa valeur catalogue', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 3 }
    expect(recycleValue(game.board[28])).toBe(gemPrice(game.board[28]) / 2)
    expect(recycleGem(game, 28, 'gem-1').game.board[28]).toBeNull()
  })
  test('les anciens formats de sauvegarde sont migrés sans perdre les gemmes ni le solde', () => {
    const game = createInitialGame()
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    game.coins = 590.7
    const raw = JSON.stringify({ ...game, purchases: undefined, rerolls: undefined, settings: { paused: false, reducedMotion: false, stepMs: 220 } })
    const restored = decodeSave(raw)
    expect(restored.warning).toBe('')
    expect(restored.game.coins).toBe(590.7)
    expect(restored.game.board).toEqual(game.board)
    expect(restored.game.purchases).toBe(0)
    expect(restored.game.rerolls).toBe(0)
    expect(restored.game.settings).toEqual({ paused: false, reducedMotion: false })
  })
  test('les nouveaux champs invalides sont rejetés', () => {
    const game = createInitialGame()
    for (const purchases of [-1, 0.5, null, '2']) expect(decodeSave(JSON.stringify({ ...game, purchases })).warning).not.toBe('')
    for (const rerolls of [-1, 0.5, null, '2']) expect(decodeSave(JSON.stringify({ ...game, rerolls })).warning).not.toBe('')
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0, invested: -1 }
    expect(validateGame(game)).toBe(false)
  })
  test('une ancienne sauvegarde adopte le barème adouci sans modifier le solde ni les coûts payés', () => {
    const game = createInitialGame()
    game.purchases = 12
    game.rerolls = 3
    game.coins = 590.7
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0, invested: 25 }
    game.offers = game.offers.map((offer) => ({ ...offer, price: gemPrice(offer.gem) + 12 }))
    const restored = decodeSave(JSON.stringify({ ...game, settings: { ...game.settings, stepMs: 1200 } }))
    expect(restored.warning).toBe('')
    expect(restored.game.coins).toBe(590.7)
    expect(restored.game.purchases).toBe(12)
    expect(restored.game.offers.every((offer) => offer.price === gemPrice(offer.gem) + 2)).toBe(true)
    expect(recycleValue(restored.game.board[28]!)).toBe(12.5)
    expect(rerollPrice(restored.game.rerolls)).toBe(8)
    expect(restored.game.settings).not.toHaveProperty('stepMs')
  })
})
