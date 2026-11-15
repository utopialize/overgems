import { RULES, roundCoins } from './catalog'
import { createEmission, advanceEmission, collisionReason, resolveImpacts, CONTACT_PROGRESS } from './engine'
import type { RunningEmission } from './engine'
import { buyOfferAt, rerollOffers, transferGem, recycleGem } from './state'
import type { GameState, Settings, Slot, MineralId, Gem } from './types'
import { occupantAt } from './board'
import { limitLabel } from './diagnostics'

export type ActiveEmission = RunningEmission & { id: number; start: number; stepMs: number; completedAt: number | null }
export type ExcavationFeedback = { id: number; index: number; at: number }
export type Session = { game: GameState; pending: ActiveEmission[]; nextAt: number; serial: number; notice: string; noticeError: boolean; warning: boolean; limitNotice: string; mergedId: string | null; boardChangedAt: number; discovery: { mineral?: MineralId; gem?: Gem } | null; excavationEffects: ExcavationFeedback[] }
export type Action =
  | { type: 'tick'; now: number }
  | { type: 'suspend'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'buy'; index: number; destination: number; area?: Slot['area']; offerId: string; now?: number }
  | { type: 'reroll' }
  | { type: 'transfer'; from: Slot; to: Slot; now?: number }
  | { type: 'recycle'; index: number; area?: Slot['area']; gemId: string; now?: number }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'tutorial'; step: number }
  | { type: 'notice'; message: string; error?: boolean }
  | { type: 'dismiss-discovery' }
  | { type: 'reset'; game: GameState; now: number }

export function createSession(game: GameState, now: number): Session {
  return { game, pending: [], nextAt: now + RULES.periodMs, serial: 0, notice: '', noticeError: false, warning: false, limitNotice: '', mergedId: null, boardChangedAt: now, discovery: null, excavationEffects: [] }
}

function nextImpact(session: Session, wave: ActiveEmission): number {
  return wave.completedAt === null && wave.frontier.some((pulse) => collisionReason(session.game.board, pulse, session.game.stones))
    ? Math.max(session.boardChangedAt, wave.start + (wave.step + CONTACT_PROGRESS) * RULES.stepMs) : Infinity
}

/** Stop transient journeys on suspension. Already collected gains stay saved; no future gain is invented. */
export function suspendSession(session: Session): Session {
  return session.pending.length || session.excavationEffects.length ? { ...session, pending: [], excavationEffects: [] } : session
}

function advanceSession(session: Session, now: number): Session {
  if (session.game.settings.paused) return session
  const due = session.pending.some((wave) => wave.completedAt === null
    ? Math.min(nextImpact(session, wave), wave.start + (wave.step + 1) * RULES.stepMs) <= now
    : wave.completedAt + RULES.feedbackMs <= now)
  if (!due && now < session.nextAt) return session

  let game = session.game
  const pending = [...session.pending]
  let warning = session.warning
  let limitNotice = session.limitNotice
  // Resolve simultaneous arrivals chronologically, independent of frame rate.
  while (true) {
    let index = -1, arrival = Infinity
    pending.forEach((wave, i) => {
      const next = wave.completedAt === null ? Math.min(nextImpact(session, wave), wave.start + (wave.step + 1) * RULES.stepMs) : Infinity
      if (next < arrival) { arrival = next; index = i }
    })
    if (index === -1 || arrival > now) break
    const previous = pending[index]!
    const advanced = arrival === nextImpact(session, previous)
      ? resolveImpacts(game.board, previous, Math.min(1, (arrival - previous.start) / RULES.stepMs - previous.step), game.stones)
      : advanceEmission(game.board, previous, game.stones)
    const earned = roundCoins(advanced.result.gain - previous.result.gain)
    if (earned > 0) game = { ...game, coins: roundCoins(game.coins + earned),
      stats: { ...game.stats, earned: roundCoins(game.stats.earned + earned) } }
    pending[index] = { ...previous, ...advanced, completedAt: advanced.done ? arrival : null }
    if (advanced.done) {
      game = { ...game, stats: { ...game.stats, emissions: game.stats.emissions + 1,
        lastGain: advanced.result.gain, recent: [...game.stats.recent.slice(-9), advanced.result.gain] } }
      warning = advanced.result.limited || game.coins >= RULES.maxCoins
      limitNotice = advanced.result.limited ? `Dernier flux #${previous.id} limité : ${limitLabel(advanced.result.limits)}.`
        : game.coins >= RULES.maxCoins ? 'Solde : plafond d’Éclats atteint.' : ''
    } else if (advanced.result.limited) {
      warning = true
      limitNotice = `Flux #${previous.id} limité : ${limitLabel(advanced.result.limits)}.`
    }
  }

  const visible = pending.filter((wave) => wave.completedAt === null || now < wave.completedAt + RULES.feedbackMs)
  let serial = session.serial, nextAt = session.nextAt
  if (now >= nextAt) {
    visible.push({ ...createEmission(), id: ++serial, start: now, stepMs: RULES.stepMs, completedAt: null })
    nextAt = now + RULES.periodMs // No catch-up emissions after a stall or background time.
  }
  return { ...session, game, pending: visible, serial, nextAt, warning, limitNotice }
}

