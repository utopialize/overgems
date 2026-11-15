import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'
import { HARVEST_VALUES } from '../../src/game/catalog.ts'

test.use({ isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator(`[data-area=board][data-index="${index}"]`)
async function palette(gem: Locator) {
  return gem.evaluate((element) => ['main', 'light', 'mid', 'dark'].map((facet) =>
    getComputedStyle(element.querySelector(`path[fill="var(--gem-${facet})"]`)!).fill))
}

for (const viewport of [{ width: 390, height: 844 }, { width: 568, height: 320 }]) {
  test('les 24 palettes restent distinctes et lisibles à ' + viewport.width + ' × ' + viewport.height, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const game = createInitialGame()
    game.settings.paused = true
    game.nextId = 200
    for (let level = 0; level < HARVEST_VALUES.length; level++) {
      game.board[level] = { id: `gem-${100 + level}`, kind: 'harvest', level }
      game.board[21 + level] = { id: `gem-${121 + level}`, kind: 'multiplier', level, setting: 'ESW' }
    }
    await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), game)
    await page.goto('/')
    await expect(page.locator('.board-cell .gem-view')).toHaveCount(24)

    const colors = await page.locator('.board-cell .gem-view').evaluateAll((gems) => {
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
          const channel = Number(value) / 255
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      }
      return gems.map((gem) => {
        const ink = luminance(getComputedStyle(gem.querySelector('.gem-value')!).color)
        const facets = ['main', 'light', 'mid', 'dark'].map((facet) =>
          getComputedStyle(gem.querySelector(`path[fill="var(--gem-${facet})"]`)!).fill)
        return { facets, mainLuminance: luminance(facets[0]!),
          contrast: Math.min(...facets.map((color) => (luminance(color) + 0.05) / (ink + 0.05))) }
      })
    })
    expect(new Set(colors.map(({ facets }) => facets.join('|'))).size).toBe(24)
    for (const color of colors) expect(color.contrast).toBeGreaterThanOrEqual(4.5)
    for (const family of [colors.slice(0, 12), colors.slice(12)]) {
      for (let level = 1; level < family.length; level++) {
        expect(family[level]!.mainLuminance).toBeGreaterThan(family[level - 1]!.mainLuminance)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1
      && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('gem-level-palettes.png'), scale: 'css' })
  })
}

test('la palette suit une gemme de la boutique au glisser, puis évolue à la fusion et reste après rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const game = createInitialGame()
  game.settings.paused = true
  await page.addInitScript((state) => {
    if (!localStorage.getItem('overgems.save.v1')) localStorage.setItem('overgems.save.v1', JSON.stringify(state))
  }, game)
  await page.goto('/')
  const offer = page.getByTestId('offer-0')
  const original = await palette(offer.locator('.gem-view'))
  const start = (await offer.boundingBox())!
  const target = (await cell(page, 28).boundingBox())!
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await expect(page.locator('.drag-ghost')).toBeVisible()
  expect(await palette(page.locator('.drag-ghost .gem-view'))).toEqual(original)
  await page.mouse.up()
  expect(await palette(cell(page, 28).locator('.gem-view'))).toEqual(original)

  await page.getByTestId('offer-2').click()
  await cell(page, 28).click()
  const merged = cell(page, 28).locator('.gem-view')
  await expect(merged).toHaveAttribute('data-level', '2')
  const upgraded = await palette(merged)
  expect(upgraded).not.toEqual(original)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('overgems.save.v1')!).board[28]?.level)).toBe(1)
  await page.reload()
  await expect(merged).toHaveAttribute('data-level', '2')
  expect(await palette(merged)).toEqual(upgraded)
})
