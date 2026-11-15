import { RULES, gemDescription, gemPrice, roundCoins, recycleValue, numberLabel, shopPrice, rerollPrice, offerPrice, isGem } from './catalog'
import { generateOffer } from './economy'
import { simulateEmission } from './engine'
import { mergeGems } from './fusion'
import { createStones, discoverMineral, emptyCollection, initialExcavationSeed, MINERALS } from './terrain'
import type { GameState, Gem, Slot, Transaction } from './types'

export function createInitialGame(seed = 20261115): GameState {
  const board: (Gem | null)[] = Array.from({ length: RULES.columns * RULES.rows }, () => null)
  const inventory: (Gem | null)[] = Array.from({ length: RULES.inventorySize }, () => null)
  const starter: Gem[] = [{ id: 'gem-8', kind: 'harvest', level: 0 },
    { id: 'gem-9', kind: 'multiplier', level: 0, setting: 'EW' }, { id: 'gem-10', kind: 'harvest', level: 0 }]
  return { version: 1, board, inventory, stones: createStones(seed), excavationSeed: initialExcavationSeed(seed),
    excavations: 0, minerals: emptyCollection(), coins: 30, purchases: 0, rerolls: 0, offers: starter.map((gem) => ({ item: gem, price: gemPrice(gem) })),
    seed, nextId: 11, stats: { emissions: 0, earned: 0, lastGain: 0, recent: [] },
    settings: { reducedMotion: false, paused: false, viewMode: 'simple' }, tutorial: 0 }
}

function replacePurchasedOffer(game: GameState, index: number, gemPurchase = true): GameState {
  const purchases = Math.min(RULES.maxCoins, game.purchases + (gemPurchase ? 1 : 0))
  const offers = game.offers.map((offer) => ({ ...offer,
    price: offerPrice(offer.item, purchases) }))
  const next = { ...game, purchases, offers }
  const generated = generateOffer(next)
  offers[index] = generated.offer
  return { ...next, seed: generated.seed, nextId: generated.nextId }
}
export function validSlot(slot: Slot): boolean {
  return Number.isInteger(slot.index) && slot.index >= 0
    && slot.index < (slot.area === 'board' ? RULES.columns * RULES.rows : RULES.inventorySize)
}
export function transferGem(game: GameState, from: Slot, to: Slot): Transaction {
  const fail = (message: string): Transaction => ({ game, message, ok: false })
  if (!validSlot(from) || !validSlot(to)) return fail('Cet emplacement est en dehors du plateau.')
  if (from.area === to.area && from.index === to.index) return fail('Gemme déjà sélectionnée.')
  const gem = game[from.area][from.index]
  if (!gem) return fail('Sélectionnez une gemme à déplacer.')
  if (to.area === 'board' && game.stones[to.index]) return fail('Un rocher occupe cette case. Utilisez une pioche.')
  const target = game[to.area][to.index]
  const merged = target ? mergeGems(gem, target) : null
  if (target && !merged) return fail('Fusion impossible : catégorie, niveau et sertissage doivent être identiques.')
  const next = { ...game, board: [...game.board], inventory: [...game.inventory] }
  next[from.area][from.index] = null
  next[to.area][to.index] = merged ?? gem
  return { game: next, ok: true, merged: Boolean(merged), message: merged
    ? `Fusion réussie ! ${gemDescription(merged)}.` : 'Gemme déplacée. Les impulsions continuent sur votre circuit.' }
}
export function buyOffer(game: GameState, index: number): Transaction {
  const offer = game.offers[index]
  if (!offer) return { game, ok: false, message: 'Offre indisponible.' }
  if (!isGem(offer.item)) return { game, ok: false, message: 'La pioche s’utilise directement sur un rocher.' }
  const empty = game.inventory.findIndex((gem) => !gem)
  if (empty === -1) return { game, ok: false, message: 'Réserve pleine. Placez ou fusionnez une gemme.' }
  if (game.coins < offer.price) return { game, ok: false, message: 'Pas assez d’Éclats pour cet achat.' }
  const inventory = [...game.inventory]
  inventory[empty] = { ...offer.item, invested: offer.price }
  return { game: replacePurchasedOffer({ ...game, inventory, coins: roundCoins(game.coins - offer.price) }, index),
    ok: true, message: 'Gemme ajoutée à la réserve.' }
}

