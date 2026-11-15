import { HARVEST_VALUES } from '../game/catalog'
import type { Gem } from '../game/types'

/** Visual progression only: copper to champagne, amethyst to pale lavender. */
export function gemPalette(gem: Gem) {
  const progress = gem.level / (HARVEST_VALUES.length - 1)
  const warm = gem.kind === 'harvest'
  const hue = warm ? 26 + progress * 17 : 266 + progress * 23
  const saturation = warm ? 52 + progress * 7 : 26 + progress * 6
  const color = (lightness: number) =>
    `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`

  return {
    main: color(65 + progress * 16),
    light: color(81 + progress * 13),
    mid: color((warm ? 59 : 60) + progress * 16),
    dark: color((warm ? 53 : 57) + progress * (warm ? 16 : 13)),
  }
}
