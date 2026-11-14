# Overgems

Base de projet pour prototyper avec React, Vite, TypeScript et PixiJS.

## Démarrer

Node.js 22.12 ou plus récent et npm sont nécessaires. Un fichier `.nvmrc` est fourni :

```sh
nvm use # si nvm est installé
npm ci
npm run dev
```

Ouvrir http://192.168.1.112:8008 depuis le serveur ou un autre appareil du réseau
local. Vite écoute sur l'adresse configurée dans `vite.config.ts`
(`192.168.1.112`) et conserve le port `8008` : si ce port est déjà utilisé, le
démarrage échoue au lieu de choisir un autre port.
Les modifications sont rechargées automatiquement.

Sur ce serveur, une règle UFW autorise le port TCP `8008` depuis
`192.168.1.0/24` uniquement, sur l'interface LAN `enp0s31f6`. Cette règle appartient
à la configuration du serveur ; elle ne fait pas partie du dépôt Git.

## Commandes

| Commande | Usage |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | Analyse du code avec Oxlint |
| `npm run build` | Vérification TypeScript et compilation dans `dist/` |
| `npm run check` | Lint et build |
| `npm run preview` | Prévisualisation du build de production |
| `npm run test:mobile` | Tests navigateur du rendu responsive et du canvas |

## Base mobile first

Les styles de base ciblent les téléphones ; une media query `min-width: 40rem`
adapte ensuite l'en-tête et les espacements aux écrans plus larges. La page utilise
la hauteur visible stable (`svh`), les marges de sécurité des appareils à encoche
et une grille qui réserve l'espace disponible au canvas. En paysage ou avec du
texte agrandi, le contenu reste accessible par défilement vertical.

Le zoom et le défilement tactile restent disponibles, y compris sur le canvas.
Les contrôles HTML disposent d'une base typographique de 16 px et d'une taille
tactile minimale de 44 px. Les scènes PixiJS suivent leur conteneur avec
`ResizeObserver`, réduisent leur échelle dans les petites surfaces et limitent
la densité de rendu à 2 pour maîtriser la charge sur mobile.

Pour les futurs écrans : conserver des dimensions souples, prévoir des retours
à la ligne et vérifier chaque nouveau contrôle au toucher et au clavier.
Éviter les actions disponibles uniquement au survol et les éléments fixes qui
masquent le contenu quand le clavier virtuel s'ouvre.

### Vérifier le rendu

Installer le navigateur de test une première fois :

```sh
npx playwright install chromium --only-shell
npm run test:mobile
```

Les tests démarrent leur propre serveur sur `127.0.0.1:18008` et vérifient les
largeurs 320, 360, 390, 412, 768 et 1280 px, le paysage, la rotation, le texte à
200 %, le redimensionnement du conteneur, les gestes tactiles autorisés et la
réduction des animations. Ils vérifient aussi l'absence de débordement horizontal
et d'erreur JavaScript. Les captures de contrôle et les traces des échecs sont
dans `test-results/`, ignoré par Git.

Cette émulation Chromium sert de garde-fou ; compléter avec un essai sur un
iPhone/Safari et un Android/Chrome réels, notamment pour les encoches, les barres
du navigateur et le clavier virtuel. Depuis le téléphone connecté au même LAN,
ouvrir http://192.168.1.112:8008 après `npm run dev`.

## Où travailler

```text
src/
  App.tsx                    Interface React
  App.css                    Styles de l'interface
  components/PixiCanvas.tsx   Montage et nettoyage de PixiJS
  pixi/createStarterScene.ts  Scène de départ : cristal animé
  main.tsx                   Entrée React, avec StrictMode
  index.css                  Styles globaux
tests/mobile/                Vérifications responsive avec Playwright
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
