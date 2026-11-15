import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GameState, ShopItem, GemOrigin, Slot } from '../game/types'
import { validSlot } from '../game/state'
import { normalizeSlot } from '../game/board'

export function useGemInteractions(game: GameState, onDrop: (from: GemOrigin, to: Slot) => void,
  onRecycle: (from: Slot, gemId: string) => void, onTab: (pane: 'shop' | 'inventory') => void) {
  const pointer = useRef<{ id: number; from: GemOrigin; x: number; y: number; lastX: number; lastY: number; item: ShopItem; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const tabHover = useRef<{ pane: 'shop' | 'inventory'; timer: number } | null>(null)
  function clearTabHover() { if (tabHover.current) clearTimeout(tabHover.current.timer); tabHover.current = null }
  useEffect(() => clearTabHover, [])
  function clearAutoScroll() { document.querySelector<HTMLElement>('[data-board-viewport]')?.removeAttribute('data-drag-scroll') }
  const [ghost, setGhost] = useState<{ item: ShopItem; origin: GemOrigin; x: number; y: number; recycling: boolean; target: Slot | null } | null>(null)
  const slotAt = useCallback((element: Element | null): Slot | null => {
    const target = element?.closest<HTMLElement>('[data-area][data-index]')
    if (!target) return null
    const area = target?.dataset.area
    if (area !== 'board' && area !== 'inventory') return null
    const slot = { area, index: Number(target.dataset.index) } as Slot
    return validSlot(slot, game.columns) ? slot : null
  }, [game.columns])
  useEffect(() => {
    const scrolled = (event: Event) => {
      const current = pointer.current
      if (!current?.moved || !(event.target as HTMLElement)?.matches?.('[data-board-viewport]')) return
      const target = slotAt(document.elementFromPoint(current.lastX, current.lastY))
      setGhost((previous) => previous && (previous.target?.area !== target?.area || previous.target?.index !== target?.index) ? { ...previous, target } : previous)
    }
    document.addEventListener('scroll', scrolled, true)
    return () => { document.removeEventListener('scroll', scrolled, true); clearAutoScroll() }
  }, [slotAt])

  function end(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = pointer.current
    if (!current || event.pointerId !== current.id) return
    clearTabHover()
    clearAutoScroll()
    if (current.moved) {
      suppressClick.current = true
      window.setTimeout(() => { suppressClick.current = false }, 0)
      if (!cancelled) {
        const element = document.elementFromPoint(event.clientX, event.clientY)
        const target = slotAt(element)
        if (target) onDrop(current.from, target)
        else if (current.from.area !== 'shop' && element && !element.closest('.board-grid, .inventory-panel, .workbench-tabs')) {
          onRecycle(current.from, current.item.id)
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
        const slot = slotAt(event.target as Element)
        const from: GemOrigin | null = offer ? { area: 'shop', index, offerId: offer.item.id } : slot ? normalizeSlot(game.board, slot) : null
        const gem = from ? from.area === 'shop' ? offer?.item : game[from.area][from.index] : null
        if (from && gem) pointer.current = { id: event.pointerId, from, item: gem, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false }
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = pointer.current
        if (!current || event.pointerId !== current.id) return
        if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return
        current.moved = true
        current.lastX = event.clientX; current.lastY = event.clientY
        event.currentTarget.setPointerCapture(event.pointerId)
        const element = document.elementFromPoint(event.clientX, event.clientY)
        const viewport = document.querySelector<HTMLElement>('[data-board-viewport]')
        if (viewport) {
          const bounds = viewport.getBoundingClientRect()
          const near = Math.min(28, bounds.width / 7 * 0.6)
          const direction = event.clientY >= bounds.top && event.clientY <= bounds.bottom && event.clientX >= bounds.left && event.clientX <= bounds.right
            ? event.clientX < bounds.left + near ? -1 : event.clientX > bounds.right - near ? 1 : 0 : 0
          viewport.dataset.dragScroll = String(direction)
        }
        const tab = element?.closest<HTMLElement>('[data-workbench-tab]')?.dataset.workbenchTab
        if (tab === 'shop' || tab === 'inventory') {
          if (tabHover.current?.pane !== tab) {
            clearTabHover()
            tabHover.current = { pane: tab, timer: window.setTimeout(() => onTab(tab), 350) }
          }
        } else clearTabHover()
        const outside = Boolean(element && !element.closest('.board-grid, .inventory-panel, .workbench-tabs'))
        setGhost({ item: current.item, origin: current.from, x: event.clientX, y: event.clientY,
          recycling: current.from.area !== 'shop' && outside, target: slotAt(element) })
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => end(event),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => end(event, true),
      onLostPointerCapture(event: PointerEvent<HTMLElement>) {
        // Touch starts with implicit capture on the cell. Moving capture to
        // the main element must not cancel that same drag via a bubbled event.
        if (event.target !== event.currentTarget) return
        clearTabHover()
        clearAutoScroll()
        pointer.current = null
        setGhost(null)
      },
    },
  }
}
