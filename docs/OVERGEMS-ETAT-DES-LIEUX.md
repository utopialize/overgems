# OVERGEMS — Audit d’avancement et état des lieux V0.1

Date : **15 novembre 2026**. État examiné : branche
`feature/stone-excavation`, issue de `develop` au commit `252e657`.
Les vues et outils d'optimisation sont intégrés à `develop` par la PR n°1 ;
le terrain à excaver attend sa validation avant fusion. Le commit `35e147c`
contient l'audit et les deux corrections de gameplay décrites ci-dessous ; le
premier MVP correspond à `57afe23`. `package.json` porte
encore la version technique `0.0.0`. « V0.1 » désigne ici le périmètre produit.

Ce document décrit le jeu existant, ses écarts et les décisions à discuter.
L’audit initial était documentaire. À la demande explicite du porteur de projet,
deux corrections ont ensuite été réalisées : protection du renouvellement sans
revenu et activation économique unique d’une gemme par branche. Le présent état
des lieux décrit le code corrigé et conserve la trace des constats initiaux.
À la demande suivante, la progression chromatique sur douze niveaux a été ajoutée.
La progression économique a ensuite été fixée à +1 par fusion de récoltes et
+0,1 par fusion de multiplicatrices, avec les plafonds +12 et ×2,2.
L'évolution précédente ajoute les deux vues, l'inspection superposée à la boutique,
les contributions marginales et les aperçus de rendement sans effet sur la partie.
L'évolution actuelle ajoute 18 rochers, les pioches et une collection de minéraux.

### Ajout : terrain constructible et excavation

La colonne de source et les trois lignes centrales sont dégagées au départ :
la première récolte peut produire sans excavation. Les 18 rochers des autres
cases bloquent les impulsions au contact et refusent toute gemme.
Une pioche apparaît aléatoirement en boutique (20 % par tirage tant qu'il reste
des pierres). Elle se consomme sur une pierre, au glisser ou à la sélection :
8 Éclats fixes, paiement atomique, sans incrément des achats de gemmes. Creuser
sans revenu préserve le budget de première récolte. Après le dernier rocher,
les autres outils proposés sont remplacés par des gemmes.

Une excavation peut révéler un Quartz rose, une Fluorite, une Pyrite ou une
Azurite : 25 % de chance, garantie toutes les quatre excavations, priorité aux
espèces absentes. La collection accessible via le cristal du bandeau conserve
les quantités, sans bonus économique. La découverte s'annonce sur l'en-tête de
boutique sans déplacer la grille. Terrain et hasard d'excavation sont sauvegardés.
Les anciennes parties restent libres de pierres ; il faut recommencer pour
essayer le nouveau terrain. Les anciennes offres `gem` sont migrées vers `item`.

L'excavation conserve les vagues en cours. Une pierre retirée avant contact
laisse passer ; une branche déjà éclatée n'est pas relancée. Les analyses
statiques et les aperçus prennent en compte le terrain, sans révéler de minéraux.
Ces paramètres de répartition, prix et fréquence sont une première base
d'équilibrage, pas une validation par des sessions humaines prolongées.
Un petit correctif distinct arrondit ensuite le rendement principal à deux
décimales maximum ; ses détails au toucher/clavier conservent le taux complet,
le gain par émission et la cadence, sans modifier les calculs.
L'excavation reçoit ensuite un feedback visuel : neuf fragments, poussière et
halo pendant 700 ms, remplacés par un flash fixe de 250 ms en mode réduit. Le
ticker PixiJS rejoue uniquement les transactions validées ; les effets ne sont
pas sauvegardés et n'affectent pas la simulation, même en pause.

Les sources sont le code, les tests, l'historique Git disponible et les
documents du dépôt : [prompt initial](<OVERGEMS - MASTER DEV PROMPT V01.md>),
[charte graphique](<OVERGEMS - ART DIRECTION.md>), [règles actuelles](RULES.md),
[compte rendu antérieur](DELIVERY.md) et [README](../README.md).
Le code prévaut pour décrire le comportement effectif. Les résultats relancés
pendant cet audit sont distingués des intentions et des hypothèses.

## 1. Le jeu aujourd’hui

Overgems est un jeu web solo d’optimisation de circuit et de fusion. Une source
envoie périodiquement de l’énergie sur une grille de **7 colonnes × 9 lignes**.
Les gemmes ambre `+` récoltent des **Éclats** ; les gemmes mauves `×` amplifient
l’énergie et la dirigent selon leurs attaches métalliques fixes.

Le joueur cherche à augmenter sa production en choisissant l’ordre des gemmes,
les chemins, les bifurcations et les fusions. Il n’existe ni objectif chiffré,
ni victoire, ni défaite déclarée, ni prestige. La progression est ouverte, mais
le catalogue s’arrête à douze niveaux et les calculs possèdent des plafonds.

La boucle active est : acheter une offre directement sur le plateau, observer
les passages, récolter, réorganiser ou fusionner, puis réinvestir. Le joueur peut
aussi renouveler les offres ou recycler une gemme contre la moitié de son coût.
Il peut intervenir pendant les passages : le circuit est évalué au fil du temps,
et non figé au départ de chaque émission.

Une partie neuve commence avec **30 Éclats, 18 rochers, aucune gemme et trois offres** :
`+1` à 6 Éclats, `×1,1` horizontal à 10 et `+1` à 6. Il faut placer une récolte
sur un chemin traversé pour commencer à produire. La réserve de douze places
existe dans les données, mais aucun accès n’est proposé dans l’interface.

Le jeu fonctionne dans le navigateur sans compte ni serveur applicatif. Il
continue à produire tant que l’onglet est visible et le circuit actif ; il ne
produit pas hors ligne. La sauvegarde reste locale au navigateur et à l’origine
web utilisée.

## 2. Mécaniques réellement implémentées

Dans cette section, **complet** signifie utilisable dans le périmètre actuel et
présent dans le code, sans présumer un équilibrage humain validé. **Partiel**
désigne une réalisation limitée ou inaccessible en partie. **Absent** signifie
qu’aucun parcours joueur correspondant n’est implémenté.

### 2.1 Émission, temps et propagation — complet

Sources : `src/game/catalog.ts`, `engine.ts`, `runtime.ts`, `useGame.ts`.

- La source est extérieure à la grille, à gauche de la **cinquième ligne**.
  Elle émet vers la droite une puissance de **1 toutes les 5 000 ms**.
- La première émission est programmée 5 secondes après la création de session.
  Une arrivée normale au centre d’une case prend **800 ms par pas**, y compris
  dans le vide. Une récolte posée dans la première case agit donc vers 5,8 s
  après le démarrage d’une session neuve, selon l’ordonnancement du navigateur.
- Les déplacements sont orthogonaux. Une case vide transmet tout droit, sans
  récolter ni amplifier. Les seuls obstacles actuels sont les bords et les
  multiplicatrices dépourvues d’attache sur le côté d’entrée.
- Les émissions peuvent se chevaucher. Chaque émission possède une identité,
  des branches, une puissance et un historique distincts.
- Les récoltes sont créditées à l’arrivée effective, une seule fois. Les effets
  graphiques ne créditent rien. La statistique « Dernier flux réel » est actualisée
  quand toutes les branches de l’émission sont terminées, pas à son départ.
