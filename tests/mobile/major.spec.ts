import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import { discoverMineral } from '../../src/game/terrain.ts'
import { rollExcavationReward } from '../../src/game/rewards.ts'
import type { GameState, Gem } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const slot = (page: Page, area: string, index: number) => page.locator(`[data-area="${area}"][data-index="${index}"]`)
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
const major = (id = 'gem-1', level = 0): Gem => ({ id, kind: 'major', level, rarity: 'rare', invested: 0 })
function fixture() { const game = createInitialGame(); game.stones.fill(false); game.settings.paused = true; return game }
async function seed(page: Page, game: GameState) {
  await page.addInitScript((state) => { if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
}
async function storedAnchor(page: Page, anchor: number, level = 0) {
  await expect.poll(async () => (await saved(page)).board[anchor]?.level).toBe(level)
  expect((await saved(page)).board.filter(Boolean)).toHaveLength(1)
}

test('pose tactile : quatre cases libres, rocher couvert et bord refusés, retour en inventaire et persistance', async ({ page }) => {
  const game = fixture(); game.inventory[0] = major(); game.stones[29] = true
  await seed(page, game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await slot(page, 'inventory', 0).tap()
  await slot(page, 'board', 28).tap() // Anchor free, second cell blocked.
  await expect(page.getByTestId('game-notice')).toContainText('empreinte')
  expect(await saved(page)).toEqual(game)
  await slot(page, 'board', 34).tap() // Right edge.
  await expect(page.getByTestId('game-notice')).toContainText('empreinte')
  await slot(page, 'board', 30).tap()
  await storedAnchor(page, 30)
  await expect(page.locator('.board-cell.occupied')).toHaveCount(4)
  await expect(page.locator('.board-cell .gem-view.major')).toHaveCount(1)
  for (const index of [30, 31, 37, 38]) await expect(slot(page, 'board', index)).toHaveAccessibleName(/Gemme majeure 2×2 \+4/)
  await slot(page, 'board', 38).tap()
  await slot(page, 'inventory', 0).tap()
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Gemme majeure/)
  await slot(page, 'inventory', 0).tap(); await slot(page, 'board', 54).tap()
  await storedAnchor(page, 54)
  await page.reload()
  await expect(page.locator('.board-cell .gem-view.major')).toHaveCount(1)
  await expect(slot(page, 'board', 62)).toHaveAccessibleName(/Gemme majeure 2×2 \+4/)
})

test('fusion de deux majeures via un quartier couvert : +8, un objet ; récolte classique incompatible', async ({ page }) => {
  const game = fixture(); game.board[30] = major(); game.inventory[0] = major('gem-2')
  game.inventory[1] = { id: 'gem-3', kind: 'harvest', level: 0, rarity: 'rare', invested: 0 }
  await seed(page, game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await slot(page, 'inventory', 0).tap(); await slot(page, 'board', 38).tap()
  await storedAnchor(page, 30, 1)
  await expect(slot(page, 'board', 30).locator('.gem-value')).toHaveText('+8')
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/emplacement vide/)
  await slot(page, 'inventory', 1).tap(); await slot(page, 'board', 31).tap()
  await expect(page.getByTestId('game-notice')).toContainText('Fusion impossible')
  await expect(slot(page, 'inventory', 1)).toHaveAccessibleName(/Récolte \+1/)
  await storedAnchor(page, 30, 1)
})

test('glisser tactile depuis un quartier couvert, chevauchement de soi-même et annulation', async ({ page }) => {
  const game = fixture(); game.board[30] = major()
  await seed(page, game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  const client = await page.context().newCDPSession(page)
  async function drag(fromIndex: number, area: string, toIndex: number, cancel = false) {
    const from = (await slot(page, 'board', fromIndex).boundingBox())!, to = (await slot(page, area, toIndex).boundingBox())!
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
    await expect(page.locator('.drag-ghost .major')).toBeVisible()
    await client.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
  }
  await drag(38, 'board', 31, true)
  expect(await saved(page)).toEqual(game)
  await drag(38, 'board', 31)
  await storedAnchor(page, 31)
  await expect(slot(page, 'board', 30)).toHaveAccessibleName(/case vide/)
  await drag(39, 'inventory', 0)
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Gemme majeure/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
})

test('clavier : contribution, fusion plateau vers inventaire et recyclage d’un objet stocké', async ({ page }) => {
  const game = fixture(); game.settings.viewMode = 'advanced'; game.board[30] = major(); game.inventory[0] = major('gem-2')
  await seed(page, game)
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0,8 ✧/s')
  await slot(page, 'board', 38).focus(); await page.keyboard.press('Enter')
  await expect(page.getByTestId('gem-inspector')).toContainText('Majeure 2×2')
  await expect(page.getByTestId('gem-contribution')).toContainText('+0,8 ✧/s')
  await page.getByRole('button', { name: 'Choisir une destination dans l’inventaire' }).click()
  await slot(page, 'inventory', 0).focus(); await page.keyboard.press('Enter')
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Gemme majeure 2×2 \+8/)
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0 ✧/s')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Afficher la boutique', exact: true }).click()
  await page.getByRole('button', { name: 'Recycler la gemme sélectionnée pour 0 Éclats', exact: true }).click()
  await expect.poll(async () => (await saved(page)).inventory[0]).toBeNull()
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
})

