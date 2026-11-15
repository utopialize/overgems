import { useEffect, useRef } from 'react'
import { MINERALS } from '../game/terrain'
import type { GameState } from '../game/types'
import { MineralIcon } from './TerrainViews'

export function CollectionDialog({ minerals, excavations, onClose }: {
  minerals: GameState['minerals']; excavations: number; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  const found = MINERALS.filter(({ id }) => minerals[id] > 0).length
  return <dialog ref={ref} className="collection-dialog" aria-labelledby="collection-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="panel-heading"><h2 id="collection-title">Minéraux · {found}/{MINERALS.length}</h2>
      <button type="button" className="icon-button" aria-label="Fermer la collection" onClick={onClose}>✕</button></div>
    <div className="mineral-collection">{MINERALS.map(({ id, name, color }, index) => <div key={id}
      className={'mineral-card' + (minerals[id] ? ' discovered' : '')} data-testid={'mineral-' + id}>
      <MineralIcon color={minerals[id] ? color : '#536079'} />
      <strong>{minerals[id] ? name : 'Minéral inconnu ' + (index + 1)}</strong>
      <span>{minerals[id] ? '×' + minerals[id] : 'À découvrir'}</span>
    </div>)}</div>
    <p className="muted">{excavations} rocher{excavations > 1 ? 's' : ''} dégagé{excavations > 1 ? 's' : ''} · Collection sans bonus économique.</p>
  </dialog>
}