- Achat, déplacement, fusion et recyclage conservent les parcours déjà lancés.
  La prochaine rencontre utilise la gemme présente au moment de l’arrivée.
  Une amplification déjà acquise n’est pas retirée si sa gemme est déplacée.

Les collisions sont résolues plus tôt que les arrivées au centre : le seuil
logique `CONTACT_PROGRESS = 0.35` correspond à **280 ms dans un pas de 800 ms**.
Sur une grille vide, la première émission se termine au bord à 10 880 ms depuis
le démarrage : `5 000 + 7 × 800 + 280`. Si un obstacle est ajouté après ce seuil
sur le trajet en cours, la collision est traitée immédiatement. Une action
horodatée traite d’abord les arrivées antérieures, pour ne pas modifier le passé.

Ce contact est une convention de simulation en fraction de case, non un calcul
géométrique tenant compte du rayon de la bulle et de la taille réelle des cases.
La bulle a, elle, une taille fixe en pixels : voir les limites en section 7.

Le runtime traite les arrivées dues dans l’ordre chronologique. Après un retard
de l’ordonnanceur, les parcours existants avancent, mais les émissions manquées
ne sont pas recréées : au plus une nouvelle émission part à cet instant, puis la
suivante est prévue 5 secondes plus tard.

### 2.2 Récoltes et multiplicatrices — complet

Sources : `src/game/catalog.ts`, `engine.ts`.

Une récolte `+v` accepte les quatre côtés. Au premier passage d’une branche :

```text
gain = puissance entrante × v
puissance sortante = puissance entrante
direction sortante = direction entrante
```

Elle ne consomme pas l’énergie, ne la divise pas et ne la fait pas tourner.
Plusieurs branches indépendantes peuvent chacune récolter cette gemme, mais une
branche qui l’a déjà activée passe sans nouveau gain, même si elle a été déplacée.

Une multiplicatrice `×m` accepte seulement les côtés munis d’une attache. Si
l’entrée est valide et que cette branche ne l’a pas encore activée :

```text
puissance amplifiée = puissance entrante × m
sorties = toutes les attaches sauf celle de l’entrée
puissance de chaque sortie = puissance amplifiée entière
gain direct de la multiplicatrice = 0
```

La duplication conserve donc toute la puissance dans chaque branche. Il n’y a
aucun partage par deux ou trois. Les facteurs se **composent par multiplication** :
trois `×1,1` donnent `1 → 1,1 → 1,21 → 1,331`. La bulle affiche seulement
`1,0 → 1,1 → 1,2 → 1,3` ; un quatrième passage donne `1,4641`, affiché `1,5`.
Le calcul n’ajoute pas simplement `0,1` à chaque passage.
Lors d’une nouvelle rencontre de la même instance par cette branche, les attaches
continuent à router et bifurquer, sans appliquer de nouveau le facteur.

Le catalogue fixe douze niveaux communs aux deux catégories. L’indice stocké
dans les données commence à zéro ; le niveau présenté au joueur commence à un.
La récolte vaut le niveau affiché ; le facteur vaut `1 + niveau affiché / 10`.

| Niveau affiché | Récolte | Multiplicatrice |
| --- | --- | --- |
| 1 | +1 | ×1,1 |
| 2 | +2 | ×1,2 |
| 3 | +3 | ×1,3 |
| 4 | +4 | ×1,4 |
| 5 | +5 | ×1,5 |
| 6 | +6 | ×1,6 |
| 7 | +7 | ×1,7 |
| 8 | +8 | ×1,8 |
| 9 | +9 | ×1,9 |
| 10 | +10 | ×2 |
| 11 | +11 | ×2,1 |
| 12 | +12 | ×2,2 |

La puissance utilise les nombres JavaScript, sans arrondi volontaire après chaque
amplification. Les montants monétaires sont arrondis à **six décimales** par
`roundCoins`. L’interface affiche au plus une décimale pour le solde et les gains,
et exactement une pour la puissance des bulles ; les grands nombres sont abrégés
à partir de 100 000 pour les montants et de 1 000 pour les bulles. L’affichage
n’est donc pas une lecture exhaustive de la précision interne.

### 2.3 Sertissages, bifurcations et croisements — complet

Sources : `src/game/types.ts`, `catalog.ts`, `engine.ts`, `components/GemView.tsx`.

`N/E/S/W` désignent haut/droite/bas/gauche. Les **onze variantes** sont fixes :

| Famille | Variantes | Sorties pour une entrée valide |
| --- | --- | --- |
| Lignes | `EW`, `NS` | 1, en face |
| Coudes | `NE`, `ES`, `SW`, `NW` | 1, perpendiculaire |
| T | `NES`, `ESW`, `NSW`, `NEW` | 2 |
| Croix | `NESW` | 3 |

Chaque attache peut être entrée ou sortie. Il n’existe ni rotation, ni changement
de sertissage, ni pièce de routage indépendante du multiplicateur. Les récoltes
n’ont pas de sertissage fonctionnel et n’exigent aucune attache en face.

Les branches ne fusionnent jamais lorsqu’elles se croisent. Une récolte peut
recevoir horizontalement et verticalement, avec deux gains indépendants. Une
croix multiplicatrice redistribue chaque arrivée vers trois sorties ; elle ne
constitue pas un simple pont isolant deux axes.

### 2.4 Boucles et limites — complet comme protection, performance à qualifier

Sources : `src/game/engine.ts`, `runtime.ts`, `pixi/createFlowScene.ts`.

Chaque branche conserve les états `(case, direction de déplacement à l’arrivée)`
déjà visités, y compris les cases vides. Retrouver le même état termine cette
branche avant une nouvelle récolte ou amplification. Les branches filles copient
l’historique de leur ascendance puis évoluent indépendamment. Repasser sur une
case par une direction différente reste possible.

Une seconde mémoire suit les **identifiants de gemmes déjà activées par branche**.
Déplacer une gemme devant la même branche ne répète donc plus sa récolte ou son
amplification. Les branches filles héritent de cette mémoire avec des ensembles
indépendants ; deux branches qui découvrent une gemme peuvent chacune l’activer.
Chaque nouvelle émission commence avec une mémoire vide. Le routage reste actif
même lors d’une rencontre sans nouvel effet économique.

Les plafonds actuels sont :

- **4 096 événements par émission**, toutes branches confondues. Un passage peut
  produire plusieurs événements : ce n’est pas un plafond de 4 096 cases.
- **10¹² de puissance par branche**. Une amplification qui dépasserait ce seuil
  termine la branche avec le motif `power`, plutôt que de la saturer à ce seuil.
- **10¹⁵ de solde** et de plusieurs agrégats monétaires. Le gain cumulé d’une
  émission est également borné. Les visites qui dépasseraient le budget global
  sont refusées sans crédit partiel de leur récolte.

Une limite exceptionnelle peut afficher « Limite de sécurité atteinte : simplifiez
le circuit ». L’avertissement est générique, sans détail du seuil ou de la branche.
Une boucle normalement détectée n’est pas présentée comme un dépassement de budget.

Le rendu possède ses propres budgets : au plus 120 bulles/anneaux dans un budget
partagé par image, 40 retours numériques et 40 éclatements simultanés. Des effets
peuvent être omis alors que les calculs et gains continuent. Ces budgets ne
constituent pas une preuve de fluidité sur téléphone.

### 2.5 Fusion — complète ; intérêt économique dépendant du contexte

Sources : `src/game/fusion.ts`, `state.ts`.

