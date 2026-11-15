import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import type { GameState } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator(`[data-area=board][data-index="${index}"]`)
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
function fixture() {
  const game = createInitialGame()
  game.settings = { ...game.settings, viewMode: 'advanced', paused: true }
  game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 9, setting: 'EW', invested: 20 }
  game.board[29] = { id: 'gem-2', kind: 'harvest', level: 0, invested: 6 }
  game.stats = { emissions: 1, earned: 858, lastGain: 858, recent: [858] }
  return game
}
async function seed(page: Page, game: GameState) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state))
  }, game)
  await page.goto('/')
}

test('vue épurée par défaut, sélection conservée et préférence mémorisée depuis les deux commandes', async ({ page }) => {
  const game = fixture()
  game.settings.viewMode = 'simple'
  await seed(page, game)
  await expect(page.getByRole('button', { name: 'Passer en vue avancée' })).toBeVisible()
  await expect(page.locator('.view-toggle')).toHaveText('')
  await expect(page.locator('.view-toggle svg')).toBeVisible()
  await expect(page.getByTestId('last-gain')).toHaveCount(0)
  await expect(page.getByTestId('theoretical-rate')).toHaveCount(0)
  await cell(page, 28).click()
  await expect(page.getByTestId('gem-inspector')).toHaveCount(0)
  await expect(page.getByRole('status')).toBeEmpty()
  const board = await page.locator('.board-grid').boundingBox()
  await page.getByRole('button', { name: 'Passer en vue avancée' }).click()
  await expect(page.getByTestId('gem-inspector')).toBeVisible()
  expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
  await expect.poll(async () => (await saved(page)).settings.viewMode).toBe('advanced')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Passer en vue épurée' })).toBeVisible()
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  await page.getByRole('combobox', { name: 'Mode d’affichage' }).selectOption('simple')
  await page.getByRole('button', { name: 'Fermer les paramètres' }).click()
  await expect.poll(async () => (await saved(page)).settings.viewMode).toBe('simple')
  await page.reload()
  await expect(page.locator('main')).toHaveClass(/simple-view/)
})

test('flux réel, rendement fixe, inspection et aperçu clavier restent indépendants du solde', async ({ page }) => {
  await seed(page, fixture())
  await expect(page.getByTestId('last-gain')).toHaveText('+858')
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0,4 ✧/s')
  await cell(page, 28).click()
  const inspector = page.getByTestId('gem-inspector')
  await expect(inspector).toContainText('Amplification · Niveau 10')
  await expect(page.getByTestId('gem-exact-value')).toHaveText('×2')
  await expect(inspector.locator('.inspector-ports')).toHaveAttribute('aria-label', 'droite, gauche')
  await expect(inspector).toContainText('10 ✧')
  await expect(page.getByTestId('gem-contribution')).toContainText('+0,2 ✧/s')
  const before = await saved(page)
  await page.keyboard.press('ArrowDown')
  await expect(cell(page, 35)).toBeFocused()
  await expect(page.getByTestId('placement-preview')).toContainText('Δ -0,2 ✧/s')
  expect(await saved(page)).toEqual(before)
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  await page.keyboard.press('Enter')
  await expect(cell(page, 35)).toHaveAccessibleName(/Amplification/)
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0,2 ✧/s')
  await expect(page.getByTestId('last-gain')).toHaveText('+858')
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
})

test('un achat glissé affiche son rendement avant de payer et la grille reste immobile', async ({ page }) => {
  const game = createInitialGame()
  game.settings = { ...game.settings, paused: true, viewMode: 'advanced' }
  await seed(page, game)
  const board = await page.locator('.board-grid').boundingBox()
  const from = (await page.getByTestId('offer-0').boundingBox())!
  const to = (await cell(page, 28).boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await expect(page.getByTestId('placement-preview')).toContainText('Après pose : 0,2 ✧/s · Δ +0,2 ✧/s')
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  expect((await saved(page)).board.every((gem: unknown) => gem === null)).toBe(true)
  expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
  await page.mouse.up()
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0,2 ✧/s')
})

test('annuler un aperçu tactile ne paie rien et ne change pas le rendement', async ({ page }) => {
  const game = createInitialGame()
  game.settings = { ...game.settings, paused: true, viewMode: 'advanced' }
  await seed(page, game)
  const from = (await page.getByTestId('offer-0').boundingBox())!
  const to = (await cell(page, 28).boundingBox())!
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  await expect(page.getByTestId('placement-preview')).toContainText('Δ +0,2 ✧/s')
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await expect(page.getByTestId('placement-preview')).toHaveCount(0)
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0 ✧/s')
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
})

test('au clavier, une offre inspectée conserve l’accès au plateau et le recyclage reste accessible sur le panneau', async ({ page }) => {
  const game = createInitialGame()
  game.settings = { ...game.settings, paused: true, viewMode: 'advanced' }
  await seed(page, game)
  await page.getByTestId('offer-0').focus()
  await page.keyboard.press('Enter')
  await expect(cell(page, 28)).toBeFocused()
  await expect(page.getByTestId('gem-inspector')).toBeVisible()
  await expect(page.locator('.shop-offers')).toHaveAttribute('inert', '')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('placement-preview')).toContainText('Δ +0,2 ✧/s')
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  await page.keyboard.press('Enter')
  await expect(cell(page, 29)).toHaveAccessibleName(/Récolte/)
  await page.keyboard.press('Enter')
  const recycle = page.getByRole('button', { name: 'Recycler la gemme sélectionnée pour 3 Éclats' })
  await recycle.focus()
  await page.keyboard.press('Enter')
  await expect(cell(page, 29)).toHaveAccessibleName(/case vide/)
  await expect(cell(page, 29)).toBeFocused()
  await expect(page.getByTestId('balance')).toHaveText('✧ 27')
  await expect(page.getByTestId('theoretical-rate')).toHaveText('0 ✧/s')
})

