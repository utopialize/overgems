import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const cell = (page: Page, index: number) => page.locator('[data-area=board][data-index="' + index + '"]')

async function startFrozen(page: Page) {
  await page.clock.install()
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
  await page.goto('/')
  // Let lazy loading and renderer initialization finish while advancing only
  // small clock slices, then synchronize on the first visible source pulse.
  for (let i = 0; i < 20 && await page.locator('canvas').count() === 0; i++) {
    await page.clock.runFor(50)
    await page.waitForLoadState('networkidle')
  }
  await expect(page.locator('canvas')).toHaveCount(1)
  for (let i = 0; i < 60 && await page.locator('.pulse-orb[data-emission="1"]').count() === 0; i++) {
    await page.clock.runFor(100)
  }
}

test('la boule affiche sa puissance et traverse les espaces vides sans disparaître', async ({ page }, testInfo) => {
  await startFrozen(page)
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  await expect(orb).toHaveText('1,0')
  await expect(orb).toHaveAttribute('data-energy', '1')
  const initial = (await orb.boundingBox())!
  await page.clock.runFor(2400)
  await expect(orb).toHaveText('1,0')
  const later = (await orb.boundingBox())!
  expect(later.x).toBeGreaterThan(initial.x + 30)
  await page.screenshot({ path: testInfo.outputPath('power-orb.png'), scale: 'css' })
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
})

test('placements et déplacements conservent la boule et agissent sur ses prochaines rencontres', async ({ page }, testInfo) => {
  await startFrozen(page)
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  await expect(orb).toHaveText('1,0')
  const original = (await orb.elementHandle())!

  await page.getByTestId('offer-1').click()
  await cell(page, 31).click()
  await page.getByTestId('offer-0').click()
  await cell(page, 32).click()
  expect(await original.evaluate((node) => node.isConnected)).toBe(true)
  await expect(page.getByTestId('balance')).toHaveText('✧ 14')
  await page.clock.runFor(3200)
  await expect(orb).toHaveAttribute('data-energy', '1.1')
  await expect(orb).toHaveText('1,1')

  await cell(page, 32).click()
  await cell(page, 33).click()
  expect(await original.evaluate((node) => node.isConnected)).toBe(true)
  await page.clock.runFor(800)
  await expect(page.getByTestId('balance')).toHaveText('✧ 14')
  await expect(orb).toHaveText('1,1')
  await page.clock.runFor(800)
  await expect(page.getByTestId('balance')).toHaveText('✧ 15,1')
  await expect(page.locator('.flow-number.harvest')).toHaveText('+1,1')
  await expect(orb).toHaveText('1,1')
  await page.screenshot({ path: testInfo.outputPath('live-placement.png'), scale: 'css' })
})

for (const kind of ['harvest', 'multiplier'] as const) {
  test('déplacer une même gemme ' + kind + ' devant la bulle ne répète pas son effet', async ({ page }) => {
    const game = createInitialGame()
    game.board[28] = kind === 'harvest' ? { id: 'gem-1', kind, level: 0 }
      : { id: 'gem-1', kind, level: 0, setting: 'EW' }
    await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), game)
    await startFrozen(page)
    const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
    const original = (await orb.elementHandle())!
    await page.clock.runFor(800)
    for (let x = 0; x < 2; x++) {
      await cell(page, 28 + x).click()
      await cell(page, 29 + x).click()
      await page.clock.runFor(800)
      await expect(page.getByTestId('balance')).toHaveText(kind === 'harvest' ? '✧ 31' : '✧ 30')
      await expect(orb).toHaveText(kind === 'harvest' ? '1,0' : '1,1')
      expect(await original.evaluate((node) => node.isConnected)).toBe(true)
      await expect(page.locator('.flow-number')).toHaveCount(0)
    }
  })
}

test('trois multiplicateurs ne changent ni la taille ni la vitesse, avec une décimale affichée', async ({ page }, testInfo) => {
  const game = createInitialGame()
  for (let x = 0; x < 3; x++) game.board[28 + x] = { id: 'gem-' + (x + 1), kind: 'multiplier', level: 0, setting: 'EW' }
  await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), game)
  await startFrozen(page)
  const orb = page.locator('.pulse-orb[data-emission="1"][data-branch="0"]')
  const size = (await orb.boundingBox())!
  expect(size.width).toBe(18)
  expect(size.height).toBe(18)
  await page.clock.runFor(800)
  await expect(orb).toHaveText('1,1')
  const first = (await orb.boundingBox())!
  await page.clock.runFor(400)
  const middle = (await orb.boundingBox())!
  await page.clock.runFor(400)
  await expect(orb).toHaveText('1,2')
  const second = (await orb.boundingBox())!
  expect(second.width).toBe(size.width)
  expect(second.height).toBe(size.height)
  expect(Math.abs((middle.x - first.x) - (second.x - middle.x))).toBeLessThan(2)
  await page.clock.runFor(800)
  await expect(orb).toHaveText('1,3')
  expect(Number(await orb.getAttribute('data-energy'))).toBeCloseTo(1.331, 12)
  expect((await orb.boundingBox())!.width).toBe(size.width)

  // Probe the browser's actual hit-test order at the overlap, temporarily
  // enabling pointer events on decorative layers without altering their paint order.
  await cell(page, 30).focus()
  const gemAbovePulse = await page.evaluate(() => {
    const gem = document.querySelector<HTMLElement>('[data-area=board][data-index="30"] .gem-view')!
    const host = document.querySelector<HTMLElement>('.pixi-canvas')!
    const orb = document.querySelector<HTMLElement>('.pulse-orb[data-emission="1"]')!
    const elements = [gem, host, orb]
    const previous = elements.map((element) => element.style.pointerEvents)
    elements.forEach((element) => { element.style.pointerEvents = 'auto' })
    const box = orb.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    const result = hit?.closest('.gem-view') === gem
    elements.forEach((element, index) => { element.style.pointerEvents = previous[index]! })
    return result
  })
  expect(gemAbovePulse).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('small-orb-behind-gem.png'), scale: 'css' })
})

test('un obstacle fait éclater immédiatement la bulle en six petites particules temporaires', async ({ page }, testInfo) => {
  const game = createInitialGame()
  game.board[30] = { id: 'gem-1', kind: 'multiplier', level: 0, setting: 'NS' }
  await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), game)
  await startFrozen(page)
  const burst = page.locator('.pulse-impact[data-reason=connection][data-emission="1"]')
  for (let i = 0; i < 100 && await burst.count() === 0; i++) await page.clock.runFor(25)
  await expect(burst).toHaveCount(1)
  await expect(burst.locator('i')).toHaveCount(6)
  await expect(page.locator('.pulse-orb[data-emission="1"]')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('obstacle-burst.png'), scale: 'css' })
  await page.clock.runFor(320)
  await expect(burst).toHaveCount(0)
  await expect(page.locator('.pulse-orb[data-emission="1"]')).toHaveCount(0)
})

test('au bord la première bulle éclate sans supprimer la suivante', async ({ page }, testInfo) => {
  await startFrozen(page)
  await page.clock.runFor(5500)
  const burst = page.locator('.pulse-impact[data-reason=edge][data-emission="1"]')
  for (let i = 0; i < 30 && await burst.count() === 0; i++) await page.clock.runFor(25)
  await expect(burst).toHaveCount(1)
  await expect(page.locator('.pulse-orb[data-emission="1"]')).toHaveCount(0)
  await expect(page.locator('.pulse-orb[data-emission="2"]')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('edge-burst.png'), scale: 'css' })
  await page.clock.runFor(320)
  await expect(burst).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