Deux instances différentes fusionnent uniquement si leur catégorie, leur niveau
et leur valeur sont identiques. Pour les multiplicatrices, la chaîne de
sertissage doit être exactement la même. Le niveau 12 ne fusionne plus.
Une fusion ajoute exactement 1 à la récolte ou 0,1 au facteur, sans exception
sur les paliers élevés. Le refus au plafond conserve les deux objets.

La destination reçoit la gemme du niveau suivant, conserve son identité et son
sertissage ; la source est libérée. Le coût investi devient la somme des coûts
des deux objets. Le refus conserve objets et monnaie. Il n’existe ni échange de
deux gemmes incompatibles ni fusion en chaîne automatique.

La fusion fonctionne entre gemmes du plateau, ainsi que directement depuis une
offre de boutique vers un double posé. Les opérations pures autorisent aussi les
transferts et fusions avec la réserve, mais ces parcours sont masqués au joueur.
La sélection ou le glisser met en évidence les doubles compatibles du plateau.

Monter de niveau augmente la valeur d’**une** gemme, sans garantir un meilleur
rendement que conserver **deux** gemmes. Par exemple, deux `+2` traversées donnent
4 par unité de puissance ; leur fusion `+3` donne 3 et libère une case. Deux
`×1,1` en série donnent `×1,21` ; leur fusion donne `×1,2`. Cet arbitrage est
structurel dans le catalogue actuel, pas un défaut d’arrondi.

### 2.6 Boutique, achats, renouvellement et économie — complets ; équilibrage partiel

Sources : `src/game/catalog.ts`, `economy.ts`, `state.ts`.

Trois offres montrent gemme, valeur, niveau, sertissage et prix. Sélectionner
une offre ne paie rien. Un achat réussi réalise ensemble le débit, la pose ou
fusion, le remplacement de l’offre et l’incrément du compteur. Une offre périmée
est rejetée grâce à son identifiant ; un dépôt invalide ou sans fonds ne débite
rien. Les offres inabordables et le renouvellement sans fonds sont désactivés.

Pour l’indice de niveau `L = niveau affiché − 1` :

```text
prix catalogue d’une récolte = ceil(6 × 2,5^L)
prix catalogue d’une multiplicatrice = ceil(10 × 2,5^L × (nombre d’attaches − 1))
prix boutique = min(10^15, prix catalogue + floor(achats réussis / 5))
prix du prochain renouvellement = min(10^15, 5 + renouvellements réussis)
```

Au niveau 1, une récolte coûte 6, une ligne ou un coude 10, un T 20 et une croix
30. Les sertissages à sorties multiples ont donc un surcoût économique explicite.
Chaque cinquième achat réussi augmente toutes les offres de 1 Éclat, y compris
celles restées en boutique. Un achat avec fusion compte aussi. Recycler ou
fusionner deux gemmes possédées ne fait pas baisser les prix.

Le renouvellement remplace les trois offres et coûte successivement 5, 6, 7…
Il possède son propre compteur, sauvegardé, et n’augmente pas le compteur d’achats.
Seules les transactions réussies font progresser ces compteurs.

**Protection ajoutée après audit :** si une émission sur le plateau actuel
rapporterait zéro, le renouvellement doit conserver le budget d’une récolte N1
au tarif courant, soit `6 + floor(achats / 5)` avant plafond. À défaut il est
refusé, sans débit, changement d’offres, de graine ou de compteurs. S’il est accepté,
au moins une nouvelle récolte doit être abordable ; sinon la première offre est
remplacée par une récolte N1 en conservant son identifiant et les tirages consommés.
Un circuit actuellement productif n’est pas soumis à cette réserve de budget,
même lorsqu’il est en pause manuelle. Une récolte isolée hors trajet ne suffit
pas à désactiver la protection.

Les nouveaux tirages sont déterministes : générateur congruentiel
`seed' = (1664525 × seed + 1013904223) modulo 2^32`, via `Math.imul`, avec trois
avancées par offre. Une partie neuve utilise toujours la graine `20261115`.
Le premier tirage choisit la catégorie par `seed % 10 < 5` ; le troisième choisit
le sertissage parmi les onze variantes. Il n’y a pas de rareté explicite.

Pour le niveau, le deuxième tirage choisit l’indice `0` sauf si son reste modulo
5 vaut zéro. Dans ce cas, l’indice est `min(3, max(0, H − 1))`, où `H` est le
plus haut indice actuellement possédé, **plateau et réserve inclus**. Les offres
générées ne dépassent donc jamais le niveau affiché 4 ; les niveaux supérieurs
dépendent des fusions. Ce plafond n’est pas celui du catalogue. Il n’existe
aucune garantie de double utile ni de progression après un nombre donné de tirages,
hormis la récolte abordable de secours lors d’un renouvellement sans revenu.

Le recyclage détruit une gemme du plateau et rembourse
`roundCoins(coût investi / 2)`. Le remboursement ne compte pas dans la production
du circuit. Une fusion cumule les coûts effectivement payés, inflation incluse.
Pour une ancienne gemme sans champ `invested`, le prix catalogue sert de repli ;
il ne reconstitue pas son véritable historique d’achat.

### 2.7 Placement, sélection et réserve — complet pour le plateau, réserve dormante

Sources : `src/components/useGemInteractions.ts`, `GameBoard.tsx`, `src/App.tsx`.

Les actions actives sont le glisser depuis la boutique, le déplacement sur le
plateau, la fusion, le recyclage hors plateau et la sélection suivie d’un toucher
de destination. Le clavier permet sélection/validation avec Entrée, déplacement
du focus avec les flèches et annulation de la sélection avec Échap. Les boutons
portent des noms accessibles décrivant valeur, niveau, position et connexions.

Le glisser commence après un déplacement d’au moins 8 px. Un fantôme suit le
pointeur et le remboursement est annoncé avant un recyclage. Relâcher une gemme
possédée sur un élément hors grille la recycle ; cela ne nécessite pas de viser
uniquement le panneau de recyclage. Un événement tactile `pointercancel`
conserve la gemme. Un bouton de recyclage apparaît après sélection.

L’annulation par Échap concerne la sélection ; aucun raccourci d’annulation de
transaction ou de retour arrière n’est fourni. Une destination occupée
incompatible ne provoque pas d’échange.

La réserve contient toujours douze emplacements dans `GameState`. `buyOffer` et
`transferGem` conservent les opérations historiques, testées, mais l’interface
active utilise `buyOfferOnBoard`. Une réserve historique pleine n’empêche pas
d’acheter sur le plateau. Ses objets sont conservés, mais **inaccessibles** au
joueur dans cette interface.

### 2.8 Sauvegarde, suspension et reprise — complètes localement, sans continuité des flux

Sources : `src/game/save.ts`, `useGame.ts`, `runtime.ts`.

La clé est `overgems.save.v1`. Sont enregistrés grille, réserve, offres, identités,
niveaux, attaches, investissements, solde, compteurs d’achat et renouvellement,
graine, prochain identifiant, statistiques, paramètres et champ de tutoriel.
Les statistiques incluent production cumulée, émissions terminées, dernier gain
et les dix derniers gains terminés ; seule une partie est affichée.

