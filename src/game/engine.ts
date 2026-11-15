import { DELTA, DIRECTIONS, OPPOSITE, RULES, gemValue, roundCoins } from './catalog'
import type { Direction, Emission, FlowEvent, Gem, Point, LimitReason } from './types'
import { occupantAt, boardColumns } from './board'

export type Pulse = {
  position: Point; from: Point; direction: Direction; energy: number
  visited: ReadonlySet<number>; activatedGems: ReadonlySet<string>; branch: number; step: number
}
export type SimulationOptions = {
  power?: number; source?: Point & { direction: Direction }; maxEvents?: number; maxEnergy?: number
  stones?: readonly boolean[]
}
export type RunningEmission = {
  result: Emission; frontier: Pulse[]; step: number; nextBranch: number
  maxEvents: number; maxEnergy: number; done: boolean
}
// The leading edge of a small pulse reaches a cell boundary before its centre.
export const CONTACT_PROGRESS = 0.35
const limit = (reasons: readonly LimitReason[], reason: LimitReason): LimitReason[] => reasons.includes(reason) ? [...reasons] : [...reasons, reason]

export function collisionReason(board: readonly (Gem | null)[], pulse: Pulse, stones: readonly boolean[] = []): 'edge' | 'connection' | 'stone' | null {
  const { x, y } = pulse.position
  const columns = boardColumns(board)
  if (x < 0 || x >= columns || y < 0 || y >= RULES.rows) return 'edge'
  if (stones[y * columns + x]) return 'stone'
  const gem = occupantAt(board, y * columns + x)?.gem
  return gem?.kind === 'multiplier' && !gem.setting.includes(OPPOSITE[pulse.direction]) ? 'connection' : null
}

/** End only colliding branches, at contact, while their siblings keep travelling. */
export function resolveImpacts(board: readonly (Gem | null)[], current: RunningEmission, progress: number, stones: readonly boolean[] = []): RunningEmission {
  if (current.done || !current.frontier.some((pulse) => collisionReason(board, pulse, stones))) return current
  const events = [...current.result.events]
  const frontier: Pulse[] = []
  for (const pulse of current.frontier) {
    const reason = collisionReason(board, pulse, stones)
    if (!reason) { frontier.push(pulse); continue }
    if (events.length >= current.maxEvents) return { ...current,
      result: { ...current.result, events, limited: true, limits: limit(current.result.limits, 'events') }, frontier: [], done: true }
    events.push({ ...moveEvent(pulse), type: 'end', reason, progress,
      atStep: pulse.step + progress })
  }
  return { ...current, result: { ...current.result, events }, frontier, done: frontier.length === 0 }
}

function moveEvent(pulse: Pulse): FlowEvent {
  return { type: 'move', branch: pulse.branch, step: pulse.step, from: pulse.from,
    to: pulse.position, direction: pulse.direction, energy: pulse.energy }
}

/** Start the first journey. The destination is resolved only when the pulse arrives. */
export function createEmission(options: SimulationOptions = {}): RunningEmission {
  const power = options.power ?? 1
  const source = options.source ?? { x: -1, y: RULES.sourceRow, direction: 'E' }
  const requested = options.maxEvents ?? RULES.maxEvents
  const maxEvents = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : RULES.maxEvents
  const maxEnergy = options.maxEnergy ?? RULES.maxEnergy
  const result: Emission = { events: [], gain: 0, limited: false, maxStep: 0, limits: [] }
  const initial = { result, frontier: [] as Pulse[], step: 0, nextBranch: 1, maxEvents, maxEnergy, done: false }
  if (!Number.isFinite(power) || power <= 0 || !Number.isFinite(maxEnergy) || power > maxEnergy) {
    return { ...initial, result: { ...result, limited: true, limits: [!Number.isFinite(power) || power <= 0 || !Number.isFinite(maxEnergy) ? 'invalid-power' : 'power'] }, done: true }
  }
  const [dx, dy] = DELTA[source.direction]
  const first: Pulse = { position: { x: source.x + dx, y: source.y + dy }, from: source,
    direction: source.direction, energy: power, visited: new Set(), activatedGems: new Set(), branch: 0, step: 0 }
  return { ...initial, frontier: [first], result: { ...result, events: [moveEvent(first)] } }
}

