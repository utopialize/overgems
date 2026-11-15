import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GameState, Gem, GemOrigin, Slot } from '../game/types'
import { validSlot } from '../game/state'

export function useGemInteractions(game: GameState, onDrop: (from: GemOrigin, to: Slot) => void,
  onRecycle: (from: Slot, gemId: string) => void) {
  const pointer = useRef<{ id: number; from: GemOrigin; x: number; y: number; gem: Gem; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [ghost, setGhost] = useState<{ gem: Gem; origin: GemOrigin; x: number; y: number; recycling: boolean; target: Slot | null } | null>(null)
  function slotAt(element: Element | null): Slot | null {
    const target = element?.closest<HTMLElement>('[data-area][data-index]')
    if (!target) return null
    const area = target?.dataset.area
    if (area !== 'board' && area !== 'inventory') return null
    const slot = { area, index: Number(target.dataset.index) } as Slot
    return validSlot(slot) ? slot : null
  }
  function end(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = pointer.current
    if (!current || event.pointerId !== current.id) return
    if (current.moved) {
      suppressClick.current = true
      window.setTimeout(() => { suppressClick.current = false }, 0)
      if (!cancelled) {
        const element = document.elementFromPoint(event.clientX, event.clientY)
        const target = slotAt(element)
        if (target) onDrop(current.from, target)
        else if (current.from.area === 'board' && element && !element.closest('.board-grid')) {
          onRecycle(current.from, current.gem.id)
        }
      }
    }
    pointer.current = null
    setGhost(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return {
    ghost, suppressClick,
    pointerHandlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary) return
        const target = (event.target as Element).closest<HTMLElement>('[data-area][data-index]')
        const index = Number(target?.dataset.index)
        const offer = target?.dataset.area === 'shop' ? game.offers[index] : null
        if (offer && game.coins < offer.price) return
        const from: GemOrigin | null = offer ? { area: 'shop', index, offerId: offer.gem.id } : slotAt(event.target as Element)
        const gem = from ? from.area === 'shop' ? offer?.gem : game[from.area][from.index] : null
        if (from && gem) pointer.current = { id: event.pointerId, from, gem, x: event.clientX, y: event.clientY, moved: false }
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = pointer.current
        if (!current || event.pointerId !== current.id) return
        if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return
        current.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        const element = document.elementFromPoint(event.clientX, event.clientY)
        const outside = Boolean(element && !element.closest('.board-grid'))
        setGhost({ gem: current.gem, origin: current.from, x: event.clientX, y: event.clientY,
          recycling: current.from.area === 'board' && outside, target: slotAt(element) })
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => end(event),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => end(event, true),
      onLostPointerCapture(event: PointerEvent<HTMLElement>) {
        // Touch starts with implicit capture on the cell. Moving capture to
        // the main element must not cancel that same drag via a bubbled event.
        if (event.target !== event.currentTarget) return
        pointer.current = null
        setGhost(null)
      },
    },
  }
}
