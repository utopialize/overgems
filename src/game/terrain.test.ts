import { describe, expect, test } from 'vitest'
import { RULES } from './catalog'
import { generateOffer } from './economy'
import { simulateEmission } from './engine'
import { estimateCircuit, estimateGemContribution, previewPlacement } from './analysis'
import { createSession, sessionReducer } from './runtime'
import { decodeSave, validateGame } from './save'
import { buyOffer, buyOfferOnBoard, createInitialGame, transferGem } from './state'
import { createStones, MINERALS } from './terrain'

function excavationGame() {
  const game = createInitialGame()
  game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: RULES.pickaxePrice }
  return game
}
function blockedGame() {
  const game = excavationGame()
  game.stones.fill(false)
  game.stones[29] = true
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  game.board[30] = { id: 'gem-2', kind: 'harvest', level: 1 }
  return game
}

describe('terrain constructible et excavation', () => {
  test.each([0, 1, 42, 20261115, 0xffffffff])('18 rochers reproductibles, source et passage central libres : %s', (seed) => {
    const game = createInitialGame(seed)
    expect(game.stones).toEqual(createStones(seed))
    expect(game.stones.filter(Boolean)).toHaveLength(18)
    game.stones.forEach((stone, index) => {
      if (index % 7 === 0 || Math.abs(Math.floor(index / 7) - RULES.sourceRow) <= 1) expect(stone).toBe(false)
    })
    expect(game.board.every((gem) => gem === null)).toBe(true)
    const bought = buyOfferOnBoard(game, 0, 28, 'gem-8')
    expect(bought.ok).toBe(true)
    expect(simulateEmission(bought.game.board, { stones: bought.game.stones }).gain).toBe(1)
    expect(validateGame(bought.game)).toBe(true)
  })
  test('les plans dépendent de la graine, les outils sont tirés au hasard et cessent sans rochers', () => {
    expect(createStones(1)).not.toEqual(createStones(42))
    let game = createInitialGame()
    const tools: number[] = []
    for (let i = 0; i < 300; i++) {
      const generated = generateOffer(game)
      expect(generateOffer(game)).toEqual(generated)
      if (generated.offer.item.kind === 'pickaxe') {
        tools.push(i)
        expect(generated.offer.price).toBe(8)
      }
      game = { ...game, seed: generated.seed, nextId: generated.nextId }
    }
    expect(tools.length).toBeGreaterThan(30)
    expect(tools.length).toBeLessThan(90)
    expect(new Set(tools.map((i) => i % 3)).size).toBe(3)
    game.stones.fill(false)
    for (let i = 0; i < 30; i++) {
      const generated = generateOffer(game)
      expect(generated.offer.item.kind).not.toBe('pickaxe')
      game = { ...game, seed: generated.seed, nextId: generated.nextId }
    }
  })
  test('une pioche libère une seule case contre 8 Éclats, sans achat de gemme ni stockage', () => {
    const game = excavationGame(), index = game.stones.findIndex(Boolean)
    const before = JSON.stringify(game)
    const transaction = buyOfferOnBoard(game, 0, index, 'tool-8')
    expect(transaction.ok).toBe(true)
    expect(transaction.game.coins).toBe(22)
    expect(transaction.game.stones.filter(Boolean)).toHaveLength(17)
    expect(transaction.game.stones[index]).toBe(false)
    expect(transaction.game.board).toBe(game.board)
    expect(transaction.game.inventory).toBe(game.inventory)
    expect(transaction.game.purchases).toBe(0)
    expect(transaction.game.excavations).toBe(1)
    expect(transaction.game.offers[0]!.item.id).not.toBe('tool-8')
    expect(buyOfferOnBoard(transaction.game, 0, index, 'tool-8').game).toBe(transaction.game)
    expect(JSON.stringify(game)).toBe(before)
    expect(validateGame(transaction.game)).toBe(true)
    expect(buyOfferOnBoard(transaction.game, 2, index, 'gem-10').ok).toBe(true)
  })
  test('poses refusées et pioche périmée ne changent ni argent, ni tirages, ni collection', () => {
    const game = excavationGame(), index = game.stones.findIndex(Boolean)
    for (const target of [0, 28, -1, 63, NaN, 1.5]) expect(buyOfferOnBoard(game, 0, target, 'tool-8').game).toBe(game)
    expect(buyOfferOnBoard(game, 0, index, 'tool-0').game).toBe(game)
    expect(buyOfferOnBoard({ ...game, coins: 7 }, 0, index, 'tool-8').ok).toBe(false)
    expect(buyOffer(game, 0).game).toBe(game)
    expect(buyOfferOnBoard(game, 2, index, 'gem-10').game).toBe(game)
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    expect(transferGem(game, { area: 'board', index: 28 }, { area: 'board', index }).game).toBe(game)
  })
  test('creuser avant de produire protège le budget de la première récolte', () => {
    const game = excavationGame(), index = game.stones.findIndex(Boolean)
    game.coins = 13
    expect(buyOfferOnBoard(game, 0, index, 'tool-8').game).toBe(game)
    game.coins = 14
    expect(buyOfferOnBoard(game, 0, index, 'tool-8').game.coins).toBe(6)
    game.coins = 8
    game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
    expect(buyOfferOnBoard(game, 0, index, 'tool-8').game.coins).toBe(0)
  })
  test('le dernier rocher supprime les autres pioches proposées sans supplément ni inflation', () => {
    const game = blockedGame()
    game.offers[1] = { item: { id: 'tool-9', kind: 'pickaxe' }, price: 8 }
    game.offers[2] = { item: { id: 'tool-10', kind: 'pickaxe' }, price: 8 }
    const next = buyOfferOnBoard(game, 0, 29, 'tool-8').game
    expect(next.stones.some(Boolean)).toBe(false)
    expect(next.offers.every((offer) => offer.item.kind !== 'pickaxe')).toBe(true)
    expect(next.coins).toBe(22)
    expect(next.purchases).toBe(0)
    expect(validateGame(next)).toBe(true)
  })
  test('quatre minéraux sans bonus, garanties de découverte et hasard conservé au rechargement', () => {
    let game = excavationGame()
    game.coins = 1000
    for (let i = 0; i < 18; i++) {
      game.offers[0] = { item: { id: 'tool-' + game.nextId++, kind: 'pickaxe' }, price: 8 }
      const index = game.stones.findIndex(Boolean)
      const transaction = buyOfferOnBoard(game, 0, index, game.offers[0]!.item.id)
      expect(buyOfferOnBoard(decodeSave(JSON.stringify(game)).game, 0, index, game.offers[0]!.item.id)).toEqual(transaction)
      if ((i + 1) % 4 === 0) expect(transaction.found).toBeDefined()
      expect(transaction.game.coins).toBe(1000 - (i + 1) * 8)
      expect(transaction.game.stats).toBe(game.stats)
      game = transaction.game
      if (i === 15) expect(MINERALS.every(({ id }) => game.minerals[id] > 0)).toBe(true)
    }
    expect(game.excavations).toBe(18)
    expect(decodeSave(JSON.stringify(game)).game).toEqual(game)
  })
  test('migration des anciennes offres et absence de rochers ajoutés aux parties existantes', () => {
    const game = createInitialGame()
    game.board[1] = { id: 'gem-1', kind: 'harvest', level: 2, invested: 17 }
    const legacy = { ...game, stones: undefined, excavationSeed: undefined, excavations: undefined, minerals: undefined,
      offers: game.offers.map(({ item, price }) => ({ gem: item, price })) }
    const loaded = decodeSave(JSON.stringify(legacy))
    expect(loaded.warning).toBe('')
    expect(loaded.game.board).toEqual(game.board)
    expect(loaded.game.stones.some(Boolean)).toBe(false)
    expect(loaded.game.offers).toEqual(game.offers)
    expect(loaded.game.excavations).toBe(0)
    expect(Object.values(loaded.game.minerals)).toEqual([0, 0, 0, 0])
  })
  test('sauvegardes invalides : terrain, chevauchement, outils placés et compteurs incohérents', () => {
    const game = excavationGame()
    for (const patch of [
      { stones: [] }, { stones: game.stones.map(() => 1) }, { excavationSeed: -1 }, { excavations: 0.1 },
      { minerals: { ...game.minerals, quartz: 1 } }, { minerals: { ...game.minerals, quartz: -1 } },
      { board: game.board.map((gem, i) => i === 0 ? { id: 'tool-1', kind: 'pickaxe' } : gem) },
      { board: game.board.map((gem, i) => i === game.stones.findIndex(Boolean) ? { id: 'gem-1', kind: 'harvest', level: 0 } : gem) },
    ]) expect(decodeSave(JSON.stringify({ ...game, ...patch })).warning).not.toBe('')
  })
})

