import { lazy, Suspense, useState } from 'react'
import { canMerge } from '../game/fusion'
import { RULES, gemDescription } from '../game/catalog'
import type { ActiveEmission } from '../game/runtime'
import type { Gem, GemOrigin, Slot } from '../game/types'
import { GemView } from './GemView'

const PixiCanvas = lazy(() => import('./PixiCanvas').then((module) => ({ default: module.PixiCanvas })))

export function GameBoard({ board, selected, selectedGem, emissions, reducedMotion, advanced, mergedId, previewIndex, onPreview, onChoose }: {
  board: (Gem | null)[]; selected: GemOrigin | null; selectedGem: Gem | null
  emissions: ActiveEmission[]; reducedMotion: boolean; advanced: boolean; mergedId: string | null
  previewIndex: number | null; onPreview: (index: number | null) => void
  onChoose: (slot: Slot) => void
}) {
  const [focus, setFocus] = useState(RULES.sourceRow * RULES.columns)
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
          {board.map((gem, index) => {
            const isSelected = selected?.area === 'board' && selected.index === index
            const compatible = Boolean(gem && selectedGem && canMerge(selectedGem, gem))
            return (
              <button key={index} type="button" data-area="board" data-index={index}
                className={`board-cell ${gem ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''} ${compatible ? 'compatible' : ''} ${gem?.id === mergedId ? 'just-merged' : ''} ${previewIndex === index ? 'preview-destination' : ''}`}
                aria-pressed={isSelected} tabIndex={focus === index ? 0 : -1} onFocus={() => { setFocus(index); onPreview(index) }}
                onPointerEnter={() => onPreview(index)}
                aria-label={`Ligne ${Math.floor(index / 7) + 1}, colonne ${index % 7 + 1} : ${gem ? gemDescription(gem) : 'case vide'}${compatible ? ', fusion possible' : ''}`}
                onClick={() => onChoose({ area: 'board', index })}>
                {gem ? <GemView gem={gem} /> : <span className="cell-dot" />}
                {compatible && <span className="merge-mark">+</span>}
              </button>
            )
          })}
        </div>
        <Suspense fallback={null}><PixiCanvas emissions={emissions} reducedMotion={reducedMotion} advanced={advanced} /></Suspense>
      </div>
    </div>
  )
}
