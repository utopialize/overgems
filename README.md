# Overgems

Jeu de cristaux mobile first : construisez un circuit, amplifiez ses impulsions,
récoltez des Éclats et fusionnez vos gemmes. React, TypeScript strict, Vite,
SVG et PixiJS ; aucun compte, backend ou service externe.

## Développement

Le dépôt est hébergé sur [GitHub](https://github.com/utopialize/overgems).
`main` contient le premier MVP ; `develop` accueille la suite du développement.
Les évolutions validées sur `develop` peuvent ensuite être intégrées à `main`.
Les vues, outils d'optimisation et rochers sont intégrés à `develop`.
Les lots inventaire/récompenses puis gemmes majeures sont développés sur
`feature/inventory-major-gems`, avec un point de validation distinct par lot.

Pour tester cette évolution :

```sh
git switch feature/inventory-major-gems
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

Une nouvelle partie démarre avec une grille 7 × 9 sans gemmes, 18 rochers et
30 Éclats. La colonne de la source et les trois lignes centrales sont libres
pour produire dès le premier achat. Glissez une
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
L'icône **▦** alterne la boutique et l'inventaire de **12 places**, en deux pages
de six cibles tactiles. La grille ne bouge pas. Sélectionner une gemme ou une
offre puis une destination permet de ranger, poser ou fusionner ; le glisser
fonctionne aussi. En vue avancée, le bouton ▦ de l'inspection ouvre l'inventaire.
Pendant un glisser, survoler l'onglet ▦ permet de l'ouvrir. Les anciennes réserves
redeviennent accessibles avec tous leurs objets.

Une excavation peut aussi fournir une gemme : 20 % récolte classique, 8 %
multiplicatrice classique, 2 % récolte rare, **2 % gemme majeure**, 68 % aucune gemme. La table
`EXCAVATION_REWARDS` dans `src/game/rewards.ts` est configurable par poids.
Les gemmes rares portent **✦**, sans bonus passif ; les fusions demandent la
même rareté. Les trouvailles ont un coût investi nul (recyclage nul).
Si une trouvaille ne peut être rangée, l'excavation entière est refusée : argent,
rocher, offre et tirage restent intacts. Libérer une place permet de réessayer.

Les **gemmes majeures** sont des récoltes rares de **2×2 cases**. Elles valent
`+4` à N1 ; une fusion entre deux majeures de même niveau ajoute exactement
`+4`, jusqu'à `+48` à N12, en conservant l'empreinte. Une branche traverse tout
droit, sans changement de puissance, et ne récolte qu'une fois, même sur deux
cellules. Des branches indépendantes peuvent récolter chacune la même majeure.

Les quatre cases doivent être libres et sans rocher. Le dépôt vise le coin haut
gauche ; toucher n'importe quel quartier sélectionne l'objet. Le déplacement
peut recouvrir une partie de son ancienne empreinte. La majeure se range dans
**une seule place d'inventaire**, même sans espace 2×2 sur le plateau. Un dépôt
impossible conserve la gemme. Recyclage et contribution concernent l'objet entier.
Les anciennes sauvegardes sont conservées.

La partie est sauvegardée dans ce navigateur. Aucun gain hors ligne.
Les paramètres permettent de mettre le circuit en pause, réduire les animations
et choisir la vue, ou recommencer après confirmation. Les anciennes parties sont préservées :
utiliser « Recommencer une partie… » pour découvrir le terrain avec rochers.

Une **pioche** peut apparaître au hasard en boutique (20 % par tirage tant qu'il
reste des rochers). Glissez-la sur un rocher, ou sélectionnez-la puis touchez
le rocher : **8 Éclats**, une case libérée, un seul usage. Les dépôts refusés ou
annulés ne coûtent rien. Les outils ne font pas monter le prix des gemmes.
Sans production, creuser doit laisser le budget d'une première récolte.
Après le dernier rocher, les autres pioches proposées sont remplacées par des gemmes.
La pierre éclate en fragments et poussière pendant 700 ms, avec un halo sur la
case libérée. Le mode réduit garde seulement un flash fixe de 250 ms. Ce feedback
reste purement visuel et fonctionne également lorsque le circuit est en pause.

L'excavation peut révéler un **Quartz rose, une Fluorite, une Pyrite ou une Azurite** :
25 % de chance, avec une découverte garantie tous les quatre rochers et priorité
aux espèces manquantes. Touchez le cristal en haut à gauche pour ouvrir la
collection. Les quantités sont sauvegardées, sans bonus économique.
Les anciennes parties gardent leur terrain libre ; aucun rocher n'est ajouté
sur un circuit existant.

La propagation est fixée à **800 ms par case**. L'impulsion est un éclat lumineux
en vue épurée et une bulle chiffrée en vue avancée. Les cases vides la laissent
passer ; un rocher, un bord ou une entrée de gemme fermée l'arrête. Déplacer, poser, fusionner
ou recycler une gemme conserve les impulsions en cours : chaque prochaine arrivée
rencontre la gemme présente à cet instant. Les récoltes sont créditées au passage.
Une même gemme ne récolte ou n’amplifie qu’une fois par branche, même déplacée
devant la boule ; ses attaches continuent de router le flux. Les branches filles
héritent de cet historique, et les émissions suivantes peuvent la réactiver.

Les bulles de la vue avancée ont un diamètre fixe de 18 px, indépendant de la puissance, et passent
derrière les gemmes. Leur valeur affiche une seule décimale ; le moteur conserve
la précision interne : trois ×1,1 donnent 1,1 → 1,21 → 1,331, affichés
1,1 → 1,2 → 1,3. Au quatrième passage, 1,4641 s'affiche 1,5.
Creuser avant le contact permet à la vague en cours de continuer ; creuser après
un éclatement ne ressuscite pas la branche.
Une collision au bord, devant un rocher ou une connexion fermée détruit la bulle au contact,
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
Le rendement principal affiche deux décimales maximum. Touchez cette statistique
pour ouvrir ses détails : taux complet, gain par émission et cadence. Seul
l'affichage est arrondi ; la simulation conserve sa précision.

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
- `board.ts` : ancre unique, empreintes et occupation des quatre cellules des majeures.
- `terrain.ts` : terrain initial, minéraux et hasard d'excavation sauvegardé.
- `rewards.ts` : table extensible des récompenses de gemmes et probabilités.
- `runtime.ts` : émissions et crédit unique des gains, indépendants du framerate.
- `analysis.ts` : rendement théorique, contribution marginale et aperçus sans effet sur la partie.
- `save.ts`, `useGame.ts` : validation des sauvegardes et liaison React.
- `src/components/` : interface HTML, gemmes SVG et Pointer Events.
- `src/components/gemPalette.ts` : nuances et luminosité des facettes par niveau.
- `src/pixi/` : lecture visuelle des événements, sans calcul de production.
- `src/pixi/createExcavationFeedback.ts` : fragments, poussière et halo d'excavation pilotés par le ticker.
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