La sauvegarde est différée de 150 ms après changement de l’état de jeu, et tentée
aussi à la suspension/page quittée. La validation vérifie notamment dimensions,
nombres finis bornés, niveaux, sertissages et unicité des identifiants. Les
anciennes sauvegardes V1 sans compteurs reçoivent zéro, l’ancien réglage de vitesse
est retiré et les prix d’offres sont recalculés au barème actuel.
Les valeurs des gemmes étant calculées depuis leurs niveaux, les anciennes
parties adoptent le catalogue linéaire en conservant niveaux, identifiants,
investissements et solde. Aucune nouvelle version de sauvegarde n'est nécessaire.

Une sauvegarde invalide est signalée et remplacée par une partie neuve ; la
sauvegarde automatique peut ensuite écraser la donnée invalide. Aucun exemplaire
de secours ni import/export n’est fourni. Si le stockage est interdit, le jeu
reste utilisable dans l’onglet avec un avertissement.

Les parcours en cours ne sont pas sauvegardés. Pause, masquage d’onglet et
rechargement les abandonnent, sans verser les récoltes futures et sans retirer
les gains déjà collectés. Une émission abandonnée ne rejoint pas les statistiques
de flux terminés. La suspension/reprise d’onglet redémarre le délai de 5 secondes.
La pause manuelle conserve l’ancienne échéance : la première émission après
décochage peut partir dès le tick suivant si cette échéance est dépassée.

Il n’y a ni production hors ligne, ni synchronisation entre onglets/appareils,
ni compte cloud. Deux onglets peuvent écrire la même clé sans coordination.
Changer d’hôte, de protocole ou de port ouvre un autre espace localStorage.

## 3. Évolutions reconstituables

L'historique de base examiné va jusqu'à `b107133`. Il ne permet pas de dater
chaque itération de gameplay à l’intérieur du MVP : presque tout le jeu est
regroupé dans le commit MVP. Aucun échange de conversation n’est nécessaire
pour les constats ci-dessous, et aucune chronologie intermédiaire n’est inventée.

| Commit, date locale | Évolution attestée |
| --- | --- |
| `860d420`, 14/11/2026 à 23:40 | Socle React/Vite/TypeScript/PixiJS, scène de démonstration avec un cristal animé, nettoyage du ticker. Pas encore de moteur ni de jeu. |
| `729055c`, 14/11 à 23:47 | Configuration de l’hôte de développement `192.168.1.112`, port 8008 strict, documentation réseau. |
| `68758af`, 14/11 à 23:58 | Socle responsive, safe areas, adaptation du canvas et installation de Playwright. L’écran reste une démonstration PixiJS. |
| `57afe23`, 15/11 à 11:36 | Remplacement de la démo par le jeu : moteur, économie, interactions, persistance, habillage, documentation et tests. Publication du MVP ; `main` et `develop` pointent initialement dessus. |
| `35e147c`, 15/11 à 11:56 | Audit et corrections du renouvellement sans revenu et de la répétition d'effet d'une gemme déplacée. |
| `ec34a77`, 15/11 à 12:20 | Palettes visuelles par niveau, contrôles de contraste, tests mobiles et documentation. |
| `226f4b8`, 15/11 à 12:30 | Progression linéaire des récoltes et multiplicatrices, plafonds N12 et tests de fusion. |
| `b107133`, 15/11 à 12:31 | Amplification des écarts de couleur entre niveaux et contrôles de distance chromatique. |

Les arbitrages visibles par rapport au prompt original sont substantiels :

- Fréquence initialement suggérée à 2 s, désormais 5 s ; vitesse fixée à
  800 ms/case et absence de réglage joueur.
- Cases vides initialement bloquantes, désormais conductrices.
- Départ initialement productif, désormais grille entièrement vide.
- Achat initialement vers l’inventaire, désormais transaction directe à la pose ;
  réserve conservée dans les données mais masquée.
- Recyclage à 50 % et inflation séparée des achats/renouvellements, ajoutés aux
  mécanismes décrits initialement.
- Interface dans un seul écran, avec aide déportée dans une fenêtre paginée.
- Simulation vivante : rencontre des gemmes à l’arrivée, parcours conservés lors
  des manipulations, collisions anticipées et bulles chiffrées de taille fixe.

Les migrations et tests attestent une prise en charge d’anciens états sans
compteurs, avec vitesse réglable ou tarifs d’offres plus élevés. Ils ne permettent
pas de reconstruire l’ordre précis ni la date de ces versions intermédiaires.

Après cet audit, deux correctifs ont été demandés et ajoutés : refus du
renouvellement qui épuiserait le budget d’un circuit sans revenu, avec récolte
abordable garantie dans un tirage accepté ; mémorisation des gemmes activées par
branche pour empêcher la réutilisation économique d’une instance déplacée.
Les règles, l’aide et les scénarios de régression ont été mis à jour.
L'évolution suivante donne aux gemmes une palette propre à chacun des douze
niveaux. La modification locale actuelle remplace le catalogue non linéaire
par +1 à +12 et ×1,1 à ×2,2. Le barème des prix et la composition multiplicative
de la puissance lors des traversées restent ceux décrits dans ce document.
La branche feature prépare maintenant une vue épurée par défaut et une vue avancée
persistées, une inspection recouvrant la boutique, ainsi que des estimations et
prévisualisations sans transaction réelle. La fusion vers `develop` reste à valider.

Les régressions désormais protégées par les tests concernent notamment le double
débit, les pertes sur refus ou annulation tactile, le paiement avant dépôt, le
redémarrage des flux à la manipulation, les gains anticipés, les branches sœurs
détruites par une collision et la perte des compteurs au rechargement. Ces tests
prouvent le comportement actuel couvert ; ils ne prouvent pas à eux seuls que
chaque anomalie s’est historiquement produite.

## 4. Interface et direction artistique

### Organisation effective

Sur smartphone portrait : marque, icône œil de changement de vue, aide/paramètres,
solde, circuit, trois offres et renouvellement. La vue épurée, par défaut, masque
les statistiques, titres secondaires et confirmations textuelles. Les refus et
alertes restent signalés. La vue avancée ajoute dernier flux réel, rendement
théorique, puissances et nombres flottants. La grille occupe le même espace dans
les deux modes, dans `100dvh`. Il n'y a ni onglet de réserve ni moyenne récente.

En vue avancée, la sélection ouvre une fiche sur la boutique : fonction, niveau,
valeur, connexions, remboursement et contribution. Les contrôles recouverts sont
inertes et masqués aux technologies d'assistance ; fermeture et recyclage restent
accessibles. La grille n'est ni déplacée ni redimensionnée. Pendant un glisser,
le panneau s'efface pour les indications du geste. Le clavier conserve l'accès
au plateau après sélection d'une offre.

À partir de 48 rem de largeur, ou de 35 rem en paysage, le circuit passe à gauche
et l’économie/boutique à droite. La largeur maximale est 72 rem ; la présentation
portrait est limitée à 30 rem. Le plateau garde ses proportions 7/9, ses cases
pouvant rétrécir en dessous de 44 px. Les captures de l’audit montrent notamment
des cases d’environ 26 px en paysage 568 × 320 : tout tient, mais cela ne garantit
pas le confort du toucher.

Les boutons généraux visent 44 px. Les safe areas utilisent `env(...)` ; le canvas
est observé avec `ResizeObserver` et son DPR est plafonné à 2. Le zoom n’est pas
interdit dans la balise viewport. Les zones de gemmes déplaçables utilisent
cependant `touch-action: none` : le pincement commencé sur ces zones et son
comportement sur appareils réels restent à vérifier.

