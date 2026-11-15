# Version jouable — 15 novembre 2026

Les documents d'origine fournis sont conservés à l'identique dans ce dossier.
Les règles à jour et les arbitrages sont dans RULES.md.

## Comportement actuel

- Nouvelle partie : plateau 7 × 9 sans gemmes, 18 rochers et 30 Éclats, réserve masquée.
- Terrain constructible : source et trois lignes centrales dégagées ; rochers
  bloquants au contact et impossibles à recouvrir par une gemme.
- Pioche aléatoire (20 % par tirage), usage unique directement sur un rocher :
  8 Éclats, sans inflation des gemmes. Un refus ou une annulation ne coûte rien.
  Le budget de première récolte reste protégé si le circuit ne produit pas.
- Quatre minéraux de collection sans bonus : chance de 25 %, découverte garantie
  tous les quatre rochers, espèces manquantes prioritaires. Collection et terrain
  sauvegardés ; ancienne partie migrée sans obstacle ajouté.
- Excavation avant contact sans redémarrage des vagues ; une branche déjà
  éclatée reste terminée. Les analyses incluent le terrain courant.
- Éclatement d'excavation : neuf fragments, poussière et halo pendant 700 ms,
  ou flash fixe de 250 ms en mode réduit. Ticker PixiJS, effet transitoire,
  compatible pause et deux vues, sans changement économique.
- Source de puissance 1 toutes les 5 secondes ; propagation fixe à **800 ms/case**.
  Le réglage de débug a été retiré, y compris des sauvegardes restaurées.
- Chaque impulsion est un éclat lumineux en vue épurée, ou une boule affichant
  sa puissance en vue avancée. Elle
  traverse les cases vides jusqu'à un rocher, au bord ou à une connexion fermée. Les branches
  conservent leur puissance entière et leur historique indépendant.
- En vue avancée : bulles de diamètre constant 18 px, derrière les gemmes, avec une seule décimale
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
- Progression linéaire sur douze niveaux : +1 par fusion de récoltes, jusqu'à
  +12 ; +0,1 au facteur des multiplicatrices, de ×1,1 à ×2,2. Les niveaux
  sauvegardés et les coûts investis sont conservés, avec les nouvelles valeurs.
- Prix des gemmes : catalogue + **1 Éclat tous les 5 achats**. Les offres des
  anciennes sauvegardes sont recalées sans toucher au solde ni aux coûts investis.
- Renouvellement : **5 Éclats, puis 6, 7…**, compteur séparé sauvegardé, aucun
  incrément ni paiement en cas de refus.
- Protection contre la faillite par renouvellement sur circuit sans revenu :
  budget d'une récolte N1 préservé et au moins une récolte abordable dans le tirage.
  Le quatrième renouvellement d'une grille neuve est refusé ; le solde reste 12.
- Une gemme ne récolte ou n'amplifie qu'une fois par branche, même déplacée devant
  la boule. Le routage continue ; les branches filles héritent des activations,
  les émissions suivantes repartent sans ces activations.
- Interface sur un seul écran en portrait et paysage, aide paginée, sauvegarde
  validée, réduction des animations, pause et remise à zéro confirmée.
- Vue épurée par défaut : solde, gemmes et icônes, sans statistiques ou chiffres
  flottants. L'œil et les paramètres activent la vue avancée, choix mémorisé.
- Inspection avancée superposée à la boutique, avec fermeture/recyclage et
  contrôles masqués inertes. La grille conserve sa géométrie sur les neuf formats.
- Rendement théorique du plateau fixe, distinct du dernier flux réel ; contribution
  marginale et aperçus avant pose/recyclage, sans crédit ou débit anticipé.
- Rendement principal à deux décimales maximum ; détails au toucher ou au clavier
  avec taux complet, gain par émission et cadence, sans modifier la simulation.
- Nuances par niveau : douze palettes cuivre/ambre/or/champagne et douze palettes
  indigo/améthyste/orchidée, aux écarts de teinte et de saturation renforcés,
  partagées par plateau, boutique et glisser. Les fusions
  actualisent les facettes sans changer les attaches ni la silhouette.
- Au masquage de l'onglet ou à la pause, seuls les gains déjà collectés sont
  conservés ; les trajets inachevés sont abandonnés, sans production hors ligne.

## Vérifications effectuées

- `npm run check` : lint, **149 tests Vitest**, TypeScript et build.
- Propagation dans les quatre directions, sertissages fixes, croisements,
  boucles, limites, déterminisme et exemple de référence à 22 Éclats.
- Moteur incrémental et prévision statique concordants, passage à travers les
  espaces vides, obstacle ajouté, placement/déplacement/fusion/recyclage en cours
  de trajet et conservation de la puissance déjà acquise.
- Émissions simultanées, ordre des arrivées, crédit unique des gains, absence
  de gains anticipés ou hors ligne et dix minutes de temps simulé.
- Hausse au cinquième achat, renouvellements progressifs, refus sans fonds,
  remboursements et migration des anciennes sauvegardes.
- **70 scénarios Chromium** : achat et recyclage souris/tactile/clavier,
  sauvegarde, suppression du sélecteur, évolution du prix de renouvellement,
  tarifs au palier et conservation des coûts payés.
- Terrain : cinq graines, départ productif, tirages aléatoires, excavation
  atomique, refus et protection de budget, dernière pierre et retrait des outils.
- Collection : garanties, quatre espèces, absence de bonus, hasard reproductible
  après sauvegarde, migrations et validation des nouveaux champs.
- Mobile : pioche tactile annulée/refusée/posée, sélection et clavier avancé,
  grille immobile, collection en portrait/paysage, persistance et collision pierre.
- Feedback d'excavation : débris mobiles et poussière, flash réduit fixe, centrage
  sur la case, disparition, scène conservée et absence de rejeu après rechargement.
- Analyses : comparaison avec la case vide, contributions positives/négatives,
  bifurcations, refus et limites ; la préférence de vue et les aperçus conservent
  les émissions, échéances, monnaie et statistiques réelles.
- Précision : valeur principale arrondie, détails complets accessibles sur 320 px,
  ouverture tactile/clavier et fermeture sans changement de partie ou de grille.
- Deux vues : icône sans texte, statistiques absentes en épuré, étincelle/bulle
  conservant la même identité ; sélection, paramètres et préférence après reload.
- Inspection sans mouvement du plateau sur neuf formats, clavier sans accès aux
  offres couvertes, aperçu souris/tactile et annulation sans paiement.
- Progression : les onze paliers de chaque catégorie, plafonds +12/×2,2,
  conservation des sauvegardes, fusions sur le plateau et achats avec fusion.
- Régressions : renouvellement protégé sans débit ni modification de sauvegarde,
  achat encore possible après refus ; déplacement répété d'une récolte ou d'une
  multiplicatrice sans répétition d'effet. Les tests purs vérifient aussi les
  tirages défavorables, l'inflation, l'héritage des branches et la vague suivante.
- Palettes : 24 variantes distinctes, luminosité progressive et contraste des
  chiffres d'au moins 4,5:1 sur les quatre couleurs de facettes au repos, en
  portrait et paysage ; cohérence boutique/fantôme/plateau, fusion et rechargement.
  Le contrôle ciblé des trois scénarios de palette vérifie également une distance
  CIELAB d'au moins 3 entre niveaux voisins et de 40 entre N1 et N12.
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
