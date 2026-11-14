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
