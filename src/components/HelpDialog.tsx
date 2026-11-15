import { useEffect, useRef, useState } from 'react'

const LESSONS = [
  ['Votre premier cristal', 'Glissez une gemme ambre depuis la boutique sur la case face à la source, à gauche de la ligne centrale. L’achat est payé uniquement à la pose.'],
  ['Un souffle toutes les 5 secondes', 'La source émet une puissance de 1 : éclat lumineux en vue épurée, bulle chiffrée en vue avancée. Le flux avance à 800 ms par case jusqu’au bord ou à une attache fermée.'],
  ['Amplifier et bifurquer', 'Les gemmes × multiplient l’énergie et la redistribuent vers leurs autres attaches. Chaque branche garde toute la puissance. Les attaches sont fixes.'],
  ['Fusionner deux doubles', 'Même famille, niveau et attaches : chaque fusion ajoute +1 en récolte ou +0,1 au facteur, jusqu’à +12 ou ×2,2. Vous pouvez aussi acheter directement sur un double.'],
  ['Recycler un cristal', 'Glissez une gemme hors du plateau pour récupérer 50 % de son prix d’achat. Les coûts fusionnés sont cumulés. Les gemmes augmentent de 1 Éclat tous les 5 achats ; chaque renouvellement coûte 1 Éclat de plus.'],
  ['Un circuit vivant', 'Les boules rencontrent les gemmes présentes à leur arrivée. Une même gemme ne récolte ou n’amplifie qu’une fois par branche : la déplacer ne réactive pas son effet.'],
  ['Jouer au toucher ou au clavier', 'Vous pouvez sélectionner une offre ou une gemme, puis toucher la destination. Au clavier : Entrée sélectionne, les flèches parcourent le plateau, Échap annule.'],
  ['Observer et optimiser', 'Le bouton œil active la vue avancée : puissances, gains, inspection sur la boutique et rendement du plateau fixe. Avant de relâcher une gemme, l’aperçu indique l’écart prévu en Éclats par seconde.'],
  ['Dégager le terrain', 'Les rochers arrêtent les impulsions. Une pioche peut apparaître au hasard en boutique : déposez-la sur un rocher pour libérer la case contre 8 Éclats. Chaque pioche ne sert qu’une fois. Le passage central reste libre au départ.'],
  ['Découvrir des minéraux', 'Creuser peut révéler un minéral rare, avec une découverte garantie tous les quatre rochers. Touchez le cristal en haut à gauche pour ouvrir votre collection. Ces trouvailles ne donnent aucun bonus économique.'],
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
