# Audit du moteur et extension horizontale

## Diagnostic établi avant l'extension

Base : `7af64d0`, contenu moteur validé à `8a704fc`. Le circuit exact de la
partie signalée n'a pas été fourni : il n'est donc pas possible d'attribuer
avec certitude son alerte à un plafond précis. Les nouveaux diagnostics exposent
désormais cette cause sur la partie réelle.

La reproduction avec un bloc de neuf croix N1 et une récolte déclenche le budget
des événements (4091 événements effectivement validés avant refus de la visite
suivante), 1267 branches effectives (1270 identifiants réservés), pic de 434 branches simultanées et
profondeur 11. La puissance reste inférieure à 10 : ni puissance 10¹² ni monnaie
10¹⁵ n'expliquent cette reproduction. La détection des boucles fonctionne
(93 terminaisons pour revisite), mais chaque bifurcation porte son historique :
elle n'empêche pas l'explosion du nombre de chemins indépendants.

Un essai à 16384 événements reste partiel : 4885 identifiants de branches réservés, pic 1850, profondeur
16 ; médiane à froid environ 15 ms et pointe 62 ms sur ce serveur. Une hausse
arbitraire ne résout donc pas ce réseau. Les plafonds 4096/10¹²/10¹⁵ sont conservés.
Une visite est toujours validée entièrement ou refusée sans crédit partiel.

L'ancienne alerte booléenne pouvait survivre à la modification du plateau jusqu'à
la fin d'une émission suivante. Elle identifie désormais le flux concerné et sa
cause, puis se retire quand le plateau est modifié ou qu'un flux complet termine
normalement. La prévision du plateau courant a sa propre indication de limite ;
une prévision limitée ne déclenche pas une fausse alerte d'émission réelle.

## Optimisation et mesures

Les historiques de visite utilisent des états numériques plutôt que des chaînes.
Les copies intermédiaires avant duplication des branches sont supprimées ; une
traversée sans nouvelle activation peut conserver son ensemble d'activations
immuable. Les branches filles ont toujours des ensembles indépendants et les
états antérieurs ne sont jamais mutés. Aucune fusion de branches ni modification
des gains, de l'ordre des événements ou de l'arrondi économique.

Comparaison dans le même processus après 15 échauffements, 30 mesures alternées.
Temps CPU du serveur Node, pas mesures de téléphone. Les événements et gains sont
vérifiés identiques à `8a704fc` sur chaque mesure.

| Réseau | Événements | Branches / pic | Profondeur | Médiane avant → après (ms) | p95 avant → après (ms) |
| --- | --- | --- | --- | --- | --- |
| Vide | 9 | 1 / 1 | 7 | 0,025 → 0,024 | 0,069 → 0,036 |
| Ligne, 7 gemmes | 23 | 1 / 1 | 7 | 0,022 → 0,022 | 0,040 → 0,039 |
| Bloc 2×2, 5 gemmes | 146 | 28 / 17 | 9 | 0,229 → 0,219 | 0,286 → 0,265 |
| Bloc 3×3, 10 gemmes | 4091 | 1267 / 434 | 11 | 1,056 → 0,847 | 2,503 → 2,262 |
| Bloc 4×4, 17 gemmes | 4096 | 1411 / 842 | 8 | 0,864 → 0,730 | 2,103 → 0,883 |
| Bloc 7×6, 42 gemmes | 4093 | 1486 / 751 | 8 | 0,737 → 0,670 | 1,884 → 1,893 |

Dernière mesure après intégration de la largeur variable : environ 20 % de gain
sur le cas 3×3 et 15 % sur le 4×4, avec événements et gains strictement identiques.
Les mesures précédentes étaient mixtes ; JIT et GC font varier ces durées. Ces
résultats ne constituent ni une accélération universelle ni une garantie mobile.
Les protections restent nécessaires. Données : [ENGINE-BENCHMARK.json](ENGINE-BENCHMARK.json).

Reproduction : `node scripts/benchmark-engine.mjs --baseline=8a704fc`.
`--events=16384` permet la mesure comparative sans modifier les constantes du jeu.
`--output=/tmp/rapport.json` écrit les mesures. En développement uniquement,
`window.overgemsDiagnostics()` mesure la prévision du plateau courant : cause,
nombre d'événements/branches, pic simultané, profondeur, gain et durée.

Validation du moteur avant l'extension : `npm run check` réussi, 200 tests purs ;
25 scénarios Chromium ciblant limites, modes d'affichage et impulsions vivantes
réussis. Les 196 tests existants sont conservés.

## Extension livrée

