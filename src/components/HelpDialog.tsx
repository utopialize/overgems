import { useEffect, useRef, useState } from 'react'

const LESSONS = [
  ['Votre premier cristal', 'Glissez une gemme ambre depuis la boutique sur la case face à la source, à gauche de la ligne centrale. L’achat est payé uniquement à la pose.'],
  ['Un souffle toutes les 5 secondes', 'La source émet une puissance de 1 : éclat lumineux en vue épurée, bulle chiffrée en vue avancée. Le flux avance à 800 ms par case jusqu’au bord ou à une attache fermée.'],
  ['Amplifier et bifurquer', 'Les gemmes × multiplient l’énergie et la redistribuent vers leurs autres attaches. Chaque branche garde toute la puissance. Les attaches sont fixes.'],
  ['Fusionner deux doubles', 'Même famille, niveau, rareté et attaches : +1 en récolte classique, +0,1 au facteur ou +4 pour une majeure. Une majeure rare occupe 2×2 cases libres et ne récolte qu’une fois par branche. Elle se trouve en creusant et se range dans une seule place d’inventaire.'],
  ['Recycler un cristal', 'Glissez une gemme hors du plateau pour récupérer 50 % de son prix d’achat. Les coûts fusionnés sont cumulés. Les gemmes augmentent de 1 Éclat tous les 5 achats ; chaque renouvellement coûte 1 Éclat de plus.'],
  ['Un circuit vivant', 'Les boules rencontrent les gemmes présentes à leur arrivée. Une même gemme ne récolte ou n’amplifie qu’une fois par branche : la déplacer ne réactive pas son effet.'],
  ['Jouer au toucher ou au clavier', 'Sélectionnez une offre ou une gemme, puis sa destination. Balayez une case vide ou une pierre pour déplacer la caméra ; glissez une gemme pour la déplacer. Au bord, la caméra avance automatiquement. ↤ revient à la source. Au clavier : Entrée, flèches et Échap.'],
  ['Observer et optimiser', 'Le bouton œil active la vue avancée : puissances, gains, inspection sur la boutique et rendement du plateau fixe. Avant de relâcher une gemme, l’aperçu indique l’écart prévu en Éclats par seconde.'],
  ['Dégager le terrain', 'La commande + près du circuit achète 7 colonnes rocheuses : 100, 200, 400 puis 800 Éclats, jusqu’à 35×9. Creusez dans l’ordre de votre choix. Une pioche aléatoire en boutique libère un rocher pour 8 Éclats. Les impulsions continuent hors écran.'],
  ['Découvrir et ranger', 'L’icône ▦ ouvre les 12 places de l’inventaire, en deux pages. Choisissez une gemme ou une offre, puis sa destination pour stocker, poser ou fusionner. Creuser peut donner une gemme, parfois rare (✦), sans bonus passif. Si une récompense ne peut être rangée, le rocher et votre argent restent intacts.'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className="help-dialog" aria-labelledby="help-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="panel-heading"><span className="eyebrow">Premiers éclats · {step + 1}/{LESSONS.length}</span><button type="button" className="icon-button" aria-label="Fermer l’aide" onClick={onClose}>✕</button></div>
    <h2 id="help-title">{LESSONS[step]![0]}</h2><p>{LESSONS[step]![1]}</p>
    <div className="button-row"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Précédent</button><button type="button" onClick={() => step + 1 === LESSONS.length ? onClose() : setStep(step + 1)}>{step + 1 === LESSONS.length ? 'À moi de jouer' : 'Suivant'}</button></div>
  </dialog>
}