describe('rochers et impulsions vivantes', () => {
  test('le feedback provient seulement des excavations validées et reste transitoire', () => {
    const game = excavationGame(), index = game.stones.findIndex(Boolean)
    game.settings.paused = true
    const initial = createSession(game, 0)
    const denied = sessionReducer(initial, { type: 'buy', index: 0, destination: 28, offerId: 'tool-8', now: 100 })
    expect(denied.excavationEffects).toHaveLength(0)
    const dug = sessionReducer(initial, { type: 'buy', index: 0, destination: index, offerId: 'tool-8', now: 123 })
    expect(dug.excavationEffects).toEqual([{ id: 1, index, at: 123 }])
    expect(dug.game.coins).toBe(22)
    expect(dug.pending).toBe(initial.pending)
    const duplicate = sessionReducer(dug, { type: 'buy', index: 0, destination: index, offerId: 'tool-8', now: 124 })
    expect(duplicate.excavationEffects).toBe(dug.excavationEffects)
    expect(createSession(decodeSave(JSON.stringify(dug.game)).game, 200).excavationEffects).toHaveLength(0)
    expect(sessionReducer(dug, { type: 'suspend', now: 200 }).excavationEffects).toHaveLength(0)
    expect(sessionReducer(dug, { type: 'reset', game: createInitialGame(), now: 200 }).excavationEffects).toHaveLength(0)
  })
  test('le rocher arrête la branche au contact ; théorie, contribution et aperçu utilisent le terrain', () => {
    const game = blockedGame(), before = JSON.stringify(game)
    const flow = simulateEmission(game.board, { stones: game.stones })
    expect(flow.gain).toBe(1)
    expect(flow.events.at(-1)).toMatchObject({ reason: 'stone', to: { x: 1, y: 4 }, progress: 0.35 })
    expect(estimateCircuit(game.board, game.stones).perSecond).toBe(0.2)
    expect(estimateGemContribution(game.board, 30, undefined, game.stones)).toEqual({ perEmission: 0, perSecond: 0 })
    expect(previewPlacement(game, { area: 'shop', index: 0, offerId: 'tool-8' }, 29)).toMatchObject({ ok: true,
      estimate: { perEmission: 3, perSecond: 0.6 }, deltaPerSecond: 0.4 })
    expect(JSON.stringify(game)).toBe(before)
  })
  test.each([6000, 6080])('creuser à %s conserve la vague déjà partie et elle traverse la nouvelle case libre', (now) => {
    const game = blockedGame()
    let session = sessionReducer(createSession(game, 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'tick', now: 5800 })
    const frontier = session.pending[0]!.frontier
    session = sessionReducer(session, { type: 'buy', index: 0, destination: 29, offerId: 'tool-8', now: now - 1 })
    expect(session.pending[0]!.frontier).toBe(frontier)
    expect(session.pending[0]!.start).toBe(5000)
    expect(session.nextAt).toBe(10000)
    expect(session.game.coins).toBe(23)
    session = sessionReducer(session, { type: 'tick', now: 7400 })
    expect(session.game.coins).toBe(25)
    expect(session.pending[0]!.result.gain).toBe(3)
    expect(sessionReducer(session, { type: 'tick', now: 7401 }).game.coins).toBe(25)
  })
  test('après le contact, creuser ne ressuscite pas la branche terminée', () => {
    let session = sessionReducer(createSession(blockedGame(), 0), { type: 'tick', now: 5000 })
    session = sessionReducer(session, { type: 'buy', index: 0, destination: 29, offerId: 'tool-8', now: 6080 })
    expect(session.pending[0]!.completedAt).toBe(6080)
    expect(session.pending[0]!.result.events.at(-1)?.reason).toBe('stone')
    expect(session.game.coins).toBe(23)
    session = sessionReducer(session, { type: 'tick', now: 7400 })
    expect(session.game.coins).toBe(23)
    expect(session.game.stats.lastGain).toBe(1)
  })
  test('un rocher termine seulement sa branche et laisse sa sœur récolter', () => {
    const game = blockedGame()
    game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'ESW' }
    game.board[35] = { id: 'gem-3', kind: 'harvest', level: 0 }
    const flow = simulateEmission(game.board, { stones: game.stones })
    expect(flow.gain).toBe(1.1)
    expect(flow.events.filter((event) => event.reason === 'stone')).toHaveLength(1)
    expect(flow.events.some((event) => event.type === 'harvest' && event.to.y === 5)).toBe(true)
  })
})
