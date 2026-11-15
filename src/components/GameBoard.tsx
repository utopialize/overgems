import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { canMerge } from '../game/fusion'
import { RULES, gemDescription, isGem } from '../game/catalog'
import type { ActiveEmission, ExcavationFeedback } from '../game/runtime'
import type { Gem, GemOrigin, ShopItem, Slot } from '../game/types'
import { GemView } from './GemView'
import { StoneView } from './TerrainViews'
import { footprint, occupantAt, boardColumns } from '../game/board'
import { remapIndex } from '../game/world'

const PixiCanvas = lazy(() => import('./PixiCanvas').then((module) => ({ default: module.PixiCanvas })))

export function GameBoard({ board, stones, selected, selectedItem, emissions, excavationEffects, reducedMotion, advanced, mergedId, previewIndex, cameraRequest, onCamera, onPreview, onChoose }: {
  board: (Gem | null)[]; stones: boolean[]; selected: GemOrigin | null; selectedItem: ShopItem | null
  emissions: ActiveEmission[]; reducedMotion: boolean; advanced: boolean; mergedId: string | null
  excavationEffects: ExcavationFeedback[]
  previewIndex: number | null; onPreview: (index: number | null) => void
  onChoose: (slot: Slot) => void
  cameraRequest: { column: number; serial: number }; onCamera: (column: number) => void
}) {
  const columns = boardColumns(board)
  const viewportRef = useRef<HTMLDivElement>(null)
  const cameraCallback = useRef(onCamera)
  useEffect(() => { cameraCallback.current = onCamera }, [onCamera])
  const [camera, setCamera] = useState({ column: 0, source: true })
  const pan = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null)
  const suppressPanClick = useRef(false)
  const [focus, setFocus] = useState(RULES.sourceRow * columns)
  const previousColumns = useRef(columns)
  useEffect(() => {
    const oldColumns = previousColumns.current
    previousColumns.current = columns
    setFocus((index) => remapIndex(index, oldColumns, columns))
  }, [columns])
  useEffect(() => {
    const viewport = viewportRef.current!
    const update = () => {
      const column = Math.min(columns - RULES.columns, Math.floor(viewport.scrollLeft / Math.max(1, viewport.clientWidth / RULES.columns) + 0.02))
      setCamera((previous) => previous.column === column && previous.source === (viewport.scrollLeft < 1) ? previous : { column, source: viewport.scrollLeft < 1 })
      cameraCallback.current(column)
    }
    const wheel = (event: WheelEvent) => {
      if (columns === RULES.columns) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1
      viewport.scrollLeft += (event.deltaX || event.deltaY) * unit
    }
    const resize = new ResizeObserver(update)
    resize.observe(viewport)
    viewport.addEventListener('scroll', update, { passive: true })
    viewport.addEventListener('wheel', wheel, { passive: false })
    update()
    return () => { resize.disconnect(); viewport.removeEventListener('scroll', update); viewport.removeEventListener('wheel', wheel) }
  }, [columns])
  useEffect(() => {
    viewportRef.current?.scrollTo({ left: cameraRequest.column * viewportRef.current.clientWidth / RULES.columns, behavior: 'instant' })
  }, [cameraRequest, columns])
  const previewTarget = previewIndex === null ? null : occupantAt(board, previewIndex)
  const previewAnchor = previewTarget && selectedItem && isGem(selectedItem) && canMerge(selectedItem, previewTarget.gem)
    ? previewTarget.anchor : previewIndex
  const previewCells = previewAnchor === null ? [] : selectedItem && isGem(selectedItem)
    ? footprint(selectedItem, previewAnchor, columns) : [previewAnchor]
  return (
    <div className="board-space">
      <div className="board-stage">
        <div className={`energy-source ${emissions.length ? 'emitting' : ''}`} hidden={!camera.source} aria-label="Source : puissance 1, une impulsion toutes les 5 secondes"><span>✧</span></div>
        <div ref={viewportRef} className="board-viewport" data-board-viewport=""
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0 || columns === RULES.columns) return
            const cell = (event.target as Element).closest<HTMLElement>('[data-area=board]')
            if (cell && occupantAt(board, Number(cell.dataset.index))) return
            pan.current = { id: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const current = pan.current
            if (!current || current.id !== event.pointerId) return
            if (Math.abs(event.clientX - current.x) > 6) current.moved = true
            if (current.moved) event.currentTarget.scrollLeft = current.left + current.x - event.clientX
          }}
          onPointerUp={(event) => {
            if (pan.current?.moved) suppressPanClick.current = true
            pan.current = null
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={() => { pan.current = null }}
          onLostPointerCapture={() => { pan.current = null }}
          onClickCapture={(event) => {
            if (suppressPanClick.current) { event.preventDefault(); event.stopPropagation(); suppressPanClick.current = false }
          }}>
        <div className="board-grid" style={{ width: (columns / RULES.columns * 100) + '%', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          role="group" aria-label={`Plateau, ${columns} colonnes et 9 lignes`} onPointerLeave={() => onPreview(null)}
          onKeyDown={(event) => {
            const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }
            const offset = offsets[event.key]
            if (offset === undefined) return
            event.preventDefault()
            const target = Math.max(0, Math.min(board.length - 1, focus + offset))
            const cell = event.currentTarget.querySelector<HTMLButtonElement>(`[data-index="${target}"]`)
            cell?.focus({ preventScroll: true })
            const viewport = viewportRef.current!
            const left = (target % columns) * viewport.clientWidth / RULES.columns
            if (left < viewport.scrollLeft) viewport.scrollLeft = left
            else if (left + viewport.clientWidth / RULES.columns > viewport.scrollLeft + viewport.clientWidth) viewport.scrollLeft = left + viewport.clientWidth / RULES.columns - viewport.clientWidth
          }}>
          {board.map((stored, index) => {
            const occupant = occupantAt(board, index)
            const gem = occupant?.gem
            const anchor = occupant?.anchor ?? index
            const x = index % columns
            const visible = x >= camera.column - 1 && x <= camera.column + RULES.columns + 1
            const isSelected = selected?.area === 'board' && selected.index === anchor
            const stone = stones[index]
            const compatible = Boolean(gem && selectedItem && isGem(selectedItem) && canMerge(selectedItem, gem))
            const excavatable = Boolean(stone && selectedItem?.kind === 'pickaxe')
            return (
              <button key={index} type="button" data-area="board" data-index={index}
                data-anchor-index={anchor}
                data-stone={stone || undefined}
                className={`board-cell ${stone ? 'stone' : gem ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''} ${compatible || excavatable ? 'compatible' : ''} ${gem?.id === mergedId ? 'just-merged' : ''} ${previewCells.includes(index) ? 'preview-destination' : ''}`}
                aria-pressed={isSelected} tabIndex={focus === index ? 0 : -1} onFocus={() => { setFocus(index); onPreview(index) }}
                onPointerEnter={() => onPreview(index)}
                aria-label={`Ligne ${Math.floor(index / columns) + 1}, colonne ${x + 1} : ${stone ? 'rocher, pioche nécessaire' : gem ? gemDescription(gem) : 'case vide'}${compatible ? ', fusion possible' : ''}${excavatable ? ', excavation possible' : ''}`}
                onClick={() => onChoose({ area: 'board', index })}>
                {visible && (stone ? <StoneView /> : stored ? <GemView gem={stored} /> : !gem && <span className="cell-dot" />)}
                {compatible && anchor === index && <span className="merge-mark">+</span>}
              </button>
            )
          })}
        </div>
        </div>
        <Suspense fallback={null}><PixiCanvas emissions={emissions} columns={columns} excavationEffects={excavationEffects} reducedMotion={reducedMotion} advanced={advanced} /></Suspense>
      </div>
    </div>
  )
}