L’aide contient huit pages et se rouvre toujours à la première. Le champ
persisté `tutorial` et l’action associée ne pilotent pas cette aide : il ne
s’agit pas d’un tutoriel contextuel mémorisant les actions accomplies. Les
paramètres proposent choix de vue, animations réduites, pause et remise à zéro confirmée.
Ouvrir une fenêtre d’aide ou de paramètres ne met pas automatiquement en pause.

### Rendu et conformité

`GemView.tsx` génère la même silhouette cristalline facettée pour les deux
catégories. Les récoltes sont ambre/pêche, les multiplicatrices mauves ; les
attaches SVG champagne/gris chaud sont dérivées des connexions du catalogue.
Le plateau est sombre, discret, sans pistes électroniques décoratives.

Chaque niveau possède une nuance plus marquée : cuivre corail, ambre, or puis
champagne pour les récoltes ; indigo, améthyste puis orchidée claire pour les
multiplicatrices. `src/components/gemPalette.ts` calcule quatre couleurs HSL par
gemme : teinte de 12° à 54° pour les récoltes, de 246° à 306° pour les
multiplicatrices. La luminosité centrale progresse de 61 % à 85 % pour les récoltes,
de 68 % à 86 % pour les multiplicatrices. La saturation est renforcée et culmine
aux niveaux intermédiaires pour accentuer les écarts. Les facettes claires, intermédiaires et
sombres gardent leur relief. Les valeurs utilisent une encre sombre `#10131E`.
Le même composant applique ces couleurs dans la boutique, le fantôme et le plateau ;
elles évoluent à la fusion et sont retrouvées au chargement à partir du niveau.

Les couleurs de base reprennent exactement les tokens de la charte : fond
`#141C2B`, ardoise `#253247`, violet `#8B79A8`, mauve `#BDA5C4`, ambre `#E9B47D`,
champagne `#F4D6AE`, texte `#F1EDF2`. Les chiffres sont tabulaires, les bordures
fines et les coins modérément arrondis. Les captures portrait, paysage et réseau
en activité produites par les tests ont été examinées pendant l’audit.

La vue épurée utilise un éclat lumineux de **6 px de cœur**, halo ambre et courte
traînée, sans chiffre ni contour de bulle. La vue avancée utilise une bulle de
**18 px** entourée d'un halo, avec une valeur centrale. Les deux passent derrière
les SVG des gemmes, sans
changer de diamètre ni de durée de pas selon leur puissance. Au passage, la
gemme brille ; en vue avancée seulement, un gain ou facteur réel flotte pendant
**750 ms**. Une collision
bord/attache fermée produit six particules pendant **280 ms**, pour la seule
branche concernée. Les fins par boucle ou plafond de puissance n’utilisent pas
cet effet de collision.

La fusion utilise un bref effet CSS de luminosité/échelle de 450 ms. Les effets
continus utilisent le ticker PixiJS ; les labels sont des éléments DOM pilotés
par ce ticker. En réduction des animations, les bulles avancent par positions
de départ successives plutôt qu’en translation continue, les labels restent
fixes et opaques et les particules disparaissent. La préférence système et le
réglage du jeu sont combinés par un « ou ».

Les écarts ou réalisations partielles face à la charte sont :

- Police système (`Avenir Next`, `Segoe UI`, etc.), sans Manrope embarquée.
- Pas de grain minéral, décor de diorama, silhouettes atmosphériques ou ambiance
  sonore. La charte présente plusieurs de ces éléments comme suggestions.
- La progression chromatique est réalisée ; silhouette et nombre de facettes
  restent fixes, sans ornements ni halo propres aux niveaux élevés.
- Fusion plus simple que la convergence lumineuse et les particules envisagées.
- Taille et intensité de la bulle stables, plutôt qu’intensité liée à l’énergie ;
  la vitesse est une constante de code plutôt qu’une option accessible.
- Informations secondaires très petites et statut limité à deux lignes ; la fiche
  avancée privilégie les flèches pour les connexions. Le confort matériel reste à éprouver.

### Mesure du rendement

`src/game/analysis.ts` utilise le moteur pur pour une nouvelle émission sur un
plateau fixe. Le rendement théorique vaut `gain / 5` Éclats/s, à cadence nominale,
y compris en pause. Il n'inclut ni les parcours déjà en cours, ni les futures
manipulations. « Dernier flux réel » reste la dernière émission effectivement
terminée, avec son histoire de manipulations ; avant la première fin, il affiche
un tiret. Ces deux indicateurs sont réservés à la vue avancée.

La contribution d'une gemme est `(gain du plateau − gain avec sa case vide) / 5`,
routage inclus. Une gemme bloquante peut donc avoir un impact négatif. Ces impacts
ne sont pas des parts additives de la production totale. Une offre non posée
n'a pas encore de contribution à une case donnée.

Le glisser, le survol après sélection et les flèches du clavier affichent le
rendement après pose et son écart avant validation. Le recyclage glissé possède
aussi un aperçu. Les transactions candidates réutilisent les validations réelles,
puis sont jetées : solde, offres, graine, statistiques et flux réels restent
inchangés. Les calculs sont mémorisés selon les données ; aucun calcul de
production ne s'exécute dans les animations.

Une estimation tronquée par les limites affiche `≥` et « Estimation partielle ».
Les contributions/différences qui compareraient des résultats limités sont
indisponibles. Les taux utilisent jusqu'à six décimales et abrègent les grands nombres.

## 5. Architecture technique et dettes

Versions installées relevées dans `package-lock.json` : React/React DOM 19.3.1,
PixiJS 8.23.0, Vite 8.3.8, TypeScript 7.0.2, Vitest 5.1.0 et Playwright 1.65.1.
Le projet utilise npm, des modules ES et TypeScript strict. Node 22.12+ est demandé ;
les validations de cet audit tournent sur Node 22.22.1, npm 9.2.0.

| Zone | Responsabilité |
| --- | --- |
| `src/game/types.ts`, `catalog.ts` | Modèles, valeurs, attaches, plafonds, prix et formats numériques. |
| `economy.ts`, `fusion.ts`, `state.ts` | Tirages reproductibles, fusion et transactions pures. |
| `engine.ts` | Création/avancement des émissions, collisions, branches et événements. `simulateEmission` utilise le même moteur pour une prévision sur plateau fixe. |
| `runtime.ts` | Ordonnancement chronologique, émissions simultanées, application unique des gains, actions sur la session. |
| `analysis.ts` | Prévisions de plateau fixe, contributions marginales et aperçus sans effet sur l'état réel. |
| `save.ts`, `useGame.ts` | Validation/migration et localStorage ; liaison à React, minuterie de simulation et suspension. |
| `src/App.tsx`, `src/components/` | Interface HTML accessible, gemmes SVG, sélection, glisser et fenêtres. |
| `src/components/gemPalette.ts` | Progression visuelle des teintes et facettes sur les douze niveaux, indépendante de l'économie. |
| `src/pixi/createFlowScene.ts`, `pulseVisuals.ts` | Animation des événements, bulles, halos, labels et éclatements. |
| `src/index.css`, `src/App.css` | Tokens et styles, disposition responsive, couches graphiques. |
| `vitest.config.ts`, `playwright.config.ts` | Tests purs Node et scénarios navigateur sur serveur de test distinct. |