test('découverte d’une majeure sans espace 2×2 libre, stockage et rechargement', async ({ page }) => {
  const game = fixture(); game.stones.fill(true)
  game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
  for (let random = 0; random < 10000; random++) {
    game.excavationSeed = random
    if (rollExcavationReward(discoverMineral(game).seed, game.nextId).gem?.kind === 'major') break
  }
  await seed(page, game)
  await page.getByTestId('offer-0').tap(); await slot(page, 'board', 0).tap()
  await expect(page.getByTestId('discovery-toast')).toContainText('Majeure +4 rare')
  await page.locator('.discovery-open').tap()
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Gemme majeure/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 22')
  await slot(page, 'inventory', 0).tap(); await slot(page, 'board', 0).tap()
  await expect(page.getByTestId('game-notice')).toContainText('empreinte')
  await expect.poll(async () => (await saved(page)).inventory[0]?.kind).toBe('major')
  expect((await saved(page)).board.filter(Boolean)).toHaveLength(0)
  await page.reload()
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Gemme majeure/)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 568, height: 320 }]) {
  test('rendu d’un seul cristal sur quatre cellules : ' + viewport.width + ' × ' + viewport.height, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    const game = fixture(); game.board[30] = major('gem-1', 3)
    await seed(page, game)
    await expect(page.locator('canvas')).toHaveCount(1)
    const gem = page.locator('.board-cell .gem-view.major')
    await expect(gem).toHaveCount(1)
    await expect(gem.locator('.gem-value')).toHaveText('+16')
    const crystal = (await gem.boundingBox())!, cell = (await slot(page, 'board', 30).boundingBox())!
    expect(crystal.width / cell.width).toBeGreaterThan(1.8)
    expect(crystal.height / cell.height).toBeGreaterThan(1.8)
    expect(crystal.width / cell.width).toBeLessThan(2.1)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('major.png'), scale: 'css' })
  })
}

test('flux réel : une récolte +4 pour deux cellules traversées, brillance et modes sans recréer le canvas', async ({ page }) => {
  const game = fixture(); game.settings = { ...game.settings, paused: false, viewMode: 'advanced' }; game.board[28] = major()
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await seed(page, game)
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  for (let i = 0; i < 70 && await orb.count() === 0; i++) {
    await page.clock.runFor(100)
    if (i < 10) await page.waitForLoadState('networkidle')
  }
  await expect(orb).toBeVisible()
  const canvas = (await page.locator('canvas').elementHandle())!
  await page.clock.runFor(850)
  await expect(page.getByTestId('balance')).toHaveText('✧ 34')
  await expect(page.locator('.flow-number.harvest')).toHaveText('+4')
  expect(Number(await slot(page, 'board', 28).evaluate((cell) => cell.style.getPropertyValue('--flow-intensity')))).toBeGreaterThan(0)
  await page.clock.runFor(800)
  await expect(page.getByTestId('balance')).toHaveText('✧ 34')
  await expect(orb).toHaveAttribute('data-energy', '1')
  await page.getByRole('button', { name: 'Passer en vue épurée' }).click()
  await page.clock.runFor(16)
  await expect(orb).toHaveAttribute('data-appearance', 'spark')
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
  await expect(page.getByTestId('balance')).toHaveText('✧ 34')
})
