import { useEffect, useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { GemView } from './components/GemView'
import { HelpDialog } from './components/HelpDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { useGemInteractions } from './components/useGemInteractions'
import { RULES, gemDescription, gemLabel, numberLabel, recycleValue, rerollPrice } from './game/catalog'
import { buyOfferOnBoard, createInitialGame, transferGem } from './game/state'
import type { GemOrigin, Slot } from './game/types'
import { useGame } from './game/useGame'
import './App.css'

export default function App() {
  const { session, dispatch, saveError, loadWarning } = useGame()
  const { game } = session
  const renewalCost = rerollPrice(game.rerolls)
  const [selected, setSelected] = useState<GemOrigin | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setSystemReducedMotion(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const reducedMotion = systemReducedMotion || game.settings.reducedMotion
  const selectedGem = selected ? selected.area === 'shop'
    ? game.offers[selected.index]?.gem ?? null
    : game[selected.area][selected.index] ?? null : null

  function drop(from: GemOrigin, to: Slot) {
    if (to.area !== 'board') return
    const transaction = from.area === 'shop'
      ? buyOfferOnBoard(game, from.index, to.index, from.offerId)
      : transferGem(game, from, to)
    if (from.area === 'shop') dispatch({ type: 'buy', index: from.index, destination: to.index, offerId: from.offerId, now: performance.now() })
    else dispatch({ type: 'transfer', from, to, now: performance.now() })
    if (transaction.ok) setSelected(null)
  }
  function recycle(from: Slot, gemId: string) {
    if (from.area !== 'board') return
    dispatch({ type: 'recycle', index: from.index, gemId, now: performance.now() })
    setSelected(null)
  }
  const { ghost, suppressClick, pointerHandlers } = useGemInteractions(game, drop, recycle)
  function choose(slot: Slot) {
    if (suppressClick.current) return
    if (selected?.area === slot.area && selected.index === slot.index) {
      setSelected(null); dispatch({ type: 'notice', message: '' }); return
    }
    if (selected && selectedGem) drop(selected, slot)
    else {
      const gem = game[slot.area][slot.index]
      if (gem) {
        setSelected(slot)
        dispatch({ type: 'notice', message: gemDescription(gem) + '. Choisissez une destination ou un double.' })
      }
    }
  }
  const warning = saveError || loadWarning || (session.warning ? 'Limite de sécurité atteinte : simplifiez le circuit.' : '')
  const status = warning || session.notice || 'Glissez une gemme sur la grille, face à la source.'

  return (
    <main className={['game-shell', reducedMotion ? 'reduce-motion' : ''].join(' ')} {...pointerHandlers}
      onKeyDown={(event) => { if (event.key === 'Escape') { setSelected(null); dispatch({ type: 'notice', message: '' }) } }}>
      <header className="game-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">◇</span><h1>OVERGEMS</h1></div>
        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="Comment jouer" onClick={() => setHelpOpen(true)}>?</button>
          <button type="button" className="icon-button" aria-label="Ouvrir les paramètres" onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </header>
      <section className="economy-bar" aria-label="Production du circuit">
        <div className="wallet"><span className="eyebrow">Éclats</span><strong data-testid="balance" title={String(game.coins)}><span aria-hidden="true">✧</span> {numberLabel(game.coins)}</strong></div>
        <div className="production"><span>Dernier flux</span><strong data-testid="last-gain">+{numberLabel(game.stats.lastGain)}</strong></div>
      </section>

      <section className="circuit-section" aria-labelledby="circuit-title">
        <div className="section-heading"><h2 id="circuit-title">Le circuit</h2><span className="circuit-rhythm"><i className={game.settings.paused ? 'paused' : ''} />{game.settings.paused ? 'En pause' : 'Puissance 1 · ' + RULES.periodMs / 1000 + ' s'}</span></div>
        <GameBoard board={game.board} selected={selected} selectedGem={ghost?.gem ?? selectedGem} emissions={session.pending}
          reducedMotion={reducedMotion} mergedId={session.mergedId} onChoose={choose} />
      </section>

      <section className={'workbench' + (ghost?.origin.area === 'board' ? ' recycling-active' : '')} aria-label="Boutique de gemmes">
        <div className="shop-heading"><h2>Boutique</h2>
          <div className="shop-actions">
          {selected?.area === 'board' && selectedGem && <button type="button" className="recycle-button"
            aria-label={'Recycler la gemme sélectionnée pour ' + numberLabel(recycleValue(selectedGem)) + ' Éclats'}
            onClick={() => recycle(selected, selectedGem.id)}>♲ +{numberLabel(recycleValue(selectedGem))} ✧</button>}
          <button type="button" className="reroll-button" aria-label={'Renouveler les offres pour ' + renewalCost + ' Éclats'}
            onClick={() => { dispatch({ type: 'reroll' }); setSelected(null) }} disabled={game.coins < renewalCost}>↻ <span>{numberLabel(renewalCost)} ✧</span></button>
          </div>
        </div>
        <div className="shop-offers">{game.offers.map((offer, index) => (
          <button type="button" key={offer.gem.id} data-area="shop" data-index={index} data-testid={'offer-' + index}
            className={'offer' + (selected?.area === 'shop' && selected.offerId === offer.gem.id ? ' selected' : '')}
            aria-pressed={selected?.area === 'shop' && selected.offerId === offer.gem.id}
            disabled={game.coins < offer.price}
            aria-label={'Choisir ' + gemDescription(offer.gem) + ' pour ' + offer.price + ' Éclats, puis déposer sur le circuit'}
            onClick={() => {
              if (suppressClick.current) return
              setSelected({ area: 'shop', index, offerId: offer.gem.id })
              dispatch({ type: 'notice', message: gemLabel(offer.gem) + ' · Déposez sur une case pour acheter (' + offer.price + ' Éclats).' })
            }}>
            <GemView gem={offer.gem} /><span className="offer-level">N{offer.gem.level + 1}</span>
            <span className="offer-price">{numberLabel(offer.price)} <span aria-hidden="true">✧</span></span>
          </button>
        ))}</div>
        {ghost?.origin.area === 'board' && <div className={'recycle-target' + (ghost.recycling ? ' active' : '')} data-testid="recycle-target">
          <strong>♲ Recycler · +{numberLabel(recycleValue(ghost.gem))} ✧</strong>
          <span>Relâchez hors du plateau · 50 % de la valeur d’achat</span>
        </div>}
      </section>
      <p className={'notice' + (warning ? ' save-warning' : '')} role={warning ? 'alert' : 'status'} aria-live="polite" title={status}>{status}</p>
      {ghost && <div className={'drag-ghost' + (ghost.recycling ? ' recycling' : '')} style={{ left: ghost.x, top: ghost.y }}><GemView gem={ghost.gem} /></div>}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {settingsOpen && <SettingsDialog settings={game.settings} onChange={(patch) => dispatch({ type: 'settings', patch })}
        onClose={() => setSettingsOpen(false)} onReset={() => {
          dispatch({ type: 'reset', game: createInitialGame(), now: performance.now() })
          setSelected(null); setSettingsOpen(false)
        }} />}
    </main>
  )
}
