# Overgems

Jeu de cristaux mobile first : construisez un circuit, amplifiez ses impulsions,
récoltez des Éclats et fusionnez vos gemmes. React, TypeScript strict, Vite,
SVG et PixiJS ; aucun compte, backend ou service externe.

## Développement

Le dépôt est hébergé sur [GitHub](https://github.com/utopialize/overgems).
`main` contient le premier MVP ; `develop` accueille la suite du développement.
Les évolutions validées sur `develop` peuvent ensuite être intégrées à `main`.
Les vues et outils d'optimisation sont préparés sur
`feature/advanced-inspection-yield`, à valider avant intégration dans `develop`.

Pour tester cette évolution :

```sh
git switch feature/advanced-inspection-yield
```

## Lancer

Node.js 22.12+ et npm :

```sh
npm ci
npm run dev
```

Ouvrir **http://192.168.1.112:8008/** sur le réseau local. L'adresse et le port
sont configurés dans `vite.config.ts`. Sur ce serveur, UFW autorise le TCP 8008
depuis `192.168.1.0/24` sur `enp0s31f6` ; cette règle est extérieure au dépôt.
Avec nvm, `nvm use` sélectionne la version de Node fournie dans `.nvmrc`.

## Jouer

Une nouvelle partie démarre avec une grille 7 × 9 vide et 30 Éclats. Glissez une
gemme depuis la boutique sur la grille pour l'acheter : le paiement a lieu
uniquement après un dépôt valide. La sélection suivie d'un toucher de destination
fonctionne aussi, ainsi que le clavier. Un dépôt sur un double achète et fusionne
en une seule action. Les attaches doivent être identiques ; aucune rotation.
Chaque fusion augmente la récolte de **1** (`+1` à `+12`) ou le facteur de **0,1**
(`×1,1` à `×2,2`). Les deux familles s'arrêtent au niveau 12.

La source envoie une puissance de 1 toutes les 5 secondes. Les gemmes traversées
brillent ; en vue avancée, leur véritable gain ou multiplicateur flotte brièvement.
Les douze niveaux possèdent des nuances marquées, progressivement plus claires :
cuivre corail, ambre, or puis champagne pour les récoltes ; indigo, améthyste
puis orchidée claire pour les multiplicatrices. Les écarts de teinte et de
saturation rendent chaque montée de niveau plus visible.
L'interface tient sur un seul écran ; l'aide est accessible avec le bouton « ? ».
La réserve est masquée et ses données historiques restent conservées.

La partie est sauvegardée dans ce navigateur. Aucun gain hors ligne.
Les paramètres permettent de mettre le circuit en pause, réduire les animations
et choisir la vue, ou recommencer après confirmation. Les anciennes parties sont préservées :
utiliser « Recommencer une partie… » pour retrouver une grille vide.

La propagation est fixée à **800 ms par case**. L'impulsion est un éclat lumineux
en vue épurée et une bulle chiffrée en vue avancée. Les cases vides la laissent
passer ; un bord ou une entrée de gemme fermée l'arrête. Déplacer, poser, fusionner
ou recycler une gemme conserve les impulsions en cours : chaque prochaine arrivée
rencontre la gemme présente à cet instant. Les récoltes sont créditées au passage.
Une même gemme ne récolte ou n’amplifie qu’une fois par branche, même déplacée
devant la boule ; ses attaches continuent de router le flux. Les branches filles
héritent de cet historique, et les émissions suivantes peuvent la réactiver.

Les bulles de la vue avancée ont un diamètre fixe de 18 px, indépendant de la puissance, et passent
derrière les gemmes. Leur valeur affiche une seule décimale ; le moteur conserve
la précision interne : trois ×1,1 donnent 1,1 → 1,21 → 1,331, affichés
1,1 → 1,2 → 1,3. Au quatrième passage, 1,4641 s'affiche 1,5.
Une collision au bord ou devant une connexion fermée détruit la bulle au contact,
avec six particules discrètes pendant 280 ms, supprimées en mode d'animations réduites.

Sortir une gemme du plateau la recycle pour **50 % du prix réellement payé**.
Un aperçu du remboursement apparaît pendant le glisser ; un bouton équivalent
est disponible après sélection. Les coûts investis sont cumulés à la fusion.
Les prix des gemmes augmentent de **1 Éclat tous les 5 achats**. Le renouvellement
coûte **5 Éclats au départ, puis 1 Éclat de plus à chaque renouvellement réussi**.
Les deux compteurs sont sauvegardés ; un renouvellement ne compte pas comme un achat.
Si le circuit ne produit rien, un renouvellement doit laisser le budget d’une
récolte de niveau 1 et garantir une récolte achetable parmi les nouvelles offres.
Sinon il est refusé sans paiement ni changement des offres ou des compteurs.

## Vues et optimisation

Le bouton **œil** bascule instantanément entre la vue épurée, par défaut, et la vue
avancée. Ce choix est sauvegardé, également accessible dans les paramètres. La vue
épurée privilégie les gemmes, les attaches, un éclat lumineux à traînée courte,
le solde et les icônes. Les erreurs restent signalées ; les indications secondaires,
puissances, gains flottants et statistiques sont réservés à la vue avancée.

En vue avancée, sélectionner une gemme ouvre son inspection **sur la boutique**,
sans déplacer la grille : fonction, niveau, valeur, connexions, recyclage et
contribution estimée. Fermer le panneau rend les offres accessibles ; pendant un
glisser, l'inspection s'efface pour les indications de pose ou de recyclage.

**Dernier flux réel** est le gain de la dernière émission terminée. **Rendement
théorique** simule une nouvelle émission sur le plateau figé, puis divise ses gains
par les 5 secondes de cadence. Il représente un potentiel, y compris en pause,
sans anticiper ni verser de monnaie. La contribution d'une gemme est l'écart avec
la même case vide, routage inclus ; elle peut être négative et les contributions
ne s'additionnent pas en une répartition du total.

Un glisser, un survol après sélection ou les flèches du clavier affichent le
rendement après pose et son écart avant validation. Un aperçu refusé ou annulé
ne coûte rien. Les limites de calcul produisent une estimation signalée comme
partielle ; les comparaisons concernées sont indisponibles. Ni les analyses ni
le changement de vue ne modifient les impulsions en cours.

## Vérifier

| Commande | Usage |
| --- | --- |
| `npm run dev` | Serveur de développement sur le port 8008 |
| `npm test` | Tests unitaires Vitest |
| `npm run typecheck` | Vérification TypeScript |
| `npm run check` | Lint, tests unitaires et build |
| `npm run test:mobile` | Tests responsive et gameplay dans Chromium |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Prévisualisation du build |

Installer le navigateur de test une première fois :

```sh
npx playwright install chromium --only-shell
npm run test:mobile
```

Playwright utilise un serveur distinct sur `127.0.0.1:18008`. Les captures de
contrôle et les traces d'échec sont dans `test-results/`, ignoré par Git.
Les formats 320 à 1280 px, le paysage, les changements de hauteur disponible,
le clavier, le glisser tactile et la sauvegarde sont couverts. Les tests vérifient
que le plateau et les trois offres restent dans le viewport, sans défilement.
Sur les écrans courts, les cases du plateau sont réduites pour conserver la
grille entière ; les autres contrôles gardent des cibles de 44 px. Le zoom natif
reste autorisé. Essayer aussi sur de vrais appareils iOS/Safari et Android/Chrome.

## Architecture et références

- `src/game/engine.ts` : propagation pure et événements déterministes.
- `catalog.ts`, `economy.ts` : valeurs, sertissages, prix et génération des offres.
- `state.ts`, `fusion.ts` : opérations atomiques sur plateau et inventaire.
- `runtime.ts` : émissions et crédit unique des gains, indépendants du framerate.
- `analysis.ts` : rendement théorique, contribution marginale et aperçus sans effet sur la partie.
- `save.ts`, `useGame.ts` : validation des sauvegardes et liaison React.
- `src/components/` : interface HTML, gemmes SVG et Pointer Events.
- `src/components/gemPalette.ts` : nuances et luminosité des facettes par niveau.
- `src/pixi/` : lecture visuelle des événements, sans calcul de production.
- `src/index.css` : palette et tokens ; `src/App.css` : mise en page mobile first.

Les coûts, niveaux, périodes et limites se règlent dans `src/game/catalog.ts`.
La vitesse fixe est `RULES.stepMs`. La hausse des gemmes utilise
`RULES.purchasePriceStep` et `RULES.purchasesPerPriceStep` ; celle du renouvellement
utilise `RULES.rerollCost` et `RULES.rerollPriceStep`. Les anciennes sauvegardes
conservent leur progression ; les offres sont recalées sur le nouveau barème et
l'ancien réglage de vitesse est retiré. Une ancienne
gemme sans coût d'achat enregistré utilise son prix catalogue pour le recyclage.
Les valeurs sont déduites des niveaux : les parties existantes adoptent la
progression linéaire sans remise à zéro des niveaux, du solde ni des coûts investis.
La sauvegarde versionnée utilise la clé `overgems.save.v1`. Aucune variable
d'environnement ni dépendance réseau n'est requise à l'exécution.

- [Prompt maître de développement](<docs/OVERGEMS - MASTER DEV PROMPT V01.md>)
- [Direction artistique](<docs/OVERGEMS - ART DIRECTION.md>)
- [Règles de la version jouable](docs/RULES.md)
- [État et validations](docs/DELIVERY.md)
