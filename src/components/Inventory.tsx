import { useState } from 'react'
import { canMerge } from '../game/fusion'
import { gemDescription, isGem } from '../game/catalog'
import type { Gem, GemOrigin, ShopItem, Slot } from '../game/types'
import { GemView } from './GemView'

export function Inventory({ gems, selected, item, mergedId, onChoose, onPreview, onCancel }: {
  gems: (Gem | null)[]; selected: GemOrigin | null; item: ShopItem | null; mergedId: string | null
  onChoose: (slot: Slot) => void; onPreview: (slot: Slot | null) => void
  onCancel: () => void
}) {
  const [focus, setFocus] = useState(0)
  const [page, setPage] = useState(0)
  return <div className="inventory-panel" role="group" aria-label="Inventaire, 12 emplacements" onPointerLeave={() => onPreview(null)}
    onKeyDown={(event) => {
      if (!(event.target as HTMLElement).dataset.area) return
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key]
      if (delta === undefined) return
      event.preventDefault()
      event.currentTarget.querySelector<HTMLButtonElement>(`[data-index="${Math.max(page * 6, Math.min(page * 6 + 5, focus + delta))}"]`)?.focus()
    }}>
    {selected && <button type="button" className="inventory-cancel icon-button" aria-label="Annuler la sélection" onClick={onCancel}>✕</button>}
    <button type="button" className="inventory-page" aria-label={'Afficher les emplacements ' + (page ? '1 à 6' : '7 à 12')}
      onClick={() => { setPage(1 - page); setFocus((1 - page) * 6) }}><small>{page + 1}/2</small> ↔</button>
    {gems.slice(page * 6, page * 6 + 6).map((gem, offset) => { const index = page * 6 + offset; return <button key={index} type="button" data-area="inventory" data-index={index}
      tabIndex={index === focus ? 0 : -1} onFocus={() => { setFocus(index); onPreview({ area: 'inventory', index }) }}
      onPointerEnter={() => onPreview({ area: 'inventory', index })}
      className={'inventory-cell' + (gem ? ' occupied' : '') + (selected?.area === 'inventory' && selected.index === index ? ' selected' : '')
        + (gem && item && isGem(item) && canMerge(item, gem) ? ' compatible' : '') + (gem?.id === mergedId ? ' just-merged' : '')}
      aria-label={'Inventaire ' + (index + 1) + ' : ' + (gem ? gemDescription(gem) : 'emplacement vide')}
      aria-pressed={selected?.area === 'inventory' && selected.index === index} onClick={() => onChoose({ area: 'inventory', index })}>
      {gem ? <GemView gem={gem} /> : <span className="inventory-index">{index + 1}</span>}
    </button>})}
  </div>
}
