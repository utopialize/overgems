import { connections, DIRECTION_NAMES, exactNumberLabel, gemLabel, recycleValue, signedRateLabel } from '../game/catalog'
import type { Gem } from '../game/types'

export function GemInspector({ gem, onBoard, owned, contribution, onClose, onRecycle, onStore }: {
  gem: Gem; onBoard: boolean; contribution: { perEmission: number; perSecond: number } | null; onClose: () => void; onRecycle: () => void
  onStore: () => void
  owned: boolean
}) {
  const ports = gem.kind !== 'multiplier' ? '4 côtés · tout droit' : connections(gem).map((port) => DIRECTION_NAMES[port]).join(', ')
  return <aside className="gem-inspector" aria-labelledby="inspector-title" data-testid="gem-inspector">
    <div className="inspector-heading">
      <h3 id="inspector-title">{gem.kind === 'major' ? 'Majeure 2×2' : gem.kind === 'harvest' ? 'Récolte' : 'Amplification'} <span>· Niveau {gem.level + 1}</span></h3>
      <button type="button" className="icon-button" aria-label="Choisir une destination dans l’inventaire" onClick={onStore}>▦</button>
      {owned && <button type="button" className="icon-button inspector-recycle" aria-label={'Recycler la gemme sélectionnée pour ' + exactNumberLabel(recycleValue(gem)) + ' Éclats'}
        title="Recycler la gemme" onClick={onRecycle}>♲</button>}
      <button type="button" className="icon-button" aria-label="Fermer l’inspection" onClick={onClose}>✕</button>
    </div>
    <dl className="inspector-facts">
      <div><dt>Valeur exacte</dt><dd data-testid="gem-exact-value">{gemLabel(gem)}</dd></div>
      <div><dt>Connectiques</dt><dd className="inspector-ports" title={ports} aria-label={ports}>
        {gem.kind !== 'multiplier' ? '↔ ↕' : connections(gem).map((port) => ({ N: '↑', E: '→', S: '↓', W: '←' })[port]).join(' ')}
      </dd></div>
      <div><dt>Recyclage</dt><dd>{owned ? exactNumberLabel(recycleValue(gem)) + ' ✧' : 'Après achat'}</dd></div>
      <div className="inspector-contribution"><dt>Contribution estimée</dt>
        <dd data-testid="gem-contribution" title={contribution ? exactNumberLabel(contribution.perEmission) + ' Éclats par émission' : undefined}>
          {onBoard ? contribution ? signedRateLabel(contribution.perSecond) + ' ✧/s' : '— · limite atteinte' : 'À placer pour estimer'}
          {onBoard && contribution && <small>Écart avec cette case vide</small>}
        </dd>
      </div>
    </dl>
  </aside>
}
