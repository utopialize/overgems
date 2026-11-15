import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function expectFittedCanvas(page: Page) {
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect.poll(() => page.locator('.pixi-canvas').evaluate((host) => {
    const canvas = host.querySelector('canvas')!
    const bounds = canvas.getBoundingClientRect()
    return Math.abs(bounds.width - host.clientWidth) <= 1
      && Math.abs(bounds.height - host.clientHeight) <= 1
      && canvas.width > 0 && canvas.height > 0
      && canvas.width <= Math.ceil(host.clientWidth * 2)
  })).toBe(true)
}
async function expectOneScreen(page: Page) {
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > innerWidth,
    vertical: document.documentElement.scrollHeight > innerHeight + 1,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: false, vertical: false, x: 0, y: 0 })
  for (const selector of ['.game-header', '.economy-bar', '.board-grid', '.workbench', '.notice', '[data-testid="offer-0"]', '[data-testid="offer-2"]']) {
    const box = (await page.locator(selector).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1)
  }
  expect(await page.locator('.board-grid').evaluate((grid) =>
    grid.scrollWidth <= grid.clientWidth + 1 && grid.scrollHeight <= grid.clientHeight + 1,
  )).toBe(true)
}

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
for (const viewport of [
  { width: 320, height: 568 }, { width: 360, height: 640 },
  { width: 390, height: 664 }, { width: 390, height: 844 },
  { width: 412, height: 915 }, { width: 568, height: 320 },
  { width: 844, height: 390 }, { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]) {
  test('un écran ' + viewport.width + ' × ' + viewport.height, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expectFittedCanvas(page)
    await expectOneScreen(page)
    await expect(page.locator('[data-area=board]')).toHaveCount(63)
    await expect(page.locator('[data-area=inventory]')).toHaveCount(0)
    await expect(page.locator('.board-cell.occupied')).toHaveCount(0)
    await page.mouse.wheel(0, 800)
    await expectOneScreen(page)
    expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('layout.png'), scale: 'css' })
  })
}
test('rotation, barres du navigateur et conteneur redimensionné sans scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expectFittedCanvas(page)
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 640 }]) {
    await page.setViewportSize(viewport)
    await expectFittedCanvas(page)
    await expectOneScreen(page)
  }
  // Simulate extra device insets without a window resize.
  await page.locator('main').evaluate((main) => { main.style.paddingBlock = '47px 34px' })
  await expectFittedCanvas(page)
  await expectOneScreen(page)
})
test('aide et paramètres accessibles sans défilement en paysage', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comment jouer' }).click()
  const help = page.getByRole('dialog')
  await expect(help).toBeVisible()
  for (let step = 0; step < 7; step++) {
    expect(await help.evaluate((dialog) => dialog.scrollHeight <= dialog.clientHeight + 1)).toBe(true)
    if (step < 6) await page.getByRole('button', { name: 'Suivant' }).click()
  }
  await page.getByRole('button', { name: 'Fermer l’aide' }).click()
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()
  expect(await page.getByRole('dialog').evaluate((dialog) => dialog.scrollHeight <= dialog.clientHeight + 1)).toBe(true)
})
test('le zoom navigateur reste autorisé', async ({ page }) => {
  await page.goto('/')
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content')
  expect(viewport).toContain('width=device-width')
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/)
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'manipulation')
})
