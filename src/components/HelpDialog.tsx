import { useEffect, useRef, useState } from 'react'

const LESSONS = [
  ['Votre premier cristal', 'Glissez une gemme ambre depuis la boutique sur la case face à la source, à gauche de la ligne centrale. L’achat est payé uniquement à la pose.'],
  ['Un souffle toutes les 5 secondes', 'La source émet une boule de puissance 1, visible en son centre. Elle avance à 800 ms par case, traverse les espaces vides et s’arrête au bord ou devant une attache fermée.'],
  ['Amplifier et bifurquer', 'Les gemmes × multiplient l’énergie et la redistribuent vers leurs autres attaches. Chaque branche garde toute la puissance. Les attaches sont fixes.'],
  ['Fusionner deux doubles', 'Glissez une gemme sur son double : même famille, même niveau et mêmes attaches. Vous pouvez aussi acheter directement sur un double pour fusionner.'],
  ['Recycler un cristal', 'Glissez une gemme hors du plateau pour récupérer 50 % de son prix d’achat. Les coûts fusionnés sont cumulés. Les gemmes augmentent de 1 Éclat tous les 5 achats ; chaque renouvellement coûte 1 Éclat de plus.'],
  ['Un circuit vivant', 'Déplacez ou posez des gemmes pendant le passage des boules. Elles gardent leur puissance et leur trajet jusqu’à la prochaine case, où elles rencontrent la gemme présente à cet instant.'],
  ['Jouer au toucher ou au clavier', 'Vous pouvez sélectionner une offre ou une gemme, puis toucher la destination. Au clavier : Entrée sélectionne, les flèches parcourent le plateau, Échap annule.'],
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
