import { expect, test } from '@playwright/test'
import { createInitialGame } from '../../src/game/state.ts'

test('la prévision limitée affiche sa cause et les diagnostics de développement restent hors de l’UI', async ({ page }) => {
  const game = createInitialGame(); game.stones.fill(false)
  game.settings = { ...game.settings, paused: true, viewMode: 'advanced' }; game.nextId = 200
  for (let y = 3; y < 6; y++) for (let x = 0; x < 3; x++) {
    const index = y * 7 + x
    game.board[index] = { id: 'gem-' + (100 + index), kind: 'multiplier', level: 0, setting: 'NESW' }
  }
  await page.addInitScript((state) => localStorage.setItem('overgems.save.v1', JSON.stringify(state)), game)
  await page.goto('/')
  await expect(page.getByTestId('theoretical-rate')).toContainText('≥')
  await page.getByRole('button', { name: 'Détails du rendement théorique' }).click()
  await expect(page.getByRole('dialog', { name: 'Rendement théorique' })).toContainText('budget d’événements atteint')
  const profile = await page.evaluate(() => (window as Window & { overgemsDiagnostics?: () => unknown }).overgemsDiagnostics?.()) as { causes: string[]; branches: number; events: number }
  expect(profile.causes).toEqual(['events'])
  expect(profile.branches).toBeGreaterThan(1000)
  expect(profile.events).toBeLessThanOrEqual(4096)
  await expect(page.getByRole('alert')).toHaveCount(0) // A theoretical warning is not a real emission.
})
