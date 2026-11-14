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
      && canvas.width > 0
      && canvas.height > 0
      && canvas.width <= Math.ceil(host.clientWidth * 2)
  })).toBe(true)
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth,
  )).toBe(true)

  for (const selector of ['.workspace-header', 'h1', '.badge', '.scene', 'footer']) {
    const bounds = await page.locator(selector).boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  }
}

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 })

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]) {
  test(`layout ${viewport.width} × ${viewport.height}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expectFittedCanvas(page)
    await expectNoHorizontalOverflow(page)
    await expect(page.locator('canvas')).toHaveCSS('touch-action', 'manipulation')
    await page.locator('footer').scrollIntoViewIfNeeded()
    await expect(page.locator('footer')).toBeInViewport()
    expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('layout.png'), fullPage: true, scale: 'css' })
  })
}

test('canvas follows rotation and changes to its container', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expectFittedCanvas(page)
  await page.setViewportSize({ width: 844, height: 390 })
  await expectFittedCanvas(page)
  await expectNoHorizontalOverflow(page)

  // Resize the container without a window resize event.
  await page.locator('.scene').evaluate((scene) => {
    scene.style.width = '70%'
    scene.style.height = '220px'
  })
  await expectFittedCanvas(page)
})

test('text enlarged to 200% stays readable without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await expectFittedCanvas(page)
  await expectNoHorizontalOverflow(page)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.locator('footer')).toBeInViewport()
})

test('reduced motion keeps the rendered scene still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expectFittedCanvas(page)
  const canvas = page.locator('canvas')
  const firstFrame = await canvas.screenshot()
  // Compare rendered output after several animation frames.
  await page.evaluate(() => new Promise<void>((resolve) => {
    let frames = 0
    const next = () => {
      if (++frames >= 12) resolve()
      else requestAnimationFrame(next)
    }
    requestAnimationFrame(next)
  }))
  expect(await canvas.screenshot()).toEqual(firstFrame)
})
