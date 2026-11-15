import { lazy, Suspense, useState } from 'react'
import { canMerge } from '../game/fusion'
import { RULES, gemDescription, isGem } from '../game/catalog'
import type { ActiveEmission, ExcavationFeedback } from '../game/runtime'
import type { Gem, GemOrigin, ShopItem, Slot } from '../game/types'
import { GemView } from './GemView'
import { StoneView } from './TerrainViews'
import { footprint, occupantAt } from '../game/board'

const PixiCanvas = lazy(() => import('./PixiCanvas').then((module) => ({ default: module.PixiCanvas })))

export function GameBoard({ board, stones, selected, selectedItem, emissions, excavationEffects, reducedMotion, advanced, mergedId, previewIndex, onPreview, onChoose }: {
  board: (Gem | null)[]; stones: boolean[]; selected: GemOrigin | null; selectedItem: ShopItem | null
  emissions: ActiveEmission[]; reducedMotion: boolean; advanced: boolean; mergedId: string | null
  excavationEffects: ExcavationFeedback[]
  previewIndex: number | null; onPreview: (index: number | null) => void
  onChoose: (slot: Slot) => void
}) {
  const [focus, setFocus] = useState(RULES.sourceRow * RULES.columns)
  const previewTarget = previewIndex === null ? null : occupantAt(board, previewIndex)
  const previewAnchor = previewTarget && selectedItem && isGem(selectedItem) && canMerge(selectedItem, previewTarget.gem)
    ? previewTarget.anchor : previewIndex
  const previewCells = previewAnchor === null ? [] : selectedItem && isGem(selectedItem)
    ? footprint(selectedItem, previewAnchor) : [previewAnchor]
  return (
    <div className="board-space">
      <div className="board-stage">
        <div className={`energy-source ${emissions.length ? 'emitting' : ''}`} aria-label="Source : puissance 1, une impulsion toutes les 5 secondes"><span>✧</span></div>
        <div className="board-grid" role="group" aria-label="Plateau, 7 colonnes et 9 lignes" onPointerLeave={() => onPreview(null)}
          onKeyDown={(event) => {
            const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
            const offset = offsets[event.key]
            if (offset === undefined) return
            event.preventDefault()
            const target = Math.max(0, Math.min(62, focus + offset))
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-index="${target}"]`)?.focus()
          }}>
          {board.map((stored, index) => {
            const occupant = occupantAt(board, index)
            const gem = occupant?.gem
            const anchor = occupant?.anchor ?? index
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
                aria-label={`Ligne ${Math.floor(index / 7) + 1}, colonne ${index % 7 + 1} : ${stone ? 'rocher, pioche nécessaire' : gem ? gemDescription(gem) : 'case vide'}${compatible ? ', fusion possible' : ''}${excavatable ? ', excavation possible' : ''}`}
                onClick={() => onChoose({ area: 'board', index })}>
                {stone ? <StoneView /> : stored ? <GemView gem={stored} /> : !gem && <span className="cell-dot" />}
                {compatible && anchor === index && <span className="merge-mark">+</span>}
              </button>
            )
          })}
        </div>
        <Suspense fallback={null}><PixiCanvas emissions={emissions} excavationEffects={excavationEffects} reducedMotion={reducedMotion} advanced={advanced} /></Suspense>
      </div>
    </div>
  )
}
