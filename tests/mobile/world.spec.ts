import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import { buyExpansion } from '../../src/game/world.ts'
import type { GameState } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, columns: number, x: number, y = 4) => page.locator(`[data-area=board][data-index="${y * columns + x}"]`)
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
function fixture(columns = 7) {
  let game = createInitialGame(); game.settings.paused = true; game.coins = 10000
  while (game.columns < columns) game = buyExpansion(game).game
  return game
}
async function seed(page: Page, game: GameState | object) {
  await page.addInitScript((state) => { if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
}
async function fitted(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1 && scrollX === 0 && scrollY === 0)).toBe(true)
}
async function scrollToColumn(page: Page, column: number) {
  await page.locator('[data-board-viewport]').evaluate((element, x) => { element.scrollLeft = x * element.clientWidth / 7 }, column)
  await expect.poll(async () => Number((await page.getByTestId('world-position').textContent())!.split('–')[0])).toBe(column + 1)
}

test('achat des quatre extensions : prix, cases rocheuses, cellules de même taille et sauvegarde', async ({ page }) => {
  const game = fixture(); game.coins = 2000
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  await seed(page, game)
  const initialWidth = (await cell(page, 7, 0).boundingBox())!.width
  for (const [price, columns] of [[100, 14], [200, 21], [400, 28], [800, 35]]) {
    await page.getByRole('button', { name: 'Acheter 7 colonnes pour ' + price + ' Éclats' }).tap()
    await expect(page.locator('[data-area=board]')).toHaveCount(columns! * 9)
    await expect(page.getByTestId('world-position')).toHaveText(`${columns! - 6}–${columns} / ${columns}`)
    const fresh = cell(page, columns!, columns! - 7)
    await expect(fresh).toHaveAttribute('data-stone', 'true')
    expect(Math.abs((await fresh.boundingBox())!.width - initialWidth)).toBeLessThan(1)
    await expect.poll(async () => (await saved(page)).columns).toBe(columns)
    expect((await saved(page)).board[4 * columns!]?.id).toBe('gem-1')
    await fitted(page)
  }
  await expect(page.getByTestId('balance')).toHaveAttribute('title', '500')
  await expect(page.getByRole('button', { name: 'Territoire maximal débloqué' })).toBeDisabled()
  expect(await page.locator('.stone-view').count()).toBeLessThanOrEqual(90)
  await page.reload()
  await expect(page.getByTestId('world-position')).toHaveText('1–7 / 35')
  await expect(cell(page, 35, 0)).toHaveAccessibleName(/Récolte/)
})

test('balayage tactile sur les rochers : caméra seule, sans excavation ni perte de sélection', async ({ page }) => {
  const game = fixture(14); game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
  await seed(page, game); await scrollToColumn(page, 7)
  await page.getByTestId('offer-0').tap()
  const before = await saved(page), viewport = page.locator('[data-board-viewport]'), bounds = (await viewport.boundingBox())!
  const client = await page.context().newCDPSession(page)
  const start = { x: bounds.x + bounds.width * 0.2, y: bounds.y + bounds.height * 0.4 }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  for (let i = 1; i <= 8; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + bounds.width * 0.65 * i / 8, y: start.y }] })
    await page.waitForTimeout(16)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeLessThan(bounds.width * 0.8)
  expect(await saved(page)).toEqual(before)
  await expect(page.getByTestId('offer-0')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Revenir à la source' }).tap()
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBe(0)
  await fitted(page)
})

test('souris et trackpad déplacent la caméra sans déplacer la page', async ({ page }) => {
  await seed(page, fixture(21))
  const viewport = page.locator('[data-board-viewport]'), bounds = (await viewport.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 3)
  await page.mouse.wheel(150, 0)
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100)
  await page.getByRole('button', { name: 'Revenir à la source' }).click()
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBe(0)
  const y = bounds.y + bounds.height * 0.15
  await page.mouse.move(bounds.x + bounds.width * 0.8, y); await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.2, y, { steps: 10 }); await page.mouse.up()
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(bounds.width * 0.4)
  await fitted(page)
})

test('caméra décalée : excavation, achat avec fusion, inventaire et nouvelle pose', async ({ page }) => {
  const game = fixture(14)
  game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
  game.stones[4 * 14 + 9] = false
  game.board[4 * 14 + 9] = { id: 'gem-1', kind: 'harvest', level: 0 }
  await seed(page, game); await scrollToColumn(page, 7)
  await page.getByTestId('offer-0').tap(); await cell(page, 14, 8).tap()
  await expect(cell(page, 14, 8)).toHaveAccessibleName(/case vide/)
  await page.getByTestId('offer-2').tap(); await cell(page, 14, 9).tap()
  await expect(cell(page, 14, 9)).toHaveAccessibleName(/Récolte \+2/)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await cell(page, 14, 9).tap()
  await page.locator('[data-area=inventory][data-index="0"]').tap()
  await page.locator('[data-area=inventory][data-index="0"]').tap(); await cell(page, 14, 8).tap()
  await expect(cell(page, 14, 8)).toHaveAccessibleName(/Récolte \+2/)
  await expect.poll(async () => (await saved(page)).board[64]?.level).toBe(1)
  await expect(page.getByTestId('balance')).toHaveAttribute('title', String(game.coins - 14))
  await fitted(page)
})

