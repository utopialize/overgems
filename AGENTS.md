# Repères pour travailler sur Overgems

- Stack : React, Vite, TypeScript et PixiJS ; gestion des dépendances avec npm.
- Garder l'interface HTML dans React et les scènes PixiJS dans `src/pixi/`.
- Utiliser le ticker PixiJS pour les animations, sans état React à chaque image.
- Nettoyer les tickers, écouteurs et ressources PixiJS au démontage ; conserver
  la compatibilité avec React StrictMode et le rechargement à chaud.
- Garder une base légère ; ajouter des dépendances quand le besoin est concret.
- Exécuter `npm run check` après une modification de code et documenter les
  nouvelles commandes ou variables d'environnement dans le README.
- Ne jamais versionner de secrets, `node_modules/` ou `dist/`.
- Concevoir les styles pour les petits écrans d'abord ; ajouter ensuite les
  adaptations tablette et bureau avec des media queries `min-width`.
- Préserver le zoom, le défilement tactile, les safe areas et les préférences
  de réduction des animations. Prévoir des contrôles tactiles d'au moins 44 px.
- Observer le conteneur du canvas avec ResizeObserver ; adapter les scènes à
  ses dimensions, sans fixer leur taille en fonction d'un modèle de téléphone.
- Après une modification de mise en page ou du canvas, lancer aussi
  `npm run test:mobile` et compléter les tests pour les nouvelles interactions.
- Les références produit et graphiques originales sont dans `docs/`. Les règles
  réellement implémentées et les arbitrages sont dans `docs/RULES.md`.
- Le moteur et les transactions dans `src/game/` doivent rester purs et testés
  avec Vitest. Le rendu PixiJS ne doit jamais créditer d'Éclats.
- Les sertissages sont fixes : ne pas ajouter de rotation ni rendre compatibles
  des fusions dont les attaches diffèrent. Préserver les objets sur action refusée.
- La progression des douze niveaux est linéaire : récoltes de +1 à +12 (+1 par
  fusion), multiplicatrices de ×1,1 à ×2,2 (+0,1 par fusion). Ne pas dépasser N12.
- Le jeu doit tenir dans un seul écran (`100dvh`), sans scroll de la page ni du
  plateau. La grille s'adapte à l'espace restant ; ses cases peuvent devenir plus
  petites que 44 px sur les écrans courts. Garder les autres contrôles à 44 px.
- La réserve est dormante : conserver ses données et opérations sans l'afficher.
  Les achats actifs se font directement à la pose sur la grille, de façon atomique.
- Une nouvelle partie commence sans gemmes, avec 18 rochers. La colonne de la
  source et les trois lignes centrales restent libres. Les rochers bloquent au
  contact ; les gemmes ne peuvent pas occuper leur case.
- La pioche est une offre aléatoire à usage unique, achetée uniquement à la pose
  sur un rocher. Prix fixe de 8 Éclats, sans incrément du compteur des gemmes.
  L'excavation conserve les vagues ; les anciens terrains restent sans rochers.
- Les minéraux d'excavation sont collectionnés sans bonus économique. Préserver
  leur hasard séparé sauvegardé ; un aperçu ne doit jamais révéler une trouvaille.
- L'éclatement des rochers est cosmétique, rejoué par le ticker PixiJS depuis
  une excavation validée. Ne pas le sauvegarder ni relancer la scène à chaque
  excavation ; en mode réduit, garder un flash fixe sans débris en mouvement.
- La source émet une puissance
  de 1 toutes les 5 secondes. Les effets rejouent les vrais gains/facteurs du moteur.
- La propagation est fixée à 800 ms par case ; aucun sélecteur de vitesse. Les
  cases vides conduisent les impulsions jusqu'aux obstacles ou aux bords.
- En vue avancée, les bulles gardent un diamètre de 18 px, indépendant de la puissance, et passent
  derrière les gemmes. Leur affichage seul est arrondi à une décimale ; conserver
  la puissance composée pour la simulation et les gains.
- La vue épurée est le défaut sauvegardé : éclat lumineux sans chiffres, contrôles
  iconographiques, sans statistiques de rendement. Le bouton œil et les paramètres
  basculent les vues sans toucher aux émissions ni aux gains.
- L'inspection avancée se superpose à la boutique, sans déplacer ou redimensionner
  la grille. Garder les contrôles couverts inertes et le recyclage accessible.
- Rendement et aperçus restent purs dans `src/game/analysis.ts` : plateau fixe,
  gain par émission divisé par 5 s ; contribution marginale par comparaison avec
  la case vide. Ne jamais appliquer une transaction prévisualisée à la partie.
- Traiter les collisions au contact, sans attendre le centre de la case bloquante
  ou extérieure. Un éclatement de 280 ms termine seulement la branche concernée.
- Résoudre les rencontres au moment des arrivées sur le plateau courant. Un
  achat, déplacement, recyclage ou une fusion ne doit jamais vider, recalculer
  ni solder les impulsions en cours. Créditer chaque récolte une seule fois.
- Le recyclage hors plateau rembourse la moitié du coût payé ; cumuler les coûts
  à la fusion. Un geste annulé ne doit pas détruire la gemme. Les prix progressent
  après les achats réussis et le compteur doit être conservé dans les sauvegardes.
- La hausse des gemmes est de 1 Éclat tous les 5 achats. Le renouvellement a un
  compteur séparé : 5 Éclats au départ, puis +1 après chaque renouvellement réussi.