Le monde démarre en 7×9 puis passe à 14, 21, 28 et 35 colonnes, toujours neuf
lignes. Le bouton + du bandeau du circuit achète le palier suivant : 100, 200,
400, 800 Éclats. `WORLD_RULES` dans `src/game/world.ts` configure les sept
colonnes par palier, le plafond de 35, le prix initial et le facteur ×2.
Chaque palier est entièrement rocheux ; aucun besoin de terminer une zone pour
acheter ou creuser ailleurs. Prix des gemmes, probabilités, fusions et inventaire
ne changent pas. Les mêmes découvertes alimentent les rochers supplémentaires.

Les index par ligne sont remappés, en conservant les coordonnées monde et les
références des objets. Les historiques du moteur utilisent `(x × 9 + y) × 4 +
direction`, stable lors d'un agrandissement. Les émissions, leurs événements et
leur puissance restent en place. Une pierre à l'ancienne frontière se résout au
contact courant ; une branche terminée ne ressuscite jamais après l'achat.

La caméra fait défiler seulement une fenêtre d'environ sept colonnes. Terrain
vide/pierre : balayage tactile, glisser souris ou molette/trackpad. Gemme : geste
de déplacement existant. Un glisser maintenu près du bord fait avancer la caméra
via le ticker PixiJS ; sa destination est actualisée sous le pointeur. Le bouton
↤ revient à la source. Un indicateur donne la fenêtre et la largeur achetée.

La simulation porte toujours sur le monde entier. Le canvas reste à la taille
de la fenêtre ; SVG éloignés et effets hors champ ne sont pas dessinés. Les
315 boutons maximum restent dans le DOM pour le clavier. Les majeures restent
un objet de quatre cellules et peuvent traverser une frontière entre deux zones
achetées si les quatre cases sont libres. Le zoom et les cibles de contrôle de
44 px sont conservés ; les cases gardent leur adaptation aux écrans courts.

La sauvegarde V1 conserve `columns`, tableaux complets, objets, rochers, Éclats,
compteurs et découvertes. Sans ce champ, la migration reste en 7×9 et n'ajoute
aucune pierre aux anciennes cellules. La caméra revient à la source au chargement.

## Mesures sur le monde étendu

Sur le même serveur Node, après échauffement :

| Configuration 35×9 | Événements | Branches / pic | Profondeur | Médiane / p95 (ms) | Résultat |
| --- | --- | --- | --- | --- | --- |
| Ligne vide jusqu'à une +12 en colonne 35 | 39 | 1 / 1 | 35 | 0,020 / 0,041 | 12 Éclats, exact |
| 315 croix N1 | 4090 | 1525 / 423 | 7 | 0,564 / 1,069 | Partiel, budget d'événements explicite |

Un serpentin de 175 cellules sur cinq lignes a été exécuté pendant 300 secondes
de temps simulé, tick de 25 ms : 60 émissions parties, 31 terminées, pic de
29 émissions conservées simultanément, sans limite. 10980,471572 Éclats crédités.
Coût CPU total : 88,281 ms ; tick p95 : 0,035 ms, maximum 1,272 ms. Le temps total
inclut la boucle de mesure. Aucune de ces valeurs ne mesure le GPU ou le confort
d'un téléphone réel ; les cas denses restent volontairement bornés.

## Réception

- Unitaires : extensions successives/refus/plafond, conservation des coordonnées,
  objets et aléa ; cellules intégralement rocheuses, majeure entre deux zones,
  fusion/recyclage, scénario 35×9, extension/excavation pendant un trajet,
  récompenses inchangées, aperçu sans effet et migrations strictes.
- Navigateur : achats/persistance, gestes tactiles et souris, molette, caméra
  distincte du déplacement, défilement au bord, vrai dépôt avec caméra décalée,
  excavation/fusion/inventaire, majeure de frontière, vrai gain hors écran,
  migration d'une ancienne partie et absence de scroll de page portrait/paysage.
- Les interactions et tests des lots précédents sont conservés.

Résultats : `npm run check` réussi (lint sans avertissement, 209 tests unitaires,
TypeScript et build). La suite complète `npm run test:mobile` passe avec
99 scénarios en 2,8 minutes, y compris le focus en vue avancée avec caméra décalée,
le confinement des effets et la molette. L'absence de
scroll de page est échantillonnée pendant le franchissement du bord par une bulle.
Captures contrôlées en 320×568 et 568×320, ainsi que majeure traversant une frontière.

Limites à valider humainement : prix et confort de navigation sur Pixel/Android
et iOS/Safari physiques ; aucune promesse de 60 FPS matériel. L'interface de
développement fournit le diagnostic de la partie réellement signalée, car son
agencement exact n'a pas été fourni. Les réseaux fortement cycliques peuvent
toujours atteindre le budget ; leur résultat reste explicitement partiel.
