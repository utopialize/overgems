import { createEmission, advanceEmission } from '../game/engine'
import type { GameState } from '../game/types'

declare global { interface Window { overgemsDiagnostics?: () => unknown } }

export function installDiagnostics(getGame: () => GameState): () => void {
  const diagnose = () => {
    const game = getGame(), start = performance.now()
    let running = createEmission(), peak = 1
    while (!running.done) {
      peak = Math.max(peak, running.frontier.length)
      running = advanceEmission(game.board, running, game.stones)
    }
    return { scope: 'current-board-forecast', events: running.result.events.length, branches: running.nextBranch,
      peakBranches: peak, depth: running.result.maxStep, gain: running.result.gain,
      limited: running.result.limited, causes: running.result.limits, elapsedMs: performance.now() - start }
  }
  window.overgemsDiagnostics = diagnose
  return () => { if (window.overgemsDiagnostics === diagnose) delete window.overgemsDiagnostics }
}
