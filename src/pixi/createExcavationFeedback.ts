import type { ExcavationFeedback } from '../game/runtime'

const BURST_MS = 700
const STILL_MS = 250
const FRAGMENTS = 9
const DUST = 5

/** Cosmetic replay of committed excavations, driven exclusively by the Pixi ticker. */
export function createExcavationFeedback(stage: HTMLElement) {
  const layer = document.createElement('div')
  layer.className = 'excavation-feedback'
  layer.setAttribute('aria-hidden', 'true')
  stage.appendChild(layer)
  const bursts = new Map<number, HTMLSpanElement>()
  return {
    draw(effects: readonly ExcavationFeedback[], now: number, reduced: boolean, offset: number, width: number, height: number) {
      const active = new Set<number>()
      const size = Math.min(width, height)
      for (const effect of effects) {
        const elapsed = now - effect.at
        const duration = reduced ? STILL_MS : BURST_MS
        if (elapsed < 0 || elapsed >= duration) continue
        active.add(effect.id)
        let burst = bursts.get(effect.id)
        if (!burst) {
          burst = document.createElement('span')
          burst.className = 'stone-burst'
          burst.dataset.cell = String(effect.index)
          const flash = document.createElement('span')
          flash.className = 'stone-flash'
          burst.appendChild(flash)
          bursts.set(effect.id, burst)
          layer.appendChild(burst)
        }
        burst.dataset.reduced = String(reduced)
        // Switching the animation preference also removes already moving debris.
        if (reduced) while (burst.children.length > 1) burst.lastElementChild!.remove()
        else if (burst.children.length === 1) {
          for (let i = 0; i < DUST + FRAGMENTS; i++) {
            const particle = document.createElement('i')
            particle.className = i < DUST ? 'stone-dust' : 'stone-fragment'
            burst.appendChild(particle)
          }
        }
        burst.style.left = offset + (effect.index % 7 + 0.5) * width + 'px'
        burst.style.top = (Math.floor(effect.index / 7) + 0.5) * height + 'px'
        const t = elapsed / duration
        const flash = burst.firstElementChild as HTMLElement
        const radius = size * (reduced ? 0.38 : 0.22 + Math.min(1, t * 2) * 0.36)
        flash.style.width = radius * 2 + 'px'
        flash.style.height = radius * 2 + 'px'
        flash.style.opacity = String(reduced ? 0.65 : Math.max(0, 1 - t * 2.5))
        if (reduced) continue
        Array.from(burst.children).slice(1).forEach((node, i) => {
          const particle = node as HTMLElement
          const dust = i < DUST
          const n = dust ? i : i - DUST
          const angle = n * Math.PI * 2 / (dust ? DUST : FRAGMENTS) + effect.index * 0.7
          const outward = 1 - (1 - t) ** 3
          const distance = size * (0.08 + outward * (dust ? 0.35 : 0.38 + n % 3 * 0.12))
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance + (dust ? -t * size * 0.12 : t * t * size * 0.35)
          const diameter = size * (dust ? 0.25 + t * 0.45 : 0.08 + n % 3 * 0.025)
          particle.style.width = diameter + 'px'
          particle.style.height = diameter + 'px'
          particle.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${dust ? 0 : n * 47 + t * (n % 2 ? 170 : -170)}deg)`
          particle.style.opacity = String((dust ? 0.45 : 1) * (1 - t) ** (dust ? 1 : 0.65))
        })
      }
      for (const [id, burst] of bursts) if (!active.has(id)) { burst.remove(); bursts.delete(id) }
    },
    destroy() { bursts.clear(); layer.remove() },
  }
}
