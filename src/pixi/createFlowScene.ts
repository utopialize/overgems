import { Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import { RULES, numberLabel } from '../game/catalog'
import type { ActiveEmission } from '../game/runtime'
import type { Point, FlowEvent } from '../game/types'
import { PULSE_VISUALS, powerLabel } from './pulseVisuals'

export type FlowSnapshot = { emissions: ActiveEmission[]; reducedMotion: boolean; advanced: boolean; offset: number }
type IndexedEvent = { event: FlowEvent; index: number }
type Timeline = { indexed: number; steps: Map<number, IndexedEvent[]> }

/** Replay live engine state. No gain, collision or routing calculation lives in the renderer. */
export function createFlowScene(app: Application, snapshot: { current: FlowSnapshot }, host: HTMLElement): () => void {
  const light = new Graphics()
  app.stage.addChild(light)
  const layer = document.createElement('div')
  layer.className = 'flow-feedback'
  layer.setAttribute('aria-hidden', 'true')
  host.parentElement!.appendChild(layer)
  const orbLayer = document.createElement('div')
  orbLayer.className = 'pulse-labels'
  orbLayer.setAttribute('aria-hidden', 'true')
  host.appendChild(orbLayer)
  const labels = new Map<string, HTMLSpanElement>()
  const orbs = new Map<string, HTMLSpanElement>()
  const impacts = new Map<string, HTMLSpanElement>()
  const timelines = new Map<number, Timeline>()
  const cells = Array.from(host.parentElement!.querySelectorAll<HTMLElement>('.board-cell'))
  let glowing = new Map<number, number>()

  const draw = () => {
    light.clear()
    const { emissions, reducedMotion, advanced, offset } = snapshot.current
    const cellWidth = (app.screen.width - offset) / 7
    const cellHeight = app.screen.height / 9
    const point = (p: Point, source = false) => ({ x: source ? offset / 2 : offset + (p.x + 0.5) * cellWidth, y: (p.y + 0.5) * cellHeight })
    const now = performance.now()
    const activeLabels = new Set<string>(), activeOrbs = new Set<string>()
    const activeImpacts = new Set<string>()
    const nextGlowing = new Map<number, number>()
    let drawn = 0, feedbackCount = 0
    const activeEmissions = new Set(emissions.map((emission) => emission.id))
    for (const id of timelines.keys()) if (!activeEmissions.has(id)) timelines.delete(id)

    for (const emission of emissions) {
      const age = (now - emission.start) / RULES.stepMs
      // Frontier remains present until arrival has actually been resolved. This
      // also avoids a visual blink between animation frames and simulation ticks.
      for (const pulse of emission.frontier) {
        if (drawn >= 120) break
        const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, age - pulse.step))
        const from = point(pulse.from, pulse.step === 0), to = point(pulse.position)
        const text = advanced ? powerLabel(pulse.energy) : ''
        const radius = advanced ? PULSE_VISUALS.radius : 3
        const x = from.x + (to.x - from.x) * progress
        const y = from.y + (to.y - from.y) * progress
        if (!reducedMotion) {
          light.moveTo(from.x + (to.x - from.x) * Math.max(0, progress - 0.25), from.y + (to.y - from.y) * Math.max(0, progress - 0.25))
            .lineTo(x, y).stroke({ width: 2.5, color: 0xe9b47d, alpha: 0.65 })
        }
        if (advanced) {
          light.circle(x, y, radius * 1.7).fill({ color: 0xe9b47d, alpha: 0.1 })
            .circle(x, y, radius).fill({ color: 0xf4d6ae, alpha: 0.98 })
            .circle(x, y, radius * 0.92).fill({ color: 0x6a4731, alpha: 0.98 })
            .circle(x - radius * 0.42, y - radius * 0.46, radius * 0.12).fill({ color: 0xffffff, alpha: 0.7 })
        } else {
          light.circle(x, y, 10).fill({ color: 0xe9b47d, alpha: 0.12 })
            .circle(x, y, 6).fill({ color: 0xe9b47d, alpha: 0.3 })
            .circle(x, y, radius).fill({ color: 0xf4d6ae, alpha: 0.98 })
            .circle(x, y, 1.25).fill({ color: 0xffffff, alpha: 0.95 })
        }
        const key = emission.id + ':' + pulse.branch
        activeOrbs.add(key)
        let orb = orbs.get(key)
        if (!orb) {
          orb = document.createElement('span')
          orb.className = 'pulse-orb'
          orb.dataset.emission = String(emission.id)
          orb.dataset.branch = String(pulse.branch)
          orbs.set(key, orb)
          orb.style.width = radius * 2 + 'px'; orb.style.height = radius * 2 + 'px'
          orbLayer.appendChild(orb)
        }
        orb.textContent = advanced ? text : ''
        orb.dataset.appearance = advanced ? 'bubble' : 'spark'
        orb.style.width = radius * 2 + 'px'; orb.style.height = radius * 2 + 'px'
        orb.dataset.energy = String(pulse.energy)
        orb.style.left = x + 'px'; orb.style.top = y + 'px'
        orb.style.fontSize = Math.min(9, (radius * 2 - 2) / Math.max(1, text.length * 0.6)) + 'px'
        drawn++
      }

      let timeline = timelines.get(emission.id)
      if (!timeline) { timeline = { indexed: 0, steps: new Map() }; timelines.set(emission.id, timeline) }
      // Live emissions append events at each arrival. Index only the additions.
      for (let index = timeline.indexed; index < emission.result.events.length; index++) {
        const event = emission.result.events[index]!
        const bucket = timeline.steps.get(event.step) ?? []
        bucket.push({ event, index }); timeline.steps.set(event.step, bucket)
      }
      timeline.indexed = emission.result.events.length
      const firstStep = Math.max(0, Math.floor(age - 1 - RULES.feedbackMs / RULES.stepMs))
      for (let step = firstStep; step <= Math.floor(age); step++) {
        for (const { event, index } of timeline.steps.get(step) ?? []) {
          if (event.type === 'end' && (event.reason === 'edge' || event.reason === 'connection') && !reducedMotion) {
            const elapsed = now - emission.start - (event.atStep ?? event.step + 1) * RULES.stepMs
            if (elapsed < 0 || elapsed >= PULSE_VISUALS.burstMs || activeImpacts.size >= 40) continue
            const key = emission.id + ':' + index
            activeImpacts.add(key)
            let impact = impacts.get(key)
            if (!impact) {
              impact = document.createElement('span')
              impact.className = 'pulse-impact'
              impact.dataset.reason = event.reason
              impact.dataset.emission = String(emission.id)
              impact.dataset.branch = String(event.branch)
              for (let i = 0; i < PULSE_VISUALS.particleCount; i++) impact.appendChild(document.createElement('i'))
              impacts.set(key, impact); layer.appendChild(impact)
            }
            const from = point(event.from, event.step === 0), to = point(event.to)
            const contact = event.progress ?? 1
            impact.style.left = from.x + (to.x - from.x) * contact + 'px'
            impact.style.top = from.y + (to.y - from.y) * contact + 'px'
            const t = elapsed / PULSE_VISUALS.burstMs
            Array.from(impact.children).forEach((particle, i) => {
              const angle = i * Math.PI * 2 / PULSE_VISUALS.particleCount + event.branch * 0.5
              const distance = 1.5 + t * (5 + i % 2 * 2)
              const style = (particle as HTMLElement).style
              style.transform = 'translate(' + Math.cos(angle) * distance + 'px,' + Math.sin(angle) * distance + 'px)'
              style.opacity = String((1 - t) * 0.7)
            })
            continue
          }
          if (event.type !== 'harvest' && event.type !== 'multiply') continue
          const feedbackAge = now - emission.start - (event.step + 1) * RULES.stepMs
          if (feedbackAge < 0 || feedbackAge >= RULES.feedbackMs || feedbackCount >= 40) continue
          feedbackCount++
          const t = feedbackAge / RULES.feedbackMs
          const cellIndex = event.to.y * 7 + event.to.x
          const intensity = reducedMotion ? 0.35 : (1 - t) ** 2
          nextGlowing.set(cellIndex, Math.max(nextGlowing.get(cellIndex) ?? 0, intensity))
          const p = point(event.to)
          if (!reducedMotion && drawn < 120) {
            light.circle(p.x, p.y, Math.min(cellWidth, cellHeight) * (0.27 + t * 0.24))
              .stroke({ width: 2, color: event.type === 'harvest' ? 0xf4d6ae : 0xd2bddc, alpha: (1 - t) * 0.9 })
            drawn++
          }
          if (!advanced) continue
          const key = emission.id + ':' + index
          activeLabels.add(key)
          let label = labels.get(key)
          if (!label) {
            label = document.createElement('span')
            label.className = 'flow-number ' + event.type
            label.dataset.effect = event.type; label.dataset.cell = String(cellIndex)
            label.textContent = event.type === 'harvest' ? '+' + numberLabel(event.gain ?? 0) : '×' + numberLabel(event.factor ?? 1)
            labels.set(key, label); layer.appendChild(label)
          }
          label.style.left = Math.max(18, Math.min(app.screen.width - 18, p.x)) + 'px'
          label.style.top = Math.max(10, p.y - cellHeight * 0.35 - (reducedMotion ? 0 : t * cellHeight * 0.5)) + 'px'
          label.style.opacity = String(reducedMotion ? 1 : 1 - t * t)
          label.style.fontSize = Math.max(11, Math.min(16, cellWidth * 0.38)) + 'px'
        }
      }
    }
    for (const [index] of glowing) if (!nextGlowing.has(index)) cells[index]?.style.removeProperty('--flow-intensity')
    for (const [index, value] of nextGlowing) cells[index]?.style.setProperty('--flow-intensity', String(value))
    glowing = nextGlowing
    for (const [key, label] of labels) if (!activeLabels.has(key)) { label.remove(); labels.delete(key) }
    for (const [key, orb] of orbs) if (!activeOrbs.has(key)) { orb.remove(); orbs.delete(key) }
    for (const [key, impact] of impacts) if (!activeImpacts.has(key)) { impact.remove(); impacts.delete(key) }
  }
  app.ticker.add(draw)
  return () => {
    app.ticker.remove(draw)
    for (const [index] of glowing) cells[index]?.style.removeProperty('--flow-intensity')
    labels.clear(); orbs.clear(); impacts.clear(); timelines.clear(); layer.remove(); orbLayer.remove(); light.destroy()
  }
}
