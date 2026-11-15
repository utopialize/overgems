import { HARVEST_VALUES } from '../game/catalog'
import type { Gem } from '../game/types'

/** Wider hue/lightness ranges make each level visible even on a small crystal. */
export function gemPalette(gem: Gem) {
  const progress = gem.level / (HARVEST_VALUES.length - 1)
  const warm = gem.kind !== 'multiplier'
  const hue = warm ? 12 + progress * 42 : 246 + progress * 60
  const richness = Math.sin(progress * Math.PI)
  const saturation = warm ? 70 + richness * 10 : 56 + richness * 12
  const color = (lightness: number) =>
    `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`

  return {
    main: color(warm ? 61 + progress * 24 : 68 + progress * 18),
    light: color(warm ? 79 + progress * 16 : 84 + progress * 12),
    mid: color(warm ? 58 + progress * 22 : 66 + progress * 17),
    dark: color(warm ? 55 + progress * 18 : 64.5 + progress * 15),
  }
}