/** Purchase atomically at the destination. A failed drop never spends currency. */
export function buyOfferOnBoard(game: GameState, index: number, destination: number, offerId: string): Transaction {
  const fail = (message: string): Transaction => ({ game, ok: false, message })
  const offer = game.offers[index]
  if (!offer || offer.item.id !== offerId) return fail('Cette offre a changé. Sélectionnez à nouveau une gemme.')
  if (!validSlot({ area: 'board', index: destination })) return fail('Déposez la gemme sur une case du circuit.')
  if (game.coins < offer.price) return fail('Pas assez d’Éclats pour cet achat.')
  if (offer.item.kind === 'pickaxe') {
    if (!game.stones[destination] || game.board[destination]) return fail('Déposez la pioche sur un rocher.')
    const starterPrice = shopPrice({ id: 'gem-0', kind: 'harvest', level: 0 }, game.purchases)
    if (game.coins - offer.price < starterPrice && simulateEmission(game.board, { stones: game.stones }).gain === 0) {
      return fail('Gardez ' + numberLabel(starterPrice) + ' Éclats pour une récolte : le circuit ne produit pas.')
    }
    const stones = [...game.stones]
    stones[destination] = false
    const discovery = discoverMineral(game)
    const next = { ...game, stones, excavationSeed: discovery.seed, minerals: discovery.minerals,
      excavations: game.excavations + 1, coins: roundCoins(game.coins - offer.price) }
    const name = MINERALS.find(({ id }) => id === discovery.found)?.name
    let purchased = replacePurchasedOffer(next, index, false)
    if (!stones.some(Boolean)) {
      // Clear obsolete tools immediately when there is no terrain left to excavate.
      for (let i = 0; i < purchased.offers.length; i++) {
        if (purchased.offers[i]!.item.kind !== 'pickaxe') continue
        const generated = generateOffer(purchased)
        const offers = [...purchased.offers]
        offers[i] = generated.offer
        purchased = { ...purchased, offers, seed: generated.seed, nextId: generated.nextId }
      }
    }
    return { game: purchased, ok: true, found: discovery.found,
      message: name ? `Rocher dégagé · ${name} découvert !` : 'Rocher dégagé. Cette case est maintenant constructible.' }
  }
  if (game.stones[destination]) return fail('Un rocher occupe cette case. Utilisez une pioche.')
  const target = game.board[destination]
  const purchased = { ...offer.item, invested: offer.price }
  const merged = target ? mergeGems(purchased, target) : null
  if (target && !merged) return fail('Case occupée : seul un double identique peut fusionner.')
  const board = [...game.board]
  board[destination] = merged ?? purchased
  return { game: replacePurchasedOffer({ ...game, board, coins: roundCoins(game.coins - offer.price) }, index), ok: true, merged: Boolean(merged),
    message: merged ? `Achat et fusion réussis ! ${gemDescription(merged)}.` : 'Gemme achetée et posée sur le circuit.' }
}
export function recycleGem(game: GameState, index: number, gemId: string): Transaction {
  const gem = validSlot({ area: 'board', index }) ? game.board[index] : null
  if (!gem || gem.id !== gemId) return { game, ok: false, message: 'Cette gemme n’est plus sur cette case.' }
  const board = [...game.board]
  board[index] = null
  const refund = recycleValue(gem)
  return { game: { ...game, board, coins: roundCoins(game.coins + refund) }, ok: true,
    message: 'Gemme recyclée : +' + numberLabel(refund) + ' Éclats (50 % de sa valeur d’achat).' }
}
export function rerollOffers(game: GameState): Transaction {
  const price = rerollPrice(game.rerolls)
  if (game.coins < price) return { game, ok: false, message: 'Pas assez d’Éclats pour renouveler les offres.' }
  const producing = simulateEmission(game.board, { stones: game.stones }).gain > 0
  const starterPrice = shopPrice({ id: 'gem-0', kind: 'harvest', level: 0 }, game.purchases)
  const remaining = roundCoins(game.coins - price)
  if (!producing && remaining < starterPrice) return { game, ok: false,
    message: 'Gardez ' + numberLabel(starterPrice) + ' Éclats pour une récolte : le circuit ne produit pas.' }
  let next = { ...game, offers: [], coins: remaining, rerolls: Math.min(RULES.maxCoins, game.rerolls + 1) } as GameState
  for (let i = 0; i < 3; i++) {
    const { offer, seed, nextId } = generateOffer(next)
    next = { ...next, seed, nextId, offers: [...next.offers, offer] }
  }
  // A non-producing circuit must retain an affordable way to start harvesting,
  // including unlucky draws and the higher price tiers of existing saves.
  if (!producing && !next.offers.some((offer) => offer.item.kind === 'harvest' && offer.price <= remaining)) {
    next.offers[0] = { item: { id: next.offers[0]!.item.id.replace(/^tool-/, 'gem-'), kind: 'harvest', level: 0 }, price: starterPrice }
  }
  return { game: next, ok: true, message: 'Trois nouvelles offres vous attendent.' }
}
