import { RULES } from './catalog'
import { nextRandom } from './economy'
import type { GameState, MineralId } from './types'

export const MINERALS: readonly { id: MineralId; name: string; color: string }[] = [
  { id: 'quartz', name: 'Quartz rose', color: '#e5acc3' },
  { id: 'fluorite', name: 'Fluorite', color: '#a6d7c1' },
  { id: 'pyrite', name: 'Pyrite', color: '#edca76' },
  { id: 'azurite', name: 'Azurite', color: '#8fb5e7' },
]
export const emptyCollection = (): GameState['minerals'] => ({ quartz: 0, fluorite: 0, pyrite: 0, azurite: 0 })
export const initialExcavationSeed = (seed: number) => nextRandom(seed ^ 0x53544f4e)

/** Keep the source column and the three central rows buildable from the start. */
export function createStones(seed: number): boolean[] {
  const candidates = Array.from({ length: RULES.columns * RULES.rows }, (_, index) => index)
    .filter((index) => index % RULES.columns !== 0 && Math.abs(Math.floor(index / RULES.columns) - RULES.sourceRow) > 1)
  let random = initialExcavationSeed(seed)
  for (let i = candidates.length - 1; i > 0; i--) {
    random = nextRandom(random)
    const j = random % (i + 1)
    ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
  }
  const occupied = new Set(candidates.slice(0, RULES.initialStones))
  return Array.from({ length: RULES.columns * RULES.rows }, (_, index) => occupied.has(index))
}

/** Separate saved randomness: previews cannot reroll finds or change the shop sequence. */
export function discoverMineral(game: GameState): { seed: number; minerals: GameState['minerals']; found?: MineralId } {
  const first = nextRandom(game.excavationSeed), seed = nextRandom(first)
  if ((first >>> 16) % RULES.mineralChanceDivisor !== 0 && (game.excavations + 1) % RULES.mineralGuaranteeEvery !== 0) {
    return { seed, minerals: game.minerals }
  }
  const missing = MINERALS.filter(({ id }) => game.minerals[id] === 0)
  const pool = missing.length ? missing : MINERALS
  const found = pool[(seed >>> 16) % pool.length]!.id
  return { seed, minerals: { ...game.minerals, [found]: game.minerals[found] + 1 }, found }
}
