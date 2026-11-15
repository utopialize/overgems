import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import type { GameState } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator(`[data-area=board][data-index="${index}"]`)
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
function fixture() {
  const game = createInitialGame()
  game.settings.paused = true
  game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
  return game
}
async function seed(page: Page, game: GameState) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state))
  }, game)
  await page.goto('/')
}
async function touchDrag(page: Page, index: number, cancel: boolean) {
  const from = (await page.getByTestId('offer-0').boundingBox())!
  const to = (await cell(page, index).boundingBox())!
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  await expect(page.locator('.drag-ghost .tool-view')).toBeVisible()
  await client.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
  await client.detach()
}

test('pioche tactile : annulation, case vide refusée, puis excavation sans déplacer la grille', async ({ page }) => {
  const game = fixture(), rock = game.stones.findIndex(Boolean)
  await seed(page, game)
  const board = await page.locator('.board-grid').boundingBox()
  await touchDrag(page, rock, true)
  expect(await saved(page)).toEqual(game)
  await touchDrag(page, 28, false)
  await expect(page.getByTestId('game-notice')).toContainText('Déposez la pioche sur un rocher')
  expect(await saved(page)).toEqual(game)
  await touchDrag(page, rock, false)
  await expect(cell(page, rock)).toHaveAccessibleName(/case vide/)
  await expect(page.locator('.board-cell.stone')).toHaveCount(17)
  await expect(page.getByTestId('balance')).toHaveText('✧ 22')
  expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
  await expect.poll(async () => (await saved(page)).excavations).toBe(1)
  expect((await saved(page)).purchases).toBe(0)
  await page.reload()
  await expect(cell(page, rock)).toHaveAccessibleName(/case vide/)
  await expect(page.locator('.board-cell.stone')).toHaveCount(17)
})

test('sélection tactile : outil visible, rochers ciblés et achat à la pose', async ({ page }) => {
  const game = fixture(), rock = game.stones.findIndex(Boolean)
  await seed(page, game)
  await cell(page, rock).tap()
  await expect(page.getByTestId('game-notice')).toContainText('Pioche nécessaire')
  await page.getByTestId('offer-0').tap()
  await expect(cell(page, rock)).toHaveClass(/compatible/)
  await cell(page, rock).tap()
  await expect(cell(page, rock)).toHaveAccessibleName(/case vide/)
})

test('clavier avancé : outil accessible et aperçu avant excavation', async ({ page }) => {
  const game = fixture(), rock = game.stones.findIndex(Boolean)
  game.settings.viewMode = 'advanced'
  await seed(page, game)
  await page.getByTestId('offer-0').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('gem-inspector')).toHaveCount(0)
  await expect(page.getByTestId('offer-0')).toBeVisible()
  await cell(page, rock).focus()
  await expect(page.getByTestId('placement-preview')).toContainText('Après pose')
  await page.keyboard.press('Enter')
  await expect(cell(page, rock)).toHaveAccessibleName(/case vide/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 22')
})

test('une gemme refusée sur une pierre peut ensuite être placée sur le circuit', async ({ page }) => {
  const game = createInitialGame(), rock = game.stones.findIndex(Boolean)
  game.settings.paused = true
  await seed(page, game)
  await page.getByTestId('offer-0').click()
  await cell(page, rock).click()
  await expect(page.getByTestId('game-notice')).toContainText('Un rocher occupe cette case')
  expect(await saved(page)).toEqual(game)
  await cell(page, 28).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
})

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test('découverte et collection sans scroll ni déplacement : ' + viewport.width + ' × ' + viewport.height, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const game = fixture(), rock = game.stones.findIndex(Boolean)
    game.excavations = 3 // Fourth excavation guarantees the first discovery.
    await seed(page, game)
    const board = await page.locator('.board-grid').boundingBox()
    await page.getByTestId('offer-0').click()
    await cell(page, rock).click()
    const toast = page.getByTestId('discovery-toast')
    await expect(toast).toContainText('découvert !')
    await expect(page.locator('.shop-heading')).toHaveAttribute('inert', '')
    await expect(page.getByTestId('offer-2')).toBeEnabled()
    expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
    await toast.locator('.discovery-open').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAccessibleName('Minéraux · 1/4')
    await expect(dialog.locator('.discovered')).toHaveCount(1)
    await expect(dialog).toContainText('Collection sans bonus économique')
    expect(await dialog.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('collection.png'), scale: 'css' })
    await page.getByRole('button', { name: 'Fermer la collection' }).click()
    await expect(toast).toHaveCount(0)
    await page.reload()
    await page.getByRole('button', { name: 'Ouvrir la collection de minéraux, 1 sur 4' }).click()
    await expect(dialog).toHaveAccessibleName('Minéraux · 1/4')
    await expect(dialog.locator('.discovered')).toHaveCount(1)
    expect((await saved(page)).coins).toBe(22)
  })
}

