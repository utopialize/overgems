import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator('[data-area=board][data-index="' + index + '"]')
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!))
}
async function startPaused(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  await page.getByRole('checkbox', { name: /Mettre le circuit en pause/ }).check()
  await page.getByRole('button', { name: 'Fermer les paramètres' }).click()
}
async function buyFirst(page: Page) {
  await page.getByTestId('offer-0').click()
  await cell(page, 28).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
}

test('la vitesse est fixe et le sélecteur de débug a été retiré', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  await expect(page.getByRole('combobox', { name: 'Mode d’affichage' })).toHaveCount(1)
  await expect(page.getByRole('dialog')).not.toContainText('Vitesse')
  await expect(page.getByRole('dialog')).not.toContainText('Débug')
})

test('le prix du renouvellement augmente et reste sauvegardé', async ({ page }) => {
  await startPaused(page)
  await page.getByRole('button', { name: 'Renouveler les offres pour 5 Éclats' }).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 25')
  await page.getByRole('button', { name: 'Renouveler les offres pour 6 Éclats' }).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 19')
  await expect.poll(async () => (await saved(page)).rerolls).toBe(2)
  await page.reload()
  await page.getByRole('button', { name: 'Renouveler les offres pour 7 Éclats' }).click()
  await expect.poll(async () => (await saved(page)).rerolls).toBe(3)
  const before = await saved(page)
  await page.getByRole('button', { name: 'Renouveler les offres pour 8 Éclats' }).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 12')
  await expect(page.getByRole('status')).toContainText('Gardez 6 Éclats')
  expect(await saved(page)).toEqual(before)
  const index = before.offers.findIndex((offer: { gem: { kind: string }; price: number }) => offer.gem.kind === 'harvest' && offer.price <= before.coins)
  expect(index).toBeGreaterThanOrEqual(0)
  await page.getByTestId('offer-' + index).click()
  await cell(page, 28).click()
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte/)
  await expect(page.getByTestId('balance')).toHaveText('✧ ' + (12 - before.offers[index].price))
})

test('sortir une gemme à la souris la recycle pour la moitié du prix payé', async ({ page }, testInfo) => {
  await startPaused(page)
  await buyFirst(page)
  const from = (await cell(page, 28).boundingBox())!
  const target = (await page.locator('.shop-heading').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await expect(page.getByTestId('recycle-target')).toContainText('♲ +3')
  await expect(page.getByTestId('recycle-target')).toHaveClass(/active/)
  await page.screenshot({ path: testInfo.outputPath('recycle-preview.png'), scale: 'css' })
  await page.mouse.up()
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 27')
  await expect(page.getByRole('status')).toBeEmpty()
  await expect.poll(async () => (await saved(page)).board[28]).toBeNull()
  expect((await saved(page)).purchases).toBe(1)
})

test('sortir une gemme au doigt rembourse sans racheter sous le doigt', async ({ page }) => {
  await startPaused(page)
  await buyFirst(page)
  const from = (await cell(page, 28).boundingBox())!
  const target = (await page.getByTestId('offer-0').boundingBox())!
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2 }] })
  await expect(page.getByTestId('recycle-target')).toHaveClass(/active/)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 27')
  await expect(page.getByTestId('offer-0')).toHaveAttribute('aria-pressed', 'false')
})

test('un geste tactile annulé hors plateau conserve la gemme et le solde', async ({ page }) => {
  await startPaused(page)
  await buyFirst(page)
  const from = (await cell(page, 28).boundingBox())!
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 2, y: 2 }] })
  await expect(page.getByTestId('recycle-target')).toBeVisible()
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await expect(page.getByTestId('recycle-target')).toHaveCount(0)
  await expect(cell(page, 28)).toHaveAccessibleName(/Récolte \+1/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 24')
})

test('le bouton de recyclage permet aussi de détruire une gemme au clavier', async ({ page }) => {
  await startPaused(page)
  await buyFirst(page)
  await cell(page, 28).focus()
  await page.keyboard.press('Enter')
  const recycle = page.getByRole('button', { name: 'Recycler la gemme sélectionnée pour 3 Éclats' })
  await recycle.focus()
  await page.keyboard.press('Enter')
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
  await expect(page.getByTestId('balance')).toHaveText('✧ 27')
})

test('palier au cinquième achat, sauvegarde et remboursement du montant réellement payé', async ({ page }) => {
  const game = createInitialGame()
  game.purchases = 4
  await page.addInitScript((state) => {
    if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state))
  }, game)
  await startPaused(page)
  await buyFirst(page)
  await expect(page.getByTestId('offer-2').locator('.offer-price')).toHaveText('7 ✧')
  await expect.poll(async () => (await saved(page)).purchases).toBe(5)
  await page.reload()
  await expect(page.getByTestId('offer-2').locator('.offer-price')).toHaveText('7 ✧')
  await page.getByTestId('offer-2').click()
  await cell(page, 28).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 17')
  await expect(page.getByTestId('offer-1').locator('.offer-price')).toHaveText('11 ✧')
  await cell(page, 28).click()
  await page.getByRole('button', { name: 'Recycler la gemme sélectionnée pour 6,5 Éclats' }).click()
  await expect(page.getByTestId('balance')).toHaveText('✧ 23,5')
  await expect(cell(page, 28)).toHaveAccessibleName(/case vide/)
})