test('vue avancée : choisir en boutique conserve la caméra et le clavier prévisualise la zone visible', async ({ page }) => {
  const game = fixture(14); game.settings.viewMode = 'advanced'
  game.stones[4 * 14 + 7] = false; game.stones[4 * 14 + 8] = false
  await seed(page, game); await scrollToColumn(page, 7)
  const viewport = page.locator('[data-board-viewport]'), before = await viewport.evaluate((element) => element.scrollLeft)
  await page.getByTestId('offer-2').focus(); await page.keyboard.press('Enter')
  await expect(cell(page, 14, 7)).toBeFocused()
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(before)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('placement-preview')).toContainText('Δ +0,2 ✧/s')
  await page.keyboard.press('Enter')
  await expect(cell(page, 14, 8)).toHaveAccessibleName(/Récolte \+1/)
  await fitted(page)
})

test('glisser maintenu au bord : défilement automatique et dépôt sur la vraie case monde', async ({ page }) => {
  const game = fixture(14); game.stones.fill(false)
  game.inventory[0] = { id: 'gem-1', kind: 'harvest', level: 0 }
  await seed(page, game); await expect(page.locator('canvas')).toHaveCount(1)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  const from = (await page.locator('[data-area=inventory][data-index="0"]').boundingBox())!
  const viewport = page.locator('[data-board-viewport]'), bounds = (await viewport.boundingBox())!
  const point = { x: bounds.x + bounds.width - 5, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down()
  await page.mouse.move(point.x, point.y, { steps: 6 })
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(bounds.width * 0.4)
  const target = await page.evaluate(({ x, y }) => Number(document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-area=board]')?.dataset.index), point)
  await page.mouse.up()
  await expect.poll(async () => (await saved(page)).board[target]?.id).toBe('gem-1')
  await expect(viewport).not.toHaveAttribute('data-drag-scroll')
  await expect(page.getByTestId('balance')).toHaveAttribute('title', String(game.coins))
  await fitted(page)
})

test('majeure à cheval sur la frontière : un cristal, quatre cellules, fusion après défilement', async ({ page }, info) => {
  const game = fixture(14), major = { id: 'gem-1', kind: 'major' as const, rarity: 'rare' as const, level: 0, invested: 0 }
  for (const index of [62, 63, 76, 77]) game.stones[index] = false
  game.inventory[0] = major; game.inventory[1] = { ...major, id: 'gem-2' }
  await seed(page, game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await page.locator('[data-area=inventory][data-index="0"]').tap(); await cell(page, 14, 6).tap()
  await scrollToColumn(page, 4)
  await expect(page.locator('.board-cell .gem-view.major')).toHaveCount(1)
  await page.locator('[data-area=inventory][data-index="1"]').tap(); await cell(page, 14, 7, 5).tap()
  await expect(cell(page, 14, 6).locator('.gem-value')).toHaveText('+8')
  await expect.poll(async () => (await saved(page)).board[62]?.level).toBe(1)
  expect((await saved(page)).board.filter(Boolean)).toHaveLength(1)
  await page.screenshot({ path: info.outputPath('major-zone-boundary.png'), scale: 'css' })
  await fitted(page)
})

test('propagation hors écran sur 35 colonnes : vrai gain, prévision entière et canvas borné', async ({ page }) => {
  const game = fixture(35); game.stones.fill(false); game.settings = { ...game.settings, paused: false, viewMode: 'advanced' }
  game.board[4 * 35 + 34] = { id: 'gem-1', kind: 'harvest', level: 2 }
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await seed(page, game)
  for (let i = 0; i < 30 && await page.locator('canvas').count() === 0; i++) { await page.clock.runFor(50); await page.waitForLoadState('networkidle') }
  await expect(page.locator('.board-cell .gem-view.harvest')).toHaveCount(0)
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0,6 ✧/s')
  const canvas = (await page.locator('canvas').elementHandle())!
  // Sample the crossing of the visible right edge, not only the final balance.
  await page.clock.runFor(10300)
  for (let i = 0; i < 18; i++) { await page.clock.runFor(100); await fitted(page) }
  await page.clock.runFor(21400)
  await expect(page.getByTestId('balance')).toHaveAttribute('title', String(game.coins + 3))
  await expect(page.getByTestId('last-gain')).toHaveText('+3')
  await scrollToColumn(page, 28); await page.clock.runFor(50)
  await expect(page.locator('.board-cell .gem-view.harvest')).toHaveCount(1)
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
  const size = await canvas.evaluate((element) => element.getBoundingClientRect().width)
  expect(size).toBeLessThanOrEqual(390)
  await fitted(page)
})

test('migration d’une ancienne sauvegarde 7×9 : terrain, majeure et inventaire inchangés', async ({ page }) => {
  const game = fixture(); game.stones.fill(false)
  game.board[30] = { id: 'gem-1', kind: 'major', level: 1, rarity: 'rare', invested: 12 }
  game.inventory[11] = { id: 'gem-2', kind: 'harvest', level: 3 }
  await seed(page, { ...game, columns: undefined })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByTestId('world-position')).toHaveText('1–7 / 7')
  await expect(page.locator('.board-cell.stone')).toHaveCount(0)
  await expect(page.locator('.board-cell .gem-value')).toHaveText('+8')
  await expect.poll(async () => (await saved(page)).columns).toBe(7)
  expect((await saved(page)).inventory).toEqual(game.inventory)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test('monde 35×9 sans débordement de page : ' + viewport.width + ' × ' + viewport.height, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await seed(page, fixture(35)); await scrollToColumn(page, 28)
    await expect(page.locator('canvas')).toHaveCount(1)
    const controls = ['Revenir à la source', 'Territoire maximal débloqué']
    for (const name of controls) { const bounds = (await page.getByRole('button', { name }).boundingBox())!; expect(bounds.height).toBeGreaterThanOrEqual(44); expect(bounds.width).toBeGreaterThanOrEqual(44) }
    await fitted(page)
    await page.screenshot({ path: info.outputPath('expanded-world.png'), scale: 'css' })
  })
}