test('collision sur un rocher : éclatement au contact puis poursuite des émissions suivantes', async ({ page }, testInfo) => {
  const game = fixture()
  game.settings = { ...game.settings, paused: false, viewMode: 'advanced' }
  game.stones.fill(false)
  game.stones[29] = true
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  game.board[30] = { id: 'gem-2', kind: 'harvest', level: 1 }
  await page.clock.install()
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await seed(page, game)
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  for (let i = 0; i < 70 && await orb.count() === 0; i++) {
    await page.clock.runFor(100)
    if (i < 10) await page.waitForLoadState('networkidle')
  }
  await expect(orb).toBeVisible()
  for (let i = 0; i < 30 && await page.locator('.pulse-impact[data-reason="stone"]').count() === 0; i++) await page.clock.runFor(50)
  await expect(orb).toHaveCount(0)
  await expect(page.locator('.pulse-impact[data-reason="stone"] i')).toHaveCount(6)
  await expect(page.getByTestId('balance')).toHaveText('✧ 31')
  await page.screenshot({ path: testInfo.outputPath('stone-impact.png'), scale: 'css' })
  await page.clock.runFor(300)
  await expect(page.locator('.pulse-impact')).toHaveCount(0)
  await page.getByTestId('offer-0').click()
  await cell(page, 29).click()
  await expect(cell(page, 29)).toHaveAccessibleName(/case vide/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 23')
  for (let i = 0; i < 70 && await page.locator('.pulse-orb[data-emission="2"]').count() === 0; i++) await page.clock.runFor(100)
  await expect(page.locator('.pulse-orb[data-emission="2"]')).toBeVisible()
  await page.clock.runFor(2500)
  await expect(page.getByTestId('balance')).toHaveText('✧ 26')
})

test('ancienne sauvegarde migrée sans ajouter de rochers sur les gemmes existantes', async ({ page }) => {
  const game = createInitialGame()
  game.settings.paused = true
  game.board[1] = { id: 'gem-1', kind: 'harvest', level: 0 }
  const legacy = { ...game, stones: undefined, minerals: undefined, excavationSeed: undefined, excavations: undefined,
    offers: game.offers.map(({ item, price }) => ({ gem: item, price })) }
  await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), legacy)
  await page.goto('/')
  await expect(page.locator('.board-cell.stone')).toHaveCount(0)
  await expect(cell(page, 1)).toHaveAccessibleName(/Récolte/)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const reduced of [false, true]) {
  test('éclatement du rocher : ' + (reduced ? 'flash fixe en mode réduit' : 'fragments et poussière en vue épurée'), async ({ page }, testInfo) => {
    const game = fixture(), rock = game.stones.findIndex(Boolean)
    game.settings.reducedMotion = reduced
    if (reduced) game.settings.viewMode = 'advanced'
    await page.clock.install()
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
    await seed(page, game)
    for (let i = 0; i < 30 && await page.locator('.excavation-feedback').count() === 0; i++) {
      await page.clock.runFor(50)
      if (i < 10) await page.waitForLoadState('networkidle')
    }
    await expect(page.locator('.excavation-feedback')).toHaveCount(1)
    await expect(page.locator('.stone-burst')).toHaveCount(0)
    const board = await page.locator('.board-grid').boundingBox()
    const canvas = (await page.locator('canvas').elementHandle())!
    await page.getByTestId('offer-0').click()
    await cell(page, rock).click()
    await page.clock.runFor(60)
    const burst = page.locator('.stone-burst')
    await expect(burst).toHaveAttribute('data-cell', String(rock))
    await expect(burst).toHaveAttribute('data-reduced', String(reduced))
    await expect(burst.locator('.stone-fragment')).toHaveCount(reduced ? 0 : 9)
    await expect(burst.locator('.stone-dust')).toHaveCount(reduced ? 0 : 5)
    await expect(cell(page, rock)).toHaveAccessibleName(/case vide/)
    await expect(page.getByTestId('balance')).toHaveText('✧ 22')
    expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
    const position = await burst.evaluate((element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }))
    const stage = (await page.locator('.board-stage').boundingBox())!, target = (await cell(page, rock).boundingBox())!
    expect(Math.abs(stage.x + position.x - target.x - target.width / 2)).toBeLessThan(2)
    expect(Math.abs(stage.y + position.y - target.y - target.height / 2)).toBeLessThan(2)
    const particle = reduced ? burst.locator('.stone-flash') : burst.locator('.stone-fragment').first()
    const appearance = await particle.getAttribute('style')
    await page.clock.runFor(70)
    if (reduced) expect(await particle.getAttribute('style')).toBe(appearance)
    else expect(await particle.getAttribute('style')).not.toBe(appearance)
    await page.screenshot({ path: testInfo.outputPath('stone-excavation.png'), scale: 'css' })
    await page.clock.runFor(reduced ? 150 : 600)
    await expect(burst).toHaveCount(0)
    expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
    await page.getByRole('button', { name: reduced ? 'Passer en vue épurée' : 'Passer en vue avancée' }).click()
    await page.clock.runFor(50)
    await expect(burst).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.clock.runFor(200)
    await page.reload()
    await page.clock.runFor(100)
    await expect(page.locator('.stone-burst')).toHaveCount(0)
  })
}
