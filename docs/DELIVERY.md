# Version jouable — 15 novembre 2026

Les documents d'origine fournis sont conservés à l'identique dans ce dossier.
Les règles à jour et les arbitrages sont dans RULES.md.

## Comportement actuel

- Nouvelle partie : plateau 7 × 9 vide et 30 Éclats, réserve masquée.
- Source de puissance 1 toutes les 5 secondes ; propagation fixe à **800 ms/case**.
  Le réglage de débug a été retiré, y compris des sauvegardes restaurées.
- Chaque impulsion est une petite boule affichant sa puissance actuelle. Elle
  traverse les cases vides jusqu'au bord ou à une connexion fermée. Les branches
  conservent leur puissance entière et leur historique indépendant.
- Bulles de diamètre constant 18 px, derrière les gemmes, avec une seule décimale
  affichée. La puissance composée reste précise dans le moteur ; trois ×1,1
  produisent bien 1,331 malgré l'affichage 1,3.
- Les collisions terminent la branche dès le contact, avec six particules discrètes
  pendant 280 ms. Elles ne suppriment pas les autres branches ni la vague suivante.
- Le moteur résout chaque arrivée sur le plateau courant. Achats, déplacements,
  fusions et recyclages ne retirent ni ne recalculent les flux déjà partis.
  La prochaine case rencontre la gemme présente à cet instant.
- Les récoltes sont créditées une seule fois au passage réel ; la production du
  dernier flux est mise à jour à sa terminaison. Aucun gain futur n'est versé
  en avance lors d'une manipulation.
- Achat à la pose, fusion stricte sans rotation, et recyclage hors plateau à
  50 % du coût payé. Les fusions cumulent les coûts ; les gestes annulés ne détruisent rien.
- Prix des gemmes : catalogue + **1 Éclat tous les 5 achats**. Les offres des
  anciennes sauvegardes sont recalées sans toucher au solde ni aux coûts investis.
- Renouvellement : **5 Éclats, puis 6, 7…**, compteur séparé sauvegardé, aucun
  incrément ni paiement en cas de refus.
- Interface sur un seul écran en portrait et paysage, aide paginée, sauvegarde
  validée, réduction des animations, pause et remise à zéro confirmée.
- Au masquage de l'onglet ou à la pause, seuls les gains déjà collectés sont
  conservés ; les trajets inachevés sont abandonnés, sans production hors ligne.

## Vérifications effectuées

- `npm run check` : lint, **83 tests Vitest**, TypeScript et build.
- Propagation dans les quatre directions, sertissages fixes, croisements,
  boucles, limites, déterminisme et exemple de référence à 22 Éclats.
- Moteur incrémental et prévision statique concordants, passage à travers les
  espaces vides, obstacle ajouté, placement/déplacement/fusion/recyclage en cours
  de trajet et conservation de la puissance déjà acquise.
- Émissions simultanées, ordre des arrivées, crédit unique des gains, absence
  de gains anticipés ou hors ligne et dix minutes de temps simulé.
- Hausse au cinquième achat, renouvellements progressifs, refus sans fonds,
  remboursements et migration des anciennes sauvegardes.
- **36 scénarios Chromium** : achat et recyclage souris/tactile/clavier,
  sauvegarde, suppression du sélecteur, évolution du prix de renouvellement,
  tarifs au palier et conservation des coûts payés.
- Deux scénarios avec horloge contrôlée vérifient la boule chiffrée dans les
  cases vides et son maintien pendant une nouvelle pose puis un déplacement.
  La même boule affiche 1,0 puis 1,1 ; le gain réel de 1,1 est récolté à la nouvelle position.
- Comparaison de taille et déplacement avant/après des multiplicateurs, arrondi
  à une décimale et vérification de l'ordre de peinture réel sous une gemme.
- Collisions bord/obstacle, suppression immédiate de la bulle, particules
  temporaires et poursuite de la vague suivante ; contrôle visuel des captures.
- Neuf viewports de 320 × 568 à 1280 × 800, portrait/paysage, absence de scroll,
  changements de hauteur et insets, redimensionnement du canvas et réduction des animations.
- Contrôle visuel des captures de boule isolée et de modification du réseau en direct.
- Serveur local contrôlé en HTTP sur `192.168.1.112:8008`.

## À valider manuellement

- iOS/Safari et Android/Chrome réels : safe areas, précision du glisser, lisibilité
  des puissances longues et performance GPU. Le 60 FPS matériel n'est pas mesuré.
- Équilibrage humain du nouveau barème, des renouvellements et du jeu en réseau
  vivant. Dix minutes simulées ne remplacent pas une session humaine prolongée.
- Les cases rétrécissent sur les écrans courts pour conserver le plateau entier.
  Le zoom natif reste autorisé.
- Pas de son, PWA, backend ou synchronisation entre navigateurs. Le repli sans
  animations sur navigateur sans WebGL n'a pas été essayé sur appareil réel.
