import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../game/types'

export function SettingsDialog({ settings, onChange, onClose, onReset }: {
  settings: Settings; onChange: (patch: Partial<Settings>) => void; onClose: () => void; onReset: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog ref={ref} className="settings-dialog" aria-labelledby="settings-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="panel-heading"><h2 id="settings-title">Votre atelier</h2><button type="button" onClick={onClose} aria-label="Fermer les paramètres">✕</button></div>
      {confirmReset ? <div className="reset-confirm"><p>Effacer votre progression et retrouver une grille vide ? Cette action est définitive.</p>
        <div className="button-row"><button type="button" onClick={() => setConfirmReset(false)}>Annuler</button><button type="button" className="danger" onClick={onReset}>Effacer et recommencer</button></div></div>
        : <>
      <label className="setting-row"><span>Réduire les animations</span>
        <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => onChange({ reducedMotion: e.target.checked })} /></label>
      <label className="setting-row"><span>Mettre le circuit en pause</span>
        <input type="checkbox" checked={settings.paused} onChange={(e) => onChange({ paused: e.target.checked })} /></label>
      <p className="muted">Sauvegarde locale · Aucun gain hors ligne.</p>
      <button type="button" className="text-button" onClick={() => setConfirmReset(true)}>Recommencer une partie…</button></>}
    </dialog>
  )
}
