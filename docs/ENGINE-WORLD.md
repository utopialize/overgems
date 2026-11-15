# Audit du moteur et extension horizontale

## Diagnostic établi avant l'extension

Base : `7af64d0`, contenu moteur validé à `8a704fc`. Le circuit exact de la
partie signalée n'a pas été fourni : il n'est donc pas possible d'attribuer
avec certitude son alerte à un plafond précis. Les nouveaux diagnostics exposent
désormais cette cause sur la partie réelle.

La reproduction avec un bloc de neuf croix N1 et une récolte déclenche le budget
des événements (4091 événements effectivement validés avant refus de la visite
suivante), 1270 identités de branches, pic de 434 branches simultanées et
profondeur 11. La puissance reste inférieure à 10 : ni puissance 10¹² ni monnaie
10¹⁵ n'expliquent cette reproduction. La détection des boucles fonctionne
(93 terminaisons pour revisite), mais chaque bifurcation porte son historique :
elle n'empêche pas l'explosion du nombre de chemins indépendants.

Un essai à 16384 événements reste partiel : 4885 branches, pic 1850, profondeur
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
| Vide | 9 | 1 / 1 | 7 | 0,030 → 0,028 | 0,047 → 0,043 |
| Ligne, 7 gemmes | 23 | 1 / 1 | 7 | 0,030 → 0,028 | 0,033 → 0,038 |
| Bloc 2×2, 5 gemmes | 146 | 28 / 17 | 9 | 0,150 → 0,152 | 0,428 → 0,290 |
| Bloc 3×3, 10 gemmes | 4091 | 1270 / 434 | 11 | 1,249 → 0,954 | 3,041 → 2,539 |
| Bloc 4×4, 17 gemmes | 4096 | 1411 / 842 | 8 | 0,950 → 1,210 | 1,079 → 2,486 |
| Bloc 7×6, 42 gemmes | 4093 | 1489 / 751 | 8 | 0,818 → 0,741 | 2,456 → 2,356 |

Les résultats sont mixtes : réduction des allocations et amélioration du cas 3×3,
sans prétendre à une accélération universelle. Les protections restent nécessaires.

Reproduction : `node scripts/benchmark-engine.mjs --baseline=8a704fc`.
`--events=16384` permet la mesure comparative sans modifier les constantes du jeu.
`--output=/tmp/rapport.json` écrit les mesures. En développement uniquement,
`window.overgemsDiagnostics()` mesure la prévision du plateau courant : cause,
nombre d'événements/branches, pic simultané, profondeur, gain et durée.

Validation du moteur avant l'extension : `npm run check` réussi, 200 tests purs ;
25 scénarios Chromium ciblant limites, modes d'affichage et impulsions vivantes
réussis. Les 196 tests existants sont conservés.
