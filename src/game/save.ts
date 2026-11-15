import { HARVEST_VALUES, RULES, SETTINGS, shopPrice } from './catalog'
import { createInitialGame } from './state'
import type { GameState, Gem } from './types'

export const SAVE_KEY = 'overgems.save.v1'
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= RULES.maxCoins
}
function integer(value: unknown): value is number { return finite(value) && Number.isInteger(value) }
function validGem(value: unknown): value is Gem {
  return record(value) && typeof value.id === 'string' && /^gem-\d+$/.test(value.id)
    && integer(value.level) && value.level < HARVEST_VALUES.length
    && (value.invested === undefined || finite(value.invested))
    && (value.kind === 'harvest' || (value.kind === 'multiplier' && SETTINGS.includes(value.setting as never)))
}
export function validateGame(value: unknown): value is GameState {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.board) || value.board.length !== 63
    || !Array.isArray(value.inventory) || value.inventory.length !== RULES.inventorySize
    || !Array.isArray(value.offers) || value.offers.length !== 3 || !finite(value.coins)
    || !integer(value.purchases) || !integer(value.rerolls)
    || !integer(value.seed) || value.seed > 0xffffffff || !integer(value.nextId) || value.nextId < 1
    || !integer(value.tutorial) || value.tutorial > 8 || !record(value.settings)
    || typeof value.settings.paused !== 'boolean' || typeof value.settings.reducedMotion !== 'boolean'
    || !record(value.stats) || !integer(value.stats.emissions) || !finite(value.stats.earned)
    || !finite(value.stats.lastGain) || !Array.isArray(value.stats.recent)
    || value.stats.recent.length > 10 || !value.stats.recent.every(finite)) return false
  const gems: unknown[] = [...value.board, ...value.inventory]
  for (const offer of value.offers) {
    if (!record(offer) || !finite(offer.price) || !validGem(offer.gem)) return false
    gems.push(offer.gem)
  }
  const ids = new Set<string>()
  for (const gem of gems) {
    if (gem === null) continue
    if (!validGem(gem) || ids.has(gem.id) || Number(gem.id.slice(4)) >= value.nextId) return false
    ids.add(gem.id)
  }
  return true
}
export function decodeSave(raw: string | null): { game: GameState; warning: string } {
  if (raw === null) return { game: createInitialGame(), warning: '' }
  try {
    let value: unknown = JSON.parse(raw)
    // Migrate existing v1 games without discarding progress or inventing past purchases.
    if (record(value) && value.version === 1) {
      value = { ...value, purchases: value.purchases === undefined ? 0 : value.purchases,
        rerolls: value.rerolls === undefined ? 0 : value.rerolls,
        settings: record(value.settings) ? { paused: value.settings.paused, reducedMotion: value.settings.reducedMotion } : value.settings }
    }
    if (validateGame(value)) return { game: { ...value,
      offers: value.offers.map((offer) => ({ ...offer, price: shopPrice(offer.gem, value.purchases) })) }, warning: '' }
  } catch { /* Invalid JSON uses the same explicit recovery as invalid schemas. */ }
  return { game: createInitialGame(), warning: 'Sauvegarde invalide ou incompatible : une nouvelle partie a été créée.' }
}
export function loadGame(): ReturnType<typeof decodeSave> {
  try { return decodeSave(localStorage.getItem(SAVE_KEY)) }
  catch { return { game: createInitialGame(), warning: 'Le navigateur ne permet pas de lire la sauvegarde locale.' } }
}
export function saveGame(game: GameState): string {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); return '' }
  catch { return 'Sauvegarde indisponible : votre progression reste dans cet onglet uniquement.' }
}
