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