L’état durable `GameState` est distinct de la session transitoire : parcours,
échéance d’émission et notices ne sont pas tous persistés. Un reducer reçoit les
actions ; un intervalle de 25 ms vérifie les échéances et ne modifie pas l’état
quand rien n’est dû. Le mouvement entre échéances dépend du ticker PixiJS, sans
état React à chaque image. Le déplacement du fantôme utilise en revanche l’état
React sur les événements de pointeur.

Le canvas est chargé paresseusement. PixiJS nettoie ticker, graphismes, couches
DOM et observation au démontage, avec prise en compte de l’initialisation
asynchrone et de StrictMode. Une erreur d’initialisation prévoit un message et
laisse le moteur indépendant ; ce repli sans WebGL n’a pas été forcé durant l’audit.

Les dettes les plus concrètes sont la double surface d’opérations active/dormante
pour la réserve et le tutoriel, le couplage du rendu à des classes DOM et propriétés
CSS impératives, les constantes numériques de dimensions répétées à certains
endroits, et l’absence de tests de performance ou de matrice multi-navigateurs.
Les fonctions sont compactes ; modifier les règles temporelles demande de
préserver explicitement l’ordre des arrivées, des transactions et des collisions.

Le dépôt ne contient pas de workflow CI ni de PWA/service worker. GitHub héberge
le code, sans configuration de publication web dans ce dépôt. Le serveur de
développement écoute une IP LAN codée dans `vite.config.ts` et échouera sur une
machine qui ne possède pas cette IP, sauf surcharge de l’hôte. Le README explique
le lancement local ; aucune disponibilité réseau depuis un téléphone n’est
retestée dans cet audit.

## 6. Vérifications et qualité

### Résultats exécutés pendant cet audit

| Vérification | Résultat constaté le 15/11/2026 |
| --- | --- |
| `npm run check` | Réussi : Oxlint, 149 tests Vitest, compilation TypeScript et build Vite. |
| `npm run test:mobile` | 70 scénarios Chromium : 59 régressions existantes, 10 scénarios terrain et 1 correctif de précision ; relances ciblées des scénarios concernés après chaque ajout. |
| `npm run test:mobile -- tests/mobile/layout.spec.ts` | 12 scénarios dont les dix pages d'aide et les paramètres en paysage. |
| `npm run test:mobile -- tests/mobile/palette.spec.ts` | 3 scénarios après amplification des palettes : contraste, distances de couleur, portrait/paysage, glisser, fusion et rechargement. |
| Examen des captures | Captures initiales : grille neuve, paysage et réseau vivant. Puis palettes des 24 gemmes en portrait 390 × 844 et paysage 568 × 320. |
| Sondes initiales, puis tests de régression | Les deux problèmes initiaux ont été reproduits, corrigés puis couverts par des assertions moteur et navigateur. |

Les tests produisent des artefacts ignorés dans `test-results/` et le build dans
`dist/`. Après les deux corrections et leur explication dans l'aide, les dernières
modifications portent sur les rochers, l'excavation et les minéraux.
Le build produit notamment deux chunks d'environ 256 et 261 ko avant compression
(environ 81 et 77 ko gzip), plus les chunks partagés ; ce n’est pas une mesure
du téléchargement total ni des performances d’un mobile.

### Couverture fonctionnelle inventoriée

| Fichier | Cas exécutés | Ce qu’ils vérifient principalement |
| --- | --- | --- |
| `src/game/game.test.ts` | 78 | Propagation, sertissages, référence à 22, fusion et économie ; onze paliers linéaires par catégorie, plafonds +12/×2,2, restauration des niveaux avec le nouveau catalogue, horloge et dix minutes simulées. |
| `src/game/balance.test.ts` | 20 | Paliers, compteurs, remboursements, migrations ; refus du renouvellement bloquant, six graines avec budget limité/niveaux débloqués, circuit productif, récolte hors trajet et inflation. |
| `src/game/live.test.ts` | 15 | Propagation vivante, conservation des flux, suspension ; effet non répété d’une récolte/multiplicatrice déplacée, héritage indépendant des activations et réactivation à l’émission suivante. |
| `src/game/impacts.test.ts` | 7 | Puissance composée/affichage ; collisions au contact ; branches sœurs ; obstacle ajouté, déplacé ou posé après une arrivée. |
| `src/game/analysis.test.ts` | 10 | Taux du plateau fixe, contributions positives/négatives et bifurcations, aperçus et refus, limites, migration du mode et conservation des parcours/gains. |
| `src/game/terrain.test.ts` | 19 | Départ productif sur cinq graines, outils aléatoires, transactions, découvertes, migrations, collisions, excavation avant/après contact sans réinitialisation et feedback transitoire après validation seulement. |
| `tests/mobile/terrain.spec.ts` | 10 | Pioche tactile/clavier, refus et annulation, collection portrait/paysage, grille fixe, collision pierre, migration, débris animés et flash réduit sans rejeu. |
| `tests/mobile/layout.spec.ts` | 12 | Neuf tailles, redimensionnement, insets simulés, dix pages d’aide et paramètres en paysage, absence d’interdiction du zoom. |
| `tests/mobile/gameplay.spec.ts` | 12 | Achat à la pose, fusion, souris/tactile/clavier, sauvegarde, effets réels, reset confirmé, mode réduit, réserve historique et erreurs de stockage. |
| `tests/mobile/balance.spec.ts` | 7 | Renouvellement sauvegardé puis refus sans perte, achat encore possible ; recyclage et annulation, palier et remboursement après fusion. |
| `tests/mobile/live.spec.ts` | 7 | Bulles, pose/déplacement, taille/vitesse/arrondi, couches, collisions ; absence de répétition d’effet après deux déplacements de la même récolte ou multiplicatrice. |
| `tests/mobile/palette.spec.ts` | 3 | 24 palettes distinctes, luminosité croissante, contraste d'au moins 4,5:1 ; distances CIELAB ≥3 entre voisins et ≥40 entre N1/N12 ; portrait/paysage, glisser, fusion et persistance. |
| `tests/mobile/fusion.spec.ts` | 2 | Pour chaque catégorie : fusion au quatrième niveau sans saut, achat avec fusion, plafond N12, refus sans perte et sauvegarde/rechargement. |
| `tests/mobile/advanced.spec.ts` | 17 | Modes et persistance, éclat/bulle sur la même impulsion, distinction des rendements, précision principale et détails, inspection et clavier, aperçus souris/tactile, annulation, limites et superposition sans mouvement de grille sur neuf formats. |

Les neuf viewports sont 320 × 568, 360 × 640, 390 × 664, 390 × 844,
412 × 915, 568 × 320, 844 × 390, 768 × 1024 et 1280 × 800. Les contrôles de mise
en page vérifient le canvas, les 63 cases, les offres dans le viewport et
l’absence de défilement de page/plateau sur ces formats.

Le cas de référence `+2 → ×2 en T → deux +5` donne bien
`2 + 2 × 5 + 2 × 5 = 22 Éclats`. Un autre cas prouve que placer `×2` avant
`+5` produit 10, contre 5 dans l’ordre inverse.

Les sondes initiales avaient établi : quatre renouvellements sans achat donnaient
**4 Éclats, aucune production et aucune offre abordable** ; une seule récolte
`+1`, déplacée devant chaque arrivée, rapportait **7 dans la première émission**.

