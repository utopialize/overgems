import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import { discoverMineral } from '../../src/game/terrain.ts'
import { rollExcavationReward } from '../../src/game/rewards.ts'
import type { GameState } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const slot = (page: Page, area: string, index: number) => page.locator(`[data-area="${area}"][data-index="${index}"]`)
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
function fixture() { const game = createInitialGame(); game.settings.paused = true; return game }
async function seed(page: Page, game: GameState) {
  await page.addInitScript((state) => { if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
}
function withReward(game: GameState) {
  for (let seed = 0; seed < 10000; seed++) {
    game.excavationSeed = seed
    if (rollExcavationReward(discoverMineral(game).seed, game.nextId).gem?.rarity === 'rare') return game
  }
  throw new Error('Missing rare reward seed')
}

test('achat puis aller-retour entre le douzième emplacement et le plateau, sans déplacement de grille', async ({ page }) => {
  await seed(page, fixture())
  const board = await page.locator('.board-grid').boundingBox()
  await page.getByTestId('offer-0').tap()
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await page.getByRole('button', { name: 'Afficher les emplacements 7 à 12' }).tap()
  await slot(page, 'inventory', 11).tap()
  await expect(slot(page, 'inventory', 11)).toHaveAccessibleName(/Récolte \+1/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
  await slot(page, 'inventory', 11).tap()
  await slot(page, 'board', 28).tap()
  await expect(slot(page, 'inventory', 11)).toHaveAccessibleName(/emplacement vide/)
  await slot(page, 'board', 28).tap()
  await slot(page, 'inventory', 11).tap()
  expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
  await expect.poll(async () => (await saved(page)).inventory[11]?.id).toBe('gem-8')
  await page.reload()
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await page.getByRole('button', { name: 'Afficher les emplacements 7 à 12' }).tap()
  await expect(slot(page, 'inventory', 11)).toHaveAccessibleName(/Récolte \+1/)
})

test('fusion tactile plateau vers inventaire, annulation et retour sans perte', async ({ page }) => {
  const game = fixture()
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0, invested: 6 }
  game.inventory[0] = { id: 'gem-2', kind: 'harvest', level: 0, invested: 6 }
  await seed(page, game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  const client = await page.context().newCDPSession(page)
  async function drag(area: string, index: number, targetArea: string, targetIndex: number, cancel = false) {
    const from = (await slot(page, area, index).boundingBox())!, to = (await slot(page, targetArea, targetIndex).boundingBox())!
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
    await client.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
  }
  await drag('board', 28, 'inventory', 0, true)
  expect(await saved(page)).toEqual(game)
  await drag('board', 28, 'inventory', 0)
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Récolte \+2/)
  await expect(slot(page, 'board', 28)).toHaveAccessibleName(/case vide/)
  await drag('inventory', 0, 'board', 29)
  await expect(slot(page, 'board', 29)).toHaveAccessibleName(/Récolte \+2/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  expect((await saved(page)).coins).toBe(30)
})

test('en vue avancée, l’inspection permet de choisir une destination d’inventaire au clavier', async ({ page }) => {
  const game = fixture(); game.settings.viewMode = 'advanced'
  await seed(page, game)
  await page.getByTestId('offer-0').focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Choisir une destination dans l’inventaire' }).click()
  await slot(page, 'inventory', 0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('placement-preview')).toContainText('Δ 0')
  await page.keyboard.press('Enter')
  await expect(slot(page, 'inventory', 1)).toHaveAccessibleName(/Récolte/)
})

test('un survol prolongé de l’onglet pendant un glisser ouvre l’inventaire sans paiement anticipé', async ({ page }) => {
  await seed(page, fixture())
  const from = (await page.getByTestId('offer-0').boundingBox())!
  const tab = (await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2, { steps: 4 })
  await expect(slot(page, 'inventory', 0)).toBeVisible()
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  const to = (await slot(page, 'inventory', 0).boundingBox())!
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/Récolte/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
})

test('récompense rare stockée et conservée au rechargement, inventaire plein sans débit ni perte', async ({ page }) => {
  const game = withReward(fixture()), rock = game.stones.findIndex(Boolean)
  game.nextId = 100
  game.offers[0] = { item: { id: 'tool-8', kind: 'pickaxe' }, price: 8 }
  game.inventory = game.inventory.map((_, index) => ({ id: 'gem-' + (20 + index), kind: 'harvest', level: 0 }))
  await seed(page, game)
  await page.getByTestId('offer-0').tap(); await slot(page, 'board', rock).tap()
  await expect(page.getByTestId('game-notice')).toContainText('Inventaire plein')
  expect(await saved(page)).toEqual(game)
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await page.getByRole('button', { name: 'Annuler la sélection' }).tap()
  await slot(page, 'inventory', 0).tap(); await slot(page, 'board', 28).tap()
  await page.getByRole('button', { name: 'Afficher la boutique', exact: true }).tap()
  await page.getByTestId('offer-0').tap(); await slot(page, 'board', rock).tap()
  await expect(page.getByTestId('discovery-toast')).toContainText('rare · Inventaire')
  await page.locator('.discovery-open').tap()
  await expect(slot(page, 'inventory', 0).locator('.gem-view')).toHaveAttribute('data-rarity', 'rare')
  await expect.poll(async () => (await saved(page)).inventory[0]?.rarity).toBe('rare')
  await page.reload()
  await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
  await expect(slot(page, 'inventory', 0)).toHaveAccessibleName(/rare/)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 844, height: 390 }]) {
  test('inventaire tactile sans scroll : ' + viewport.width + ' × ' + viewport.height, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await seed(page, fixture())
    const board = await page.locator('.board-grid').boundingBox()
    await page.getByRole('button', { name: 'Afficher l’inventaire', exact: true }).tap()
    for (let i = 0; i < 2; i++) {
      await expect(page.locator('[data-area=inventory]')).toHaveCount(6)
      for (const cell of await page.locator('[data-area=inventory]').all()) {
        const box = (await cell.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      }
      await page.locator('.inventory-page').tap()
    }
    expect(await page.locator('.board-grid').boundingBox()).toEqual(board)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('inventory.png'), scale: 'css' })
  })
}
