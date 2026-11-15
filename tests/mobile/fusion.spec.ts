import { expect, test } from '@playwright/test'
import { gemPrice } from '../../src/game/catalog.ts'
import { createInitialGame } from '../../src/game/state.ts'
import type { Gem } from '../../src/game/types.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

for (const kind of ['harvest', 'multiplier'] as const) {
  test('progression linéaire de ' + kind + ' : plateau, achat avec fusion, plafond et sauvegarde', async ({ page }) => {
    const makeGem = (id: number, level: number): Gem => kind === 'harvest'
      ? { id: 'gem-' + id, kind, level } : { id: 'gem-' + id, kind, level, setting: 'EW' }
    const game = createInitialGame()
    game.stones.fill(false)
    game.settings.paused = true
    game.coins = 1000
    game.board[0] = makeGem(1, 2)
    game.board[1] = makeGem(2, 2)
    game.board[2] = makeGem(3, 10)
    game.board[3] = makeGem(4, 10)
    game.board[4] = makeGem(5, 11)
    const offer = makeGem(8, 3)
    game.offers[0] = { item: offer, price: gemPrice(offer) }
    await page.addInitScript((state) => {
      if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state))
    }, game)
    await page.goto('/')
    const cell = (index: number) => page.locator(`[data-area=board][data-index="${index}"]`)
    const value = (index: number) => cell(index).locator('.gem-value')
    await expect(value(0)).toHaveText(kind === 'harvest' ? '+3' : '×1,3')
    await cell(0).click()
    await cell(1).click()
    await expect(value(1)).toHaveText(kind === 'harvest' ? '+4' : '×1,4')
    await expect(cell(0)).toHaveAccessibleName(/case vide/)

    await cell(2).click()
    await cell(3).click()
    await expect(value(3)).toHaveText(kind === 'harvest' ? '+12' : '×2,2')
    await cell(4).click()
    await cell(3).click()
    await expect(page.getByRole('status')).toContainText('Fusion impossible')
    await expect(value(4)).toHaveText(kind === 'harvest' ? '+12' : '×2,2')
    await expect(value(3)).toHaveText(kind === 'harvest' ? '+12' : '×2,2')

    await page.getByTestId('offer-0').click()
    await cell(1).click()
    await expect(value(1)).toHaveText(kind === 'harvest' ? '+5' : '×1,5')
    await expect(page.getByTestId('balance')).toHaveText('✧ ' + (1000 - gemPrice(offer)))
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!).board[1]?.level)).toBe(4)
    await page.reload()
    await expect(value(1)).toHaveText(kind === 'harvest' ? '+5' : '×1,5')
    await expect(value(3)).toHaveText(kind === 'harvest' ? '+12' : '×2,2')
    await expect(value(4)).toHaveText(kind === 'harvest' ? '+12' : '×2,2')
  })
}