export function sessionReducer(session: Session, action: Action): Session {
  if (action.type === 'reset') return createSession(action.game, action.now)
  if (action.type === 'notice') return { ...session, notice: action.message, noticeError: Boolean(action.error) }
  if (action.type === 'dismiss-discovery') return { ...session, discovery: null }
  if (action.type === 'suspend' || action.type === 'resume') return { ...suspendSession(session), nextAt: action.now + RULES.periodMs }
  if (action.type === 'tick') return advanceSession(session, action.now)
  if (action.type === 'settings') {
    const base = action.patch.paused === true ? suspendSession(session) : session
    return { ...base, game: { ...base.game, settings: { ...base.game.settings, ...action.patch } } }
  }
  if (action.type === 'tutorial') return { ...session, game: { ...session.game, tutorial: action.step } }

  if (action.type !== 'reroll' && action.now !== undefined) session = advanceSession(session, action.now)

  const transaction = action.type === 'buy' ? buyOfferAt(session.game, action.index, { area: action.area ?? 'board', index: action.destination }, action.offerId)
    : action.type === 'reroll' ? rerollOffers(session.game)
    : action.type === 'recycle' ? recycleGem(session.game, action.index, action.gemId, action.area)
    : transferGem(session.game, action.from, action.to)
  // Editing the board NEVER clears, settles, restarts or recalculates an existing wave.
  const updated = { ...session, game: transaction.game, notice: transaction.message, noticeError: !transaction.ok,
    ...(transaction.ok && (transaction.game.board !== session.game.board || transaction.game.stones !== session.game.stones)
      ? { warning: false, limitNotice: '' } : {}),
    excavationEffects: transaction.ok && action.type === 'buy' && transaction.game.excavations > session.game.excavations
      ? [...session.excavationEffects.slice(-15), { id: transaction.game.excavations, index: action.destination, at: action.now ?? session.boardChangedAt }]
      : session.excavationEffects,
    discovery: transaction.found || transaction.reward ? { mineral: transaction.found, gem: transaction.reward } : session.discovery,
    boardChangedAt: transaction.ok && action.type !== 'reroll' ? action.now ?? session.boardChangedAt : session.boardChangedAt,
    mergedId: transaction.merged ? (action.type === 'buy'
      ? (action.area === 'inventory' ? transaction.game.inventory[action.destination] : occupantAt(transaction.game.board, action.destination)?.gem)?.id ?? null
      : action.type === 'transfer' ? (action.to.area === 'inventory' ? transaction.game.inventory[action.to.index]
        : occupantAt(transaction.game.board, action.to.index)?.gem)?.id ?? null : null) : null }
  return transaction.ok && action.type !== 'reroll' && action.now !== undefined ? advanceSession(updated, action.now) : updated
}