test('les limites produisent une estimation partielle et une contribution indisponible', async ({ page }) => {
  const game = fixture()
  game.nextId = 200
  game.stones.fill(false)
  game.board = game.board.map((_, index) => ({ id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' }))
  await seed(page, game)
  await expect(page.getByTestId('theoretical-rate')).toHaveAttribute('data-limited', 'true')
  await expect(page.getByTestId('theoretical-rate')).toContainText('≥')
  await cell(page, 28).click()
  await expect(page.getByTestId('gem-contribution')).toHaveText('— · limite atteinte')
})

test('changer de vue conserve la même impulsion, sa puissance, la brillance et ses vrais gains', async ({ page }, testInfo) => {
  const game = fixture()
  game.settings = { ...game.settings, paused: false, viewMode: 'simple' }
  await page.clock.install()
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await seed(page, game)
  for (let i = 0; i < 20 && await page.locator('canvas').count() === 0; i++) {
    await page.clock.runFor(50)
    await page.waitForLoadState('networkidle')
  }
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  for (let i = 0; i < 60 && await orb.count() === 0; i++) await page.clock.runFor(100)
  const node = (await orb.elementHandle())!
  const canvas = (await page.locator('canvas').elementHandle())!
  await expect(orb).toHaveText('')
  await expect(orb).toHaveAttribute('data-appearance', 'spark')
  expect((await orb.boundingBox())!.width).toBe(6)
  await page.clock.runFor(200)
  await page.screenshot({ path: testInfo.outputPath('simple-view.png'), scale: 'css' })
  await page.getByRole('button', { name: 'Passer en vue avancée' }).click()
  await page.clock.runFor(50)
  await expect(orb).toHaveText('1,0')
  await expect(orb).toHaveAttribute('data-appearance', 'bubble')
  expect((await orb.boundingBox())!.width).toBe(18)
  expect(await node.evaluate((element) => element.isConnected)).toBe(true)
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
  await page.getByRole('button', { name: 'Passer en vue épurée' }).click()
  await page.clock.runFor(1700)
  await expect(orb).toHaveText('')
  await expect(orb).toHaveAttribute('data-appearance', 'spark')
  await expect(orb).toHaveAttribute('data-energy', '2')
  await expect(page.locator('.flow-number')).toHaveCount(0)
  expect(Number(await cell(page, 29).evaluate((element) => element.style.getPropertyValue('--flow-intensity')))).toBeGreaterThan(0)
  await expect(page.getByTestId('balance')).toHaveText('✧ 32')
  await page.getByRole('button', { name: 'Passer en vue avancée' }).click()
  await page.clock.runFor(16)
  await expect(orb).toHaveText('2,0')
  await expect(page.locator('.flow-number.harvest')).toHaveText('+2')
  await expect(page.getByTestId('balance')).toHaveText('✧ 32')
  expect(await node.evaluate((element) => element.isConnected)).toBe(true)
})

for (const viewport of [
  { width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 664 },
  { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 568, height: 320 },
  { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1280, height: 800 },
]) {
  test('inspection superposée à la boutique sans déplacement de grille : ' + viewport.width + ' × ' + viewport.height, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const game = fixture()
    game.board[28] = { ...game.board[28]!, kind: 'multiplier', setting: 'NESW' }
    await seed(page, game)
    await expect(page.locator('canvas')).toHaveCount(1)
    const board = await page.locator('.board-grid').boundingBox()
    const shop = (await page.locator('.workbench').boundingBox())!
    await cell(page, 28).click()
    const inspector = page.getByTestId('gem-inspector')
    await expect(inspector).toBeVisible()
    expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
    const panel = (await inspector.boundingBox())!
    expect(panel.x).toBe(shop.x)
    expect(panel.y).toBe(shop.y)
    expect(panel.width).toBe(shop.width)
    expect(panel.height).toBe(shop.height)
    expect(await inspector.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
      && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
    const close = (await page.getByRole('button', { name: 'Fermer l’inspection' }).boundingBox())!
    expect(close.height).toBeGreaterThanOrEqual(44)
    expect(close.width).toBeGreaterThanOrEqual(44)
    if (viewport.width === 390 && viewport.height === 844 || viewport.width === 568) {
      await page.screenshot({ path: testInfo.outputPath('inspection.png'), scale: 'css' })
    }
    await page.getByRole('button', { name: 'Fermer l’inspection' }).click()
    await expect(inspector).toHaveCount(0)
    expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
  })
}
