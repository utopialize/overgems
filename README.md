# Overgems

Base de projet pour prototyper avec React, Vite, TypeScript et PixiJS.

## Démarrer

Node.js 22.12 ou plus récent et npm sont nécessaires. Un fichier `.nvmrc` est fourni :

```sh
nvm use # si nvm est installé
npm ci
npm run dev
```

Ouvrir http://localhost:8008 depuis le serveur, ou `http://<ip-locale-du-serveur>:8008`
depuis un autre appareil du réseau local. Vite écoute sur toutes les interfaces
réseau (`0.0.0.0`) et conserve le port `8008` : si ce port est déjà utilisé, le
démarrage échoue au lieu de choisir un autre port.
Les modifications sont rechargées automatiquement.

## Commandes

| Commande | Usage |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | Analyse du code avec Oxlint |
| `npm run build` | Vérification TypeScript et compilation dans `dist/` |
| `npm run check` | Lint et build |
| `npm run preview` | Prévisualisation du build de production |

## Où travailler

```text
src/
  App.tsx                    Interface React
  App.css                    Styles de l'interface
  components/PixiCanvas.tsx   Montage et nettoyage de PixiJS
  pixi/createStarterScene.ts  Scène de départ : cristal animé
  main.tsx                   Entrée React, avec StrictMode
  index.css                  Styles globaux
public/                      Futurs assets servis tels quels
```

React gère l'interface HTML et PixiJS le rendu du canvas. La scène utilise le
ticker PixiJS pour les animations, sans provoquer de rendu React à chaque image.
Elle suit les dimensions de son conteneur et respecte la préférence de réduction
des animations du navigateur. Son initialisation asynchrone et son nettoyage
prennent en charge StrictMode et le rechargement à chaud.

Le projet démarre sans backend ni variables d'environnement. Si des variables
deviennent nécessaires, les stocker dans `.env.local`, ignoré par Git, et
documenter les clés dans `.env.example`. Les variables préfixées `VITE_` sont
publiques dans le navigateur : ne pas y placer de secrets.

## Git

Le dépôt est local, sur la branche `main`. Pour suivre les prochaines modifications :

```sh
git status
git add .
git commit -m "Décrire la modification"
```

## Documentation

- [React](https://react.dev/learn)
- [Vite](https://vite.dev/guide/)
- [PixiJS : Application](https://pixijs.com/8.x/guides/components/application)
