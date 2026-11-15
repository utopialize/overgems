import { useEffect, useMemo, useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { ItemView, MineralIcon } from './components/TerrainViews'
import { CollectionDialog } from './components/CollectionDialog'
import { GemInspector } from './components/GemInspector'
import { HelpDialog } from './components/HelpDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { useGemInteractions } from './components/useGemInteractions'
import { RULES, exactNumberLabel, gemDescription, itemDescription, itemLabel, isGem, numberLabel, rateLabel, recycleValue, rerollPrice, signedRateLabel } from './game/catalog'
import { MINERALS } from './game/terrain'
import { estimateCircuit, estimateGemContribution, previewPlacement } from './game/analysis'
import { buyOfferOnBoard, createInitialGame, transferGem } from './game/state'
import type { GemOrigin, Slot } from './game/types'
import { useGame } from './game/useGame'
import './App.css'

export default function App() {
  const { session, dispatch, saveError, loadWarning } = useGame()
  const { game } = session
  const renewalCost = rerollPrice(game.rerolls)
  const [selected, setSelected] = useState<GemOrigin | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setSystemReducedMotion(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const reducedMotion = systemReducedMotion || game.settings.reducedMotion
  const advanced = game.settings.viewMode === 'advanced'
  const theoretical = useMemo(() => advanced ? estimateCircuit(game.board, game.stones) : null, [advanced, game.board, game.stones])
  const selectedItem = selected ? selected.area === 'shop'
    ? game.offers[selected.index]?.item ?? null
    : game[selected.area][selected.index] ?? null : null
  const contribution = useMemo(() => theoretical && selected?.area === 'board'
    ? estimateGemContribution(game.board, selected.index, theoretical, game.stones) : null, [selected, game.board, game.stones, theoretical])
  const discovery = session.discovery ? MINERALS.find(({ id }) => id === session.discovery!.mineral) : null
  const collected = MINERALS.filter(({ id }) => game.minerals[id] > 0).length
  useEffect(() => {
    if (!session.discovery) return
    const timer = window.setTimeout(() => dispatch({ type: 'dismiss-discovery' }), 4000)
    return () => clearTimeout(timer)
  }, [session.discovery, dispatch])
  function focusBoard(index?: number) {
    document.querySelector<HTMLButtonElement>(index === undefined
      ? '.board-cell[tabindex="0"]' : `[data-area="board"][data-index="${index}"]`)?.focus()
  }
  function clearSelection() {
    if (selected) focusBoard(selected.area === 'board' ? selected.index : undefined)
    setSelected(null); setHovered(null); dispatch({ type: 'notice', message: '' })
  }

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
    focusBoard(from.index)
    dispatch({ type: 'recycle', index: from.index, gemId, now: performance.now() })
    setSelected(null)
  }
  const { ghost, suppressClick, pointerHandlers } = useGemInteractions(game, drop, recycle)
  const previewOrigin = ghost?.origin ?? selected
  const previewDestination = ghost ? ghost.target?.area === 'board' ? ghost.target.index : null : hovered
  const showPreview = Boolean(advanced && previewOrigin && (ghost ? ghost.target?.area === 'board' || ghost.recycling : hovered !== null))
  const preview = useMemo(() => showPreview && previewOrigin && theoretical
    ? previewPlacement(game, previewOrigin, previewDestination, theoretical) : null,
    [showPreview, previewOrigin, previewDestination, game, theoretical])
  function choose(slot: Slot) {
    if (suppressClick.current) return
    if (selected?.area === slot.area && selected.index === slot.index) {
      clearSelection(); return
    }
    if (selected && selectedItem) drop(selected, slot)
    else {
      if (game.stones[slot.index]) {
        dispatch({ type: 'notice', message: 'Pioche nécessaire pour libérer cette case.', error: true }); return
      }
      const gem = game[slot.area][slot.index]
      if (gem) {
        setSelected(slot)
        setHovered(null)
        dispatch({ type: 'notice', message: gemDescription(gem) + '. Choisissez une destination ou un double.' })
      }
    }
  }
  const warning = saveError || loadWarning || (session.warning ? 'Limite de sécurité atteinte : simplifiez le circuit.' : '')
  const status = warning || (advanced || session.noticeError ? session.notice : '') || (advanced ? 'Glissez une gemme sur la grille, face à la source.' : '')
  const inspecting = Boolean(advanced && selectedItem && isGem(selectedItem) && !ghost)
  const previewText = preview ? preview.ok
    ? `${preview.recycling ? 'Après recyclage' : 'Après pose'} : ${preview.estimate.limited ? '≥ ' : ''}${rateLabel(preview.estimate.perSecond)} ✧/s · ${preview.deltaPerSecond === null ? 'Écart indéterminé (limite)' : 'Δ ' + signedRateLabel(preview.deltaPerSecond) + ' ✧/s'}`
    : 'Pose impossible · ' + preview.message : ''

  return (
    <main className={['game-shell', reducedMotion ? 'reduce-motion' : '', advanced ? 'advanced-view' : 'simple-view'].join(' ')} {...pointerHandlers}
      onKeyDown={(event) => { if (event.key === 'Escape') clearSelection() }}>
      <header className="game-header">
        <div className="brand"><button type="button" className="brand-mark collection-button" title="Collection de minéraux"
          aria-label={'Ouvrir la collection de minéraux, ' + collected + ' sur ' + MINERALS.length} onClick={() => setCollectionOpen(true)}>
          <MineralIcon /><span className="collection-count">{collected}/{MINERALS.length}</span>
        </button><h1>OVERGEMS</h1></div>
        <div className="header-actions">
          <button type="button" className="view-toggle" aria-label={advanced ? 'Passer en vue épurée' : 'Passer en vue avancée'}
            title={advanced ? 'Masquer les détails · Vue épurée' : 'Afficher les détails · Vue avancée'}
            aria-pressed={advanced} onClick={() => dispatch({ type: 'settings', patch: { viewMode: advanced ? 'simple' : 'advanced' } })}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              {advanced ? <circle cx="12" cy="12" r="3" /> : <path d="M9 12h6m-3-3v6" />}
            </svg></button>
          <button type="button" className="icon-button" aria-label="Comment jouer" onClick={() => setHelpOpen(true)}>?</button>
          <button type="button" className="icon-button" aria-label="Ouvrir les paramètres" onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </header>
      <section className="economy-bar" aria-label="Production du circuit">
        <div className="wallet"><span className={'eyebrow' + (advanced ? '' : ' sr-only')}>Éclats</span><strong data-testid="balance" title={String(game.coins)}><span aria-hidden="true">✧</span> {numberLabel(game.coins)}</strong></div>
        {advanced && <div className="production"><span>Dernier flux réel</span><strong data-testid="last-gain" title={exactNumberLabel(game.stats.lastGain)}>
          {game.stats.emissions ? '+' + numberLabel(game.stats.lastGain) : '—'}</strong><small>Dernière émission terminée</small></div>
        }
        {theoretical && <div className="production theoretical"><span>Rendement théorique</span>
          <strong data-testid="theoretical-rate" data-limited={theoretical.limited}
            title={`${exactNumberLabel(theoretical.perEmission)} Éclats par émission · ${RULES.periodMs / 1000} s${theoretical.limited ? ' · Estimation partielle : limite de simulation atteinte' : ''}`}>
            {theoretical.limited ? '≥ ' : ''}{rateLabel(theoretical.perSecond)} <span>✧/s</span></strong>
          <small>{theoretical.limited ? 'Estimation partielle' : 'Plateau actuel'}</small></div>}
      </section>

      <section className="circuit-section" aria-labelledby="circuit-title">
        <div className="section-heading"><h2 id="circuit-title" className={advanced ? '' : 'sr-only'}>Le circuit</h2>
          <span className="circuit-rhythm" aria-label={game.settings.paused ? 'Circuit en pause' : 'Puissance 1, une impulsion toutes les 5 secondes'}>
            <i className={game.settings.paused ? 'paused' : ''} />{game.settings.paused ? advanced ? 'En pause' : 'Ⅱ' : (advanced ? 'Puissance 1 · ' : '') + RULES.periodMs / 1000 + ' s'}
          </span></div>
        <GameBoard board={game.board} stones={game.stones} selected={selected} selectedItem={ghost?.item ?? selectedItem} emissions={session.pending}
          reducedMotion={reducedMotion} advanced={advanced} mergedId={session.mergedId} onChoose={choose}
          previewIndex={showPreview ? previewDestination : null} onPreview={(index) => { if (advanced && selected) setHovered(index) }} />
      </section>

      <section className={'workbench' + (ghost?.origin.area === 'board' ? ' recycling-active' : '')} aria-label="Boutique de gemmes">
        <div className="shop-heading" inert={inspecting || Boolean(discovery)} aria-hidden={inspecting || Boolean(discovery)}><h2 className={advanced ? '' : 'sr-only'}>Boutique</h2>
          <div className="shop-actions">
          {selected?.area === 'board' && selectedItem && isGem(selectedItem) && <button type="button" className="recycle-button"
            aria-label={'Recycler la gemme sélectionnée pour ' + numberLabel(recycleValue(selectedItem)) + ' Éclats'}
            onClick={() => recycle(selected, selectedItem.id)}>♲ +{numberLabel(recycleValue(selectedItem))} ✧</button>}
          <button type="button" className="reroll-button" aria-label={'Renouveler les offres pour ' + renewalCost + ' Éclats'}
            onClick={() => { dispatch({ type: 'reroll' }); setSelected(null) }} disabled={game.coins < renewalCost}>↻ <span>{numberLabel(renewalCost)} ✧</span></button>
          </div>
        </div>
        <div className="shop-offers" inert={inspecting} aria-hidden={inspecting}>{game.offers.map((offer, index) => (
          <button type="button" key={offer.item.id} data-area="shop" data-index={index} data-testid={'offer-' + index}
            className={'offer' + (selected?.area === 'shop' && selected.offerId === offer.item.id ? ' selected' : '')}
            aria-pressed={selected?.area === 'shop' && selected.offerId === offer.item.id}
            disabled={game.coins < offer.price}
            aria-label={'Choisir ' + itemDescription(offer.item) + ' pour ' + offer.price + ' Éclats, puis déposer sur ' + (isGem(offer.item) ? 'le circuit' : 'un rocher')}
            onClick={() => {
              if (suppressClick.current) return
              setSelected({ area: 'shop', index, offerId: offer.item.id })
              if (advanced) focusBoard()
              setHovered(null)
              dispatch({ type: 'notice', message: itemLabel(offer.item) + ' · Déposez sur ' + (isGem(offer.item) ? 'une case' : 'un rocher') + ' pour acheter (' + offer.price + ' Éclats).' })
            }}>
            <ItemView item={offer.item} />{isGem(offer.item) && <span className="offer-level">N{offer.item.level + 1}</span>}
            <span className="offer-price">{numberLabel(offer.price)} <span aria-hidden="true">✧</span></span>
          </button>
        ))}</div>
        {ghost?.origin.area === 'board' && isGem(ghost.item) && <div className={'recycle-target' + (ghost.recycling ? ' active' : '')} data-testid="recycle-target">
          <strong>♲ {advanced ? 'Recycler · ' : ''}+{numberLabel(recycleValue(ghost.item))} ✧</strong>
          <span className={advanced ? '' : 'sr-only'}>Relâchez hors du plateau · 50 % de la valeur d’achat</span>
        </div>}
        {inspecting && selectedItem && isGem(selectedItem) && <GemInspector gem={selectedItem} onBoard={selected?.area === 'board'} contribution={contribution} onClose={clearSelection}
          onRecycle={() => { if (selected?.area === 'board') recycle(selected, selectedItem.id) }} />}
        {discovery && !inspecting && <div className="discovery-toast" role="status" data-testid="discovery-toast">
          <button type="button" className="discovery-open" onClick={() => { setCollectionOpen(true); dispatch({ type: 'dismiss-discovery' }) }}>
            <MineralIcon color={discovery.color} /><span>{discovery.name} découvert !</span></button>
          <button type="button" className="icon-button" aria-label="Fermer la découverte" onClick={() => dispatch({ type: 'dismiss-discovery' })}>✕</button>
        </div>}
      </section>
      <p className={'notice' + (warning ? ' save-warning' : '') + (preview && !warning ? ' placement-preview' : '')}
        data-testid={preview && !warning ? 'placement-preview' : 'game-notice'} role={warning ? 'alert' : 'status'} aria-live="polite"
        title={previewText && !warning ? previewText : status}>{previewText && !warning ? previewText : status}</p>
      {ghost && <div className={'drag-ghost' + (ghost.recycling ? ' recycling' : '')} style={{ left: ghost.x, top: ghost.y }}><ItemView item={ghost.item} /></div>}
      {collectionOpen && <CollectionDialog minerals={game.minerals} excavations={game.excavations} onClose={() => setCollectionOpen(false)} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {settingsOpen && <SettingsDialog settings={game.settings} onChange={(patch) => dispatch({ type: 'settings', patch })}
        onClose={() => setSettingsOpen(false)} onReset={() => {
          dispatch({ type: 'reset', game: createInitialGame(), now: performance.now() })
          setSelected(null); setSettingsOpen(false)
        }} />}
    </main>
  )
}