/** Resolve one simultaneous arrival step against the CURRENT board, without mutating inputs. */
export function advanceEmission(board: readonly (Gem | null)[], current: RunningEmission, stones: readonly boolean[] = []): RunningEmission {
  if (current.done) return current
  // Static forecasts use the same contact events as the live scheduler.
  current = resolveImpacts(board, current, CONTACT_PROGRESS, stones)
  if (current.done) return current
  const events = [...current.result.events]
  let gain = current.result.gain
  let limited = current.result.limited
  let limits = current.result.limits
  let nextBranch = current.nextBranch
  let maxStep = current.result.maxStep
  const frontier: Pulse[] = []

  for (const pulse of current.frontier) {
    const { position, direction, energy, step, branch } = pulse
    const base = { branch, step, from: pulse.from, to: position, direction, energy }
    const visit: FlowEvent[] = []
    const children: Pulse[] = []
    let earned = 0
    const columns = boardColumns(board)
    const inside = position.x >= 0 && position.x < columns && position.y >= 0 && position.y < RULES.rows
    const gem = inside ? occupantAt(board, position.y * columns + position.x)?.gem : null
    // Column-major state identity remains stable when the world expands to the right.
    const key = (position.x * RULES.rows + position.y) * 4 + DIRECTIONS.indexOf(direction)
    if (!inside) visit.push({ ...base, type: 'end', reason: 'edge' })
    else if (pulse.visited.has(key)) visit.push({ ...base, type: 'end', reason: 'loop' })
    else if (gem?.kind === 'multiplier' && !gem.setting.includes(OPPOSITE[direction])) {
      visit.push({ ...base, type: 'end', reason: 'connection' })
    } else {
      if (gem) visit.push({ ...base, type: 'enter' })
      // Moving an instance cannot make it harvest or amplify the same branch twice.
      // Its fixed connections still route subsequent visits normally.
      const activates = Boolean(gem && !pulse.activatedGems.has(gem.id))
      const outgoingEnergy = gem?.kind === 'multiplier' && activates ? energy * gemValue(gem) : energy
      if (!Number.isFinite(outgoingEnergy) || outgoingEnergy > current.maxEnergy) {
        limited = true
        limits = limit(limits, 'power')
        visit.push({ ...base, type: 'end', reason: 'power' })
      } else {
        const outgoing = gem?.kind === 'multiplier'
          ? DIRECTIONS.filter((d) => gem.setting.includes(d) && d !== OPPOSITE[direction])
          : [direction]
        if (gem && gem.kind !== 'multiplier' && activates) {
          earned = energy * gemValue(gem)
          visit.push({ ...base, type: 'harvest', gain: earned })
        } else if (gem?.kind === 'multiplier' && activates) {
          visit.push({ ...base, type: 'multiply', energy: outgoingEnergy, factor: gemValue(gem) })
        }
        if (outgoing.length > 1) visit.push({ ...base, type: 'split', energy: outgoingEnergy })
        // Empty cells also belong to each branch's history.
        for (const nextDirection of outgoing) {
          const [nx, ny] = DELTA[nextDirection]
          if (nextDirection !== direction) visit.push({ ...base, type: 'turn', direction: nextDirection, energy: outgoingEnergy })
          const child: Pulse = { position: { x: position.x + nx, y: position.y + ny }, from: position,
            direction: nextDirection, energy: outgoingEnergy, visited: new Set(pulse.visited).add(key),
            activatedGems: activates && gem ? new Set(pulse.activatedGems).add(gem.id)
              : outgoing.length === 1 ? pulse.activatedGems : new Set(pulse.activatedGems),
            branch: outgoing.length > 1 ? nextBranch++ : branch, step: step + 1 }
          children.push(child)
          visit.push(moveEvent(child))
        }
      }
    }
    // Commit a whole visit or explicitly stop. No partially credited harvest.
    if (events.length + visit.length > current.maxEvents || gain + earned > RULES.maxCoins) {
      return { ...current, result: { events, gain, limited: true, maxStep,
        limits: limit(limits, events.length + visit.length > current.maxEvents ? 'events' : 'coins') }, frontier: [], done: true, nextBranch }
    }
    events.push(...visit)
    gain = roundCoins(gain + earned)
    frontier.push(...children)
    for (const child of children) maxStep = Math.max(maxStep, child.step)
  }
  return { ...current, result: { events, gain, limited, maxStep, limits }, frontier,
    step: current.step + 1, nextBranch, done: frontier.length === 0 }
}

/** Deterministic forecast on a static board, using the same step engine as live play. */
export function simulateEmission(board: readonly (Gem | null)[], options: SimulationOptions = {}): Emission {
  let emission = createEmission(options)
  while (!emission.done) emission = advanceEmission(board, emission, options.stones)
  return emission.result
}