Les régressions automatisées vérifient désormais que le quatrième renouvellement
est refusé avec **12 Éclats conservés**, offres/graine/compteur inchangés, et qu’une
récolte reste achetable. La même gemme déplacée ne produit plus qu’un effet par
branche. La branche continue, la puissance acquise reste conservée et l’émission
suivante peut activer à nouveau cette gemme. Les tests antérieurs de croisements
et de facteurs composés entre instances différentes continuent à passer.

### Ce que ces résultats ne démontrent pas

Il n’y a pas de mesure de couverture de lignes/branches ni de benchmark FPS,
mémoire, batterie ou session prolongée sur matériel réel. Les dix minutes sont
du temps simulé sur une fixture productive, pas une partie humaine complète.
Les budgets extrêmes sont testés, sans validation du confort d’un réseau dense.

Chromium émule le tactile et les dimensions ; cela ne teste pas Safari/iOS,
Firefox ni un appareil Android réel. Le test « zoom » contrôle la balise viewport
et `touch-action` du canvas, pas un véritable pincement. Les safe areas sont
partiellement simulées par du padding. Taille de police système agrandie,
lecteur d’écran, contraste global de l'interface, pression imprécise, gros nombres et plateau
entièrement rempli restent à éprouver.

À valider manuellement : démarrage sans aide, première bifurcation, compréhension
des fusions, session de 20–30 minutes, paysage court, accident de glisser hors
grille, reprise après verrouillage du téléphone et lisibilité de plusieurs flux
simultanés. La fluidité 60 FPS et le repli sans WebGL ne sont pas établis.

## 7. Problèmes et limitations, par impact

Les deux problèmes initiaux sont **corrigés localement et couverts par les tests** :
blocage dû aux renouvellements sans revenu et répétition d’effet en déplaçant une
instance devant la même branche. Cette prévention ne recrédite pas rétroactivement
les anciennes parties déjà ruinées ; ce n’est pas une protection générale contre
tout choix d’achat ou recyclage défavorable.

La gravité ci-dessous concerne les limites restantes. Une décision
volontaire peut avoir un impact important sans constituer un bug technique.

| Gravité | Constat et niveau de preuve | Impact |
| --- | --- | --- |
| **Moyenne — arbitrage économique démontré** | La fusion peut diminuer le rendement de deux pièces conservées en série. Exemple `+2 + +2 → +3`, et `×1,1 × ×1,1 → ×1,2`. | Risque de déception si la fusion est présentée comme une amélioration automatique. Son intérêt vient surtout de la place libérée et de certains contextes de routage. |
| **Moyenne — choix observable** | Cases sous 44 px sur écrans courts ; petits textes, bulle de 18 px et police centrale réduite pour les grands nombres. Capture paysage : cases proches de 26 px. | Précision tactile et lisibilité incertaines malgré l’absence de scroll. Aucun essai matériel ne les valide. |
| **Moyenne — compatibilité fonctionnelle** | Réserve historique sauvegardée mais inaccessible ; elle participe encore au calcul du niveau maximal possédé. Lecture du code et test de conservation. | Des objets d’anciens joueurs restent inutilisables, tout en influençant les offres. Leur devenir doit être explicité avant une diffusion élargie. |
| **Moyenne — robustesse de progression** | Pas de sauvegarde de secours, export ou coordination multi-onglets ; donnée invalide remplacée et ensuite sauvegardée. Lecture du code. | Une corruption ou un changement d’origine peut être perçu comme une perte ; plusieurs onglets peuvent s’écraser mutuellement. |
| **Moyenne — accompagnement partiel** | Aide paginée non contextuelle et pas de moyenne affichée. L'inspection existe en vue avancée ; le statut reste tronqué et `loadWarning` prioritaire jusqu'au rechargement. | Le confort de la fiche et la compréhension du rendement nominal restent à valider humainement. Une alerte initiale peut masquer les retours suivants. |
| **Moyenne sur réseaux denses — limite certaine, gêne non mesurée** | Budgets visuels qui omettent des effets ; arrêt global à 4 096 événements. Pas de profil matériel. | Des gains peuvent être difficiles à relier aux effets visibles. Les réseaux très ramifiés peuvent être tronqués avec une alerte peu explicative. |
| **Faible à moyenne — approximation graphique** | Contact logique fixé à 35 % d’un pas, sans dépendre du diamètre 6/18 px ni du contour SVG. Lecture du code. | L’éclatement n’est pas garanti au contact géométrique exact pour toutes les tailles ; le temps de collision reste identique entre les vues. |
| **Faible — cohérence de reprise** | Pause manuelle et suspension d’onglet n’ont pas exactement la même gestion d’échéance ; les flux non terminés sont abandonnés. Lecture du code et tests de suspension. | Cadence de reprise et dernier flux parfois difficiles à interpréter ; les récoltes déjà perçues restent acquises. |
| **Faible — portabilité et livraison** | IP de développement fixe, version package `0.0.0`, absence de CI et de configuration de publication. Lecture du dépôt. | Le code est partagé, mais l’installation sur une autre machine et une livraison reproductible demandent une procédure explicite. |

Aucun échec n’a été observé dans les suites relancées. Cela ne suffit pas à
écarter d’autres anomalies, ni à valider l’équilibrage de moyen/long terme.

## 8. Avancement face à la vision initiale

| Prévision initiale | État réel | Qualification |
| --- | --- | --- |
| Grille 7 × 9, source extérieure centrale | Présentes | Réalisé. |
| Récoltes non directionnelles, multiplicatrices serties, pas de rotation | Présentes et testées | Réalisé ; fondamentaux préservés. |
| Lignes, coudes, T et croix bidirectionnels | Onze variantes | Réalisé. |
| Duplication entière, croisements, boucles bornées | Présents et testés | Réalisé, avec budgets explicites. |
| Vide bloquant, fréquence suggérée 2 s | Vide conducteur, fréquence 5 s, pas de 800 ms | Règles volontairement remplacées par les règles actuelles. |
| Départ déjà productif | Sans gemmes, 18 rochers et 30 Éclats ; passage central libre | Arbitrage opposé au prompt initial ; onboarding à réévaluer. |
| Boutique → inventaire et réserve visible | Boutique → plateau atomique ; réserve dormante | Parcours remplacé ; données/opérations historiques conservées. |
| Fusion stricte entre toutes zones | Complète dans le moteur ; parcours actifs plateau et boutique | Partiel côté interface pour la réserve. |
| Progression des valeurs configurable | +1 par fusion pour les récoltes, +0,1 pour les facteurs ; douze niveaux | Catalogue initial remplacé par la progression linéaire demandée. |
| Tutoriel contextuel, progression mémorisée | Aide facultative de dix pages ; champ historique non utilisé | Partiel. |
| Fiche concise et indicateurs réels | Inspection avancée, dernier flux réel, rendement théorique et aperçus | Intégré à develop ; moyenne récente toujours non affichée. |
| Espace constructible et minéraux | Rochers bloquants, pioche aléatoire et quatre minéraux sans bonus | Réalisé sur la nouvelle branche feature ; équilibrage humain à valider. |
| Gemmes évoluant visuellement avec leur niveau | Nuances et luminosité progressives sur douze niveaux ; silhouette et attaches stables | Progression chromatique réalisée ; ornements et halos de niveau non ajoutés. |
| Simulation pure, calculs indépendants des animations | Moteur, runtime et rendu séparés | Réalisé ; le plateau reste vivant pendant les flux. |
| Sauvegarde versionnée, pas de gains hors ligne | Présente avec migrations locales | Réalisé ; parcours transitoires non conservés. |
| Jeu mobile confortable, cible de fluidité | Mise en page testée sous Chromium, confort réel non mesuré | Partiel jusqu’aux essais matériels et humains. |
| Exemple à 22, tests obligatoires, session de dix minutes | Exemple et tests réussis ; dix minutes simulées | Validation logique réalisée ; acceptation humaine encore ouverte. |
| Recycler et augmenter les tarifs au fil du jeu | Remboursement historique et deux compteurs séparés | Enrichissements du périmètre initial. |
| Protection de départ et activation économique d’une instance | Budget/récolte de secours au renouvellement sans revenu ; une activation par branche | Corrections ajoutées après l’audit initial. |

