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
  const { buyExpansion } = await server.ssrLoadModule('/src/game/world.ts')
  const { createSession, sessionReducer } = await server.ssrLoadModule('/src/game/runtime.ts')
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
  const wide = () => {
    let game = createInitialGame(); game.coins = 10000
    while (game.columns < 35) game = buyExpansion(game).game
    game.stones.fill(false)
    return game
  }
  add('world35-line', (g) => { Object.assign(g, wide()); g.board[4 * 35 + 34] = { id: 'gem-1', kind: 'harvest', level: 11 } })
  add('world35-dense', (g) => { Object.assign(g, wide()); g.board = g.board.map((_, index) => ({ id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' })) })
  const rows = []
  for (const { name, game } of profiles) {
    const compare = baseline && game.columns === 7
    const samples = [], baselineSamples = []
    let result, peak = 0, running
    for (let warmup = 0; warmup < 15; warmup++) {
      engine.simulateEmission(game.board, { maxEvents, stones: game.stones })
      if (compare) baseline.simulateEmission(game.board, { maxEvents, stones: game.stones })
    }
    for (let repeat = 0; repeat < 30; repeat++) {
      const start = performance.now()
      result = engine.simulateEmission(game.board, { maxEvents, stones: game.stones })
      samples.push(performance.now() - start)
      if (compare) {
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
    rows.push({ name, columns: game.columns, gems: game.board.filter(Boolean).length, events: result.events.length,
      branches: new Set(result.events.map((event) => event.branch)).size, allocatedBranchIds: running.nextBranch,
      peakBranches: peak, depth: result.maxStep, limited: result.limited,
      causes: result.limits ?? (result.limited ? ['legacy-unspecified'] : []),
      loops: result.events.filter((event) => event.reason === 'loop').length, gain: result.gain,
      medianMs: +samples[15].toFixed(3), p95Ms: +samples[28].toFixed(3),
      ...(compare ? { beforeMedianMs: +baselineSamples[15].toFixed(3), beforeP95Ms: +baselineSamples[28].toFixed(3), eventsAndGainsUnchanged: true } : {}) })
  }
  const snake = wide()
  for (let y = 4; y < 9; y++) for (let x = 0; x < 35; x++) snake.board[y * 35 + x] = { id: 'gem-' + (100 + y * 35 + x), kind: 'harvest', level: 0 }
  for (const [x, y, setting] of [[34, 4, 'SW'], [34, 5, 'NW'], [0, 5, 'ES'], [0, 6, 'NE'], [34, 6, 'SW'], [34, 7, 'NW'], [0, 7, 'ES'], [0, 8, 'NE']]) {
    snake.board[y * 35 + x] = { id: 'gem-' + (100 + y * 35 + x), kind: 'multiplier', level: 0, setting }
  }
  let session = createSession(snake, 0), peakEmissions = 0
  const ticks = [], liveStart = performance.now()
  for (let now = 25; now <= 300000; now += 25) {
    const start = performance.now()
    session = sessionReducer(session, { type: 'tick', now })
    ticks.push(performance.now() - start)
    peakEmissions = Math.max(peakEmissions, session.pending.length)
  }
  ticks.sort((a, b) => a - b)
  const live = { name: 'world35-serpentine-175-cells', simulatedSeconds: 300, emitted: session.serial,
    completed: session.game.stats.emissions, peakEmissions, elapsedMs: +(performance.now() - liveStart).toFixed(3),
    p95TickMs: +ticks[Math.floor(ticks.length * 0.95)].toFixed(3), maxTickMs: +ticks.at(-1).toFixed(3),
    credited: session.game.stats.earned, limited: session.warning }
  const report = { revision: process.env.BENCH_REVISION ?? 'working-tree', maxEvents: maxEvents ?? 'default', rows, live }
  console.log(JSON.stringify(report, null, 2))
  const output = process.argv.find((arg) => arg.startsWith('--output='))
  if (output) await writeFile(output.slice('--output='.length), JSON.stringify(report, null, 2) + '\n')
} finally { await server.close(); await unlink(baselinePath).catch(() => {}) }
