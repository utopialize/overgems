import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator('[data-area=board][data-index="' + index + '"]')
async function pause(page: Page) {
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  await page.getByRole('checkbox', { name: /Mettre le circuit en pause/ }).check()
  await page.getByRole('button', { name: 'Fermer les paramètres' }).click()
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
}
async function dragMouse(page: Page, fromSelector: string, toSelector: string) {
  const from = (await page.locator(fromSelector).boundingBox())!
  const to = (await page.locator(toSelector).boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
}

test('grille vide, réserve invisible et choix dans la boutique sans paiement anticipé', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /réserve/i })).toHaveCount(0)
  await page.getByTestId('offer-0').click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  await expect(page.getByTestId('offer-0')).toHaveAttribute('aria-pressed', 'true')
})

test('achat à la pose, fusion directe depuis la boutique et sauvegarde', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await page.getByTestId('offer-0').click()
  await cell(page, 28).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await page.getByTestId('offer-2').click()
  await cell(page, 28).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+2/)
  await expect(page.getByRole('status')).toContainText('Achat et fusion réussis')
  await expect.poll(async () => (await saved(page)).board[28]?.level).toBe(1)
  expect((await saved(page)).coins).toBe(18)
  expect((await saved(page)).inventory.every((gem: unknown) => gem === null)).toBe(true)
  await page.reload()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+2/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 18')
})

test('achat refusé sur une gemme incompatible, sans perte ni paiement', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await page.getByTestId('offer-1').click()
  await cell(page, 28).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Amplification ×1,1/)
  await page.getByTestId('offer-0').click()
  await cell(page, 28).click()
  await expect(page.getByRole('status')).toContainText('Case occupée')
  await expect(page.getByTestId('balance')).toHaveText('✧ 20')
  await expect(cell(page, 28)).toHaveAccessibleName(/Amplification ×1,1/)
})

test('glisser depuis la boutique à la souris achète sur la case visée', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await dragMouse(page, '[data-testid=offer-0]', '[data-area=board][data-index="28"]')
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
})

test('glisser tactile : dépôt annulé sans paiement, puis achat valide', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  const from = (await page.getByTestId('offer-0').boundingBox())!
  const to = (await cell(page, 28).boundingBox())!
  const client = await page.context().newCDPSession(page)
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 2, y: 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
})

test('fusion par glisser entre deux gemmes déjà achetées', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await page.getByTestId('offer-0').click(); await cell(page, 28).click()
  await page.getByTestId('offer-2').click(); await cell(page, 29).click()
  await dragMouse(page, '[data-area=board][data-index="28"]', '[data-area=board][data-index="29"]')
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
  await expect(cell(page, 29)).toHaveAccessibleName(/Récolte \+2/)
})

test('achat et déplacement au clavier, sans scroll', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await page.getByTestId('offer-0').focus()
  await page.keyboard.press('Enter')
  await cell(page, 28).focus()
  await page.keyboard.press('Enter')
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowUp')
  await expect(cell(page, 21)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(cell(page, 21)).toHaveAccessibleName(/Récolte \+1/)
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('à 5 secondes, brillance et valeurs flottantes correspondent au vrai flux', async ({ page }, testInfo) => {
  const game = createInitialGame()
  game.board[28] = { id: 'gem-1', kind: 'multiplier', level: 3, setting: 'EW' }
  game.board[29] = { id: 'gem-2', kind: 'harvest', level: 3 }
  await page.addInitScript((state) => { localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('.flow-number.multiply')).toHaveText('×1,5', { timeout: 8000 })
  await expect(page.locator('.flow-number.harvest')).toHaveText('+7,5')
  expect(Number(await cell(page, 29).evaluate((gem) => gem.style.getPropertyValue('--flow-intensity')))).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('flow-feedback.png'), scale: 'css' })
  await expect(page.getByTestId('last-gain')).toHaveText('+7,5', { timeout: 9000 })
  await expect(page.locator('.flow-number')).toHaveCount(0)
})

test('recommencer exige une confirmation et remet une grille vide', async ({ page }) => {
  await page.goto('/')
  await pause(page)
  await page.getByTestId('offer-0').click(); await cell(page, 28).click()
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  await page.getByRole('button', { name: 'Recommencer une partie…' }).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await page.getByRole('button', { name: 'Effacer et recommencer' }).click()
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await expect(page.getByTestId('balance')).toHaveText('✧ 30')
})

test('en mode réduit, les gains restent visibles sans déplacement ni fondu', async ({ page }) => {
  const game = createInitialGame()
  game.board[28] = { id: 'gem-1', kind: 'harvest', level: 0 }
  game.settings.reducedMotion = true
  await page.addInitScript((state) => { localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
  await expect(page.locator('main')).toHaveClass(/reduce-motion/)
  const label = page.locator('.flow-number.harvest')
  await expect(label).toHaveText('+1', { timeout: 8000 })
  const top = await label.evaluate((element) => element.style.top)
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(label).toHaveCSS('opacity', '1')
  expect(await label.evaluate((element) => element.style.top)).toBe(top)
})

test('les réserves des anciennes sauvegardes restent conservées mais masquées', async ({ page }) => {
  const game = createInitialGame()
  game.inventory = game.inventory.map((_, index) => ({ id: 'gem-' + (11 + index), kind: 'harvest', level: 0 }))
  game.nextId = 30
  game.settings.paused = true
  await page.addInitScript((state) => { localStorage.setItem('overgems.save.v1', JSON.stringify(state)) }, game)
  await page.goto('/')
  await expect(page.locator('[data-area=inventory]')).toHaveCount(0)
  await page.getByTestId('offer-0').click(); await cell(page, 28).click()
  await expect.poll(async () => (await saved(page)).board[28]?.id).toBe('gem-8')
  expect((await saved(page)).inventory).toEqual(game.inventory)
})

test('sauvegarde corrompue et stockage interdit sont signalés sans bloquer le jeu', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('overgems.save.v1', '{'))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Sauvegarde invalide')
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Stockage interdit') } })
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Sauvegarde indisponible')
})