Restent volontairement hors du périmètre initial : rotations/modification des
attaches, plusieurs plateaux, combats, personnages, prestige, monétisation,
comptes/backend, multijoueur/classements, énergies élémentaires multiples,
gemmes multi-cases, pièces de routage indépendantes et quêtes complexes. Leur
absence ne constitue pas un retard de la V0.1. La PWA et une éventuelle intégration
Android sont des perspectives ; elles ne sont pas implémentées. Le son est
également absent, bien qu’évoqué comme orientation complémentaire par la charte.

Il n’est pas possible de donner un pourcentage d’achèvement pertinent sans
pondérer ces arbitrages et définir les critères d’acceptation du MVP actuel.

## 9. Analyse critique du gameplay

### Routage et optimisation

**Faits démontrés :** l’ordre des gemmes change la production, les T et croix
dupliquent la puissance, chaque variante impose des contraintes réelles et le
joueur peut faire récolter une même gemme par plusieurs branches indépendantes.
La répétition par déplacement dans une même branche est désormais neutralisée. L’exemple à 22 et
les tests de croisements établissent une profondeur combinatoire réelle.

**Conséquence déduite des règles :** amplifier avant une bifurcation bénéficie
à toutes les branches, et placer des récoltes après plusieurs amplifications
augmente leur gain. Un T ou une croix est toutefois inutile si ses sorties ne
peuvent pas conduire vers des récoltes intéressantes.

**Hypothèses à tester :** le vide conducteur peut faciliter les réseaux aérés
et la découverte, mais réduit la nécessité de construire une chaîne contiguë.
La duplication entière peut rendre les réseaux très ramifiés dominants. La
recherche du bon sertissage peut être plaisante ou devenir une attente de tirage.
Aucune mesure humaine ou recherche systématique d’optimum ne tranche ces points.

### Fusion et économie

**Faits calculables :** la fusion libère de l’espace, augmente la valeur d’un
objet, mais ne domine pas deux objets séparés. Deux `+1` et un `+2` produisent
autant à puissance égale ; aux niveaux suivants, garder les deux récoltes peut
produire davantage. Deux multiplicatrices identiques en série produisent un
facteur composé supérieur au facteur fusionné suivant dans le catalogue actuel.

Un premier `+1` à 6 rapporte 1 par émission, donc rembourse son achat en six
passages productifs, soit environ 30 secondes de cadence à 5 secondes, hors
latence de mise en route. Une première ligne `×1,1` à 10, placée avant une seule
`+1`, n’ajoute que 0,1 par émission : son amortissement marginal demande 100
passages, soit environ 500 secondes de cadence. D’autres récoltes ou branches
en aval peuvent fortement réduire ce délai. Ce sont des comparaisons théoriques
sur circuit fixe, pas des durées de progression observées chez un joueur.

**Risques déduits :** l’inflation des achats et renouvellements est permanente,
les achats hauts niveaux ne dépassent pas N4 et trouver des doubles de même
sertissage ajoute une contrainte. Sans jalons ou protection contre la malchance,
la montée vers N12 peut devenir longue ou répétitive. À l’inverse, duplication
et amplification composée peuvent faire croître les gains jusqu’aux plafonds.
Le temps pour y parvenir, la fréquence des stagnations et l’intérêt durable
des fusions ne sont pas mesurés.

### Lisibilité et rythme

**Faits vérifiés :** gains/facteurs flottants issus du moteur, brillance locale,
achat atomique, surbrillance de doubles et retour de recyclage rendent les actions
observables. La vitesse de 800 ms permet plusieurs interventions pendant un flux.
Le dernier flux ne représente pas un revenu instantané par seconde et peut rester
à zéro alors qu’une première récolte vient déjà d’augmenter le solde.

**Décision appliquée après audit :** une gemme déjà activée par une branche ne
récolte ou n’amplifie plus cette branche après déplacement. Le placement de pièces
encore non activées et les modifications de routage restent possibles pendant
le passage. Leur intérêt et leur agrément sur smartphone demandent des essais humains.

**Hypothèses :** grille vide, première attente et faible gain initial peuvent
ralentir la découverte ; de nombreux nombres simultanés ou très petits peuvent
au contraire surcharger la lecture plus tard. L’audit ne mesure ni rétention,
ni satisfaction, ni progression moyenne.

## 10. Évolutions envisageables et décisions à préparer

Les propositions suivantes restent à discuter ; elles sont distinctes des deux
corrections déjà réalisées.

### Court terme : sécuriser l’expérience existante

1. Vérifier l’accompagnement de départ avec la protection de renouvellement
   désormais présente ; définir le traitement souhaité pour les anciennes parties
   déjà bloquées et les autres décisions économiques irréversibles.
2. Clarifier les arbitrages de fusion et le sens de « Dernier flux », rendre les
   avertissements/descriptions consultables, et préciser le sort des réserves
   historiques. Conserver les règles actuelles tant que la décision n’est pas prise.
3. Organiser des essais iOS/Android réels : toucher en paysage, recyclage
   accidentel, zoom, reprise, réseaux denses et gros nombres. Mesurer avant de
   retoucher le compromis entre écran unique, taille des cases et lisibilité.

### Moyen terme : qualifier profondeur et progression

1. Comparer quelques circuits et trajectoires de progression reproductibles
   pour étudier rendement, coût de fusion, accès aux sertissages et dépense en
   renouvellements ; décider des ajustements à partir de ces résultats.
2. Définir explicitement la place de la manipulation pendant les flux. Évaluer
   réseau stable et jeu actif avant d’ajouter contraintes ou récompenses.
3. Compléter l’accompagnement contextuel et les indicateurs utiles, puis examiner
   export de sauvegarde et PWA si les usages réels justifient ces investissements.

### Long terme : développer le concept sans diluer son cœur

1. Étendre le catalogue ou proposer des variantes de circuits limitées et
   comparables, en conservant l’identité des sertissages fixes.
2. Donner des objectifs de maîtrise de l’optimisation si le jeu ouvert montre
   une stagnation, sans introduire d’emblée prestige ou systèmes de quêtes complexes.
3. Renforcer progressivement le diorama, le son et les événements visuels rares,
   après validation de la lisibilité et du budget de performance sur mobile.

Les décisions prioritaires pour la prochaine revue sont la valeur stratégique
de la fusion, l’accompagnement des choix économiques, le confort des interventions
sur un circuit vivant et les critères matériels/humains d’acceptation. Les deux
régressions signalées sont corrigées ; les autres limites restent à arbitrer.
