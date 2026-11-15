import { createServer } from 'vite'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
const baselinePath = 'node_modules/.tmp/overgems-engine-baseline.ts'
try {
  const engine = await server.ssrLoadModule('/src/game/engine.ts')
  const baselineRef = process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1]
  let baseline
  if (baselineRef) {
    const source = execFileSync('git', ['show', baselineRef + ':src/game/engine.ts'], { encoding: 'utf8' })
      .replaceAll("from './", "from '/src/game/")
    await mkdir('node_modules/.tmp', { recursive: true })
    await writeFile(baselinePath, source)
    baseline = await server.ssrLoadModule('/' + baselinePath)
  }
  const { createInitialGame } = await server.ssrLoadModule('/src/game/state.ts')
  const requested = process.argv.find((arg) => arg.startsWith('--events='))
  const maxEvents = requested ? Number(requested.split('=')[1]) : undefined
  const profiles = []
  const add = (name, configure) => {
    const game = createInitialGame(); game.stones.fill(false); configure(game)
    profiles.push({ name, game })
  }
  add('empty', () => {})
  add('line', (g) => { for (let x = 0; x < 7; x++) g.board[28 + x] = x === 6
    ? { id: 'gem-' + x, kind: 'harvest', level: 0 }
    : { id: 'gem-' + x, kind: 'multiplier', level: 0, setting: 'EW' } })
  for (const size of [2, 3, 4, 7]) add('cross-grid-' + size, (g) => {
    for (let y = 3; y < Math.min(9, 3 + size); y++) for (let x = 0; x < size; x++) {
      const index = y * 7 + x
      g.board[index] = { id: 'gem-' + index, kind: 'multiplier', level: 0, setting: 'NESW' }
    }
    if (size < 7) g.board[28 + size] = { id: 'gem-90', kind: 'harvest', level: 0 }
  })
  const rows = []
  for (const { name, game } of profiles) {
    const samples = [], baselineSamples = []
    let result, peak = 0, running
    for (let warmup = 0; warmup < 15; warmup++) {
      engine.simulateEmission(game.board, { maxEvents, stones: game.stones })
      baseline?.simulateEmission(game.board, { maxEvents, stones: game.stones })
    }
    for (let repeat = 0; repeat < 30; repeat++) {
      const start = performance.now()
      result = engine.simulateEmission(game.board, { maxEvents, stones: game.stones })
      samples.push(performance.now() - start)
      if (baseline) {
        const before = performance.now()
        const old = baseline.simulateEmission(game.board, { maxEvents, stones: game.stones })
        baselineSamples.push(performance.now() - before)
        if (old.gain !== result.gain || JSON.stringify(old.events) !== JSON.stringify(result.events)) throw new Error('Economic/event regression: ' + name)
      }
    }
    running = engine.createEmission({ maxEvents })
    while (!running.done) {
      peak = Math.max(peak, running.frontier.length)
      running = engine.advanceEmission(game.board, running, game.stones)
    }
    samples.sort((a, b) => a - b)
    baselineSamples.sort((a, b) => a - b)
    rows.push({ name, gems: game.board.filter(Boolean).length, events: result.events.length,
      branches: running.nextBranch, peakBranches: peak, depth: result.maxStep, limited: result.limited,
      causes: result.limits ?? (result.limited ? ['legacy-unspecified'] : []),
      loops: result.events.filter((event) => event.reason === 'loop').length, gain: result.gain,
      medianMs: +samples[15].toFixed(3), p95Ms: +samples[28].toFixed(3),
      ...(baseline ? { beforeMedianMs: +baselineSamples[15].toFixed(3), beforeP95Ms: +baselineSamples[28].toFixed(3), eventsAndGainsUnchanged: true } : {}) })
  }
  const report = { revision: process.env.BENCH_REVISION ?? 'working-tree', maxEvents: maxEvents ?? 'default', rows }
  console.log(JSON.stringify(report, null, 2))
  const output = process.argv.find((arg) => arg.startsWith('--output='))
  if (output) await writeFile(output.slice('--output='.length), JSON.stringify(report, null, 2) + '\n')
} finally { await server.close(); await unlink(baselinePath).catch(() => {}) }
