# Règles de la version jouable

## Circuit

Une source extérieure à gauche de la ligne 5 émet une puissance de 1 toutes les
5 secondes. Le plateau commence en 7×9 et peut atteindre 35×9. Une case vide laisse le
flux continuer tout droit, sans gain ni amplification. Un rocher, une connectique fermée
ou le bord termine une branche.

Une récolte **+v** accepte les quatre directions, rapporte
`énergie entrante × v` Éclats et laisse le flux continuer tout droit,
sans consommer ni amplifier l'énergie.

Une **gemme majeure** est une récolte rare occupant exactement **2×2 cases**.
Son niveau N vaut `4 × N` : +4, +8, +12… +48 à N12. Deux majeures de même
niveau fusionnent en ajoutant exactement +4 ; une récolte classique ne fusionne
jamais avec une majeure. Le résultat conserve son empreinte 2×2.
La traversée horizontale ou verticale reste rectiligne et conserve la puissance.
L'identité unique limite la récolte à une fois par branche, même si deux cellules
sont traversées ou si la branche revient par une autre face. Des branches
indépendantes récoltent séparément la même majeure.

Le plateau stocke **un seul objet à son ancre haute gauche**. Les trois autres
cases sont nulles dans la sauvegarde ; leur occupation est dérivée par
`src/game/board.ts`, partagé par moteur, transactions, inspection et rendu.
Une case couverte n'est jamais disponible. Les quatre cellules de destination
doivent exister, être libres et sans rocher. Un déplacement peut recouvrir
l'ancienne empreinte de la même gemme. Un dépôt sur un quartier d'une majeure
compatible fusionne à l'ancre de la cible. Sélection, recyclage et contribution
depuis un quartier concernent l'objet entier. Les manipulations conservent
les impulsions et leurs activations déjà acquises.

Une majeure se stocke dans **une** place d'inventaire, même sans empreinte libre
sur le plateau. Le rendu utilise un seul cristal facetté chaud sur quatre cases,
avec marque ✦, sans attaches ni effet permanent supplémentaire.

Une multiplicatrice **×v** accepte seulement les côtés munis d'attaches.
Elle multiplie l'énergie et envoie cette puissance entière vers chaque autre
attache. Les connectiques sont bidirectionnelles, sans retour immédiat par
l'entrée. Une multiplicatrice ne produit pas directement de monnaie.

Une même instance de gemme ne récolte ou n'amplifie qu'une fois par branche.
Déplacer une gemme déjà traversée devant cette branche ne réactive pas son effet :
une récolte laisse passer sans gain et une multiplicatrice conserve son routage
sans nouvelle amplification. Les branches filles héritent des activations de leur
ascendance, avec leurs propres historiques. Les branches indépendantes peuvent
activer une même gemme qu'elles n'ont pas encore traversée ; chaque nouvelle
émission repart avec un historique vide.

Les sertissages disponibles sont deux lignes, quatre coudes, quatre T et une
croix. Ce sont onze variantes fixes : aucune rotation ni modification des
attaches n'est disponible.

Deux branches qui se croisent restent indépendantes. Une branche s'arrête
lorsqu'elle retrouve la même cellule avec la même direction d'arrivée dans son
propre historique. La limite globale d'événements est 4096, la puissance
maximale par branche 10¹² et le solde maximal 10¹⁵. Une alerte signale une limite
exceptionnelle ; les effets peuvent être simplifiés sans changer les gains.
Une limite précise sa cause : événements, puissance, monnaie ou entrée invalide.
Le flux réel concerné est identifié ; une édition du plateau retire l'ancienne
alerte. La prévision du plateau courant reste indépendante et signale sa cause
dans ses détails. Le budget est global par émission, pas par branche. Il borne
la croissance exponentielle des chemins malgré une détection des boucles correcte.

## Extensions et caméra

Chaque achat ajoute sept colonnes à droite, sans augmenter les neuf lignes :
7 → 14 → 21 → 28 → 35 colonnes. `WORLD_RULES` dans `world.ts` fixe le palier,
la limite initiale de 35, le prix initial de 100 et sa progression ×2 :
**100, 200, 400, 800 Éclats**. Un achat refusé ne change rien. Les prix des gemmes,
les compteurs d'achats/renouvellements et les tirages ne sont pas affectés.

Les 63 cellules d'une extension sont toutes rocheuses, contrairement au passage
libre du terrain initial. Aucun besoin de finir une zone avant d'en acheter une
autre : excavation libre dans tout le territoire débloqué, avec les mêmes outils,
probabilités de gemmes, majeures et minéraux. Aucune nouvelle récompense ni bonus.

La transaction préserve les coordonnées monde des anciennes cellules, objets
et rochers, remappe leurs index par ligne vers la nouvelle largeur et ne modifie
ni leurs identités ni les inventaires. Les vagues, puissances et activations en
cours continuent ; les états déjà visités ne dépendent pas de la largeur.
La règle de collision au contact vaut aussi à l'ancienne frontière : une branche
déjà terminée ne ressuscite pas ; creuser avant contact peut laisser passer.

La caméra locale montre environ sept colonnes, avec des cellules de même taille
avant/après achat. Un balayage tactile ou glisser souris sur vide/pierre déplace
la caméra ; un glisser sur une gemme déplace l'objet. Molette et trackpad sont
acceptés. Le bord pendant un glisser déclenche l'autodéfilement via le ticker
PixiJS ; le dépôt est recalculé sous le pointeur avec le décalage de caméra.
Les flèches du clavier rendent la destination visible. ↤ revient à la source ;
le compteur discret indique la fenêtre actuelle et la largeur débloquée.

Le monde entier est simulé, caméra indépendante : hors écran, les impulsions
continuent et les gains sont crédités. Le canvas garde la taille de la fenêtre.
Les décors SVG éloignés et effets hors champ sont omis. Les boutons de cellules
restent présents pour le clavier (315 au maximum actuel).

Les majeures peuvent traverser la frontière de deux zones débloquées. Les quatre
cellules doivent rester libres et sans pierre ; une empreinte ne peut déborder
du territoire acheté. Fusion, recyclage, contribution et aperçu concernent
l'objet entier, quel que soit le décalage de caméra.

## Terrain et minéraux

Une nouvelle partie possède 18 rochers, répartis à partir de la graine de partie.
La colonne d'entrée de la source et les trois lignes centrales restent libres.
Les cases de pierre refusent achats et déplacements de gemmes ; les rochers ne
se déplacent pas, ne fusionnent pas et bloquent réellement les impulsions au contact.

La pioche apparaît aléatoirement en boutique : 20 % des tirages tant qu'il reste
des rochers. Les trois offres de départ restent les gemmes de démarrage.
La pioche coûte 8 Éclats fixes et se consomme directement sur une pierre, par
glisser ou sélection puis destination. Paiement, retrait du rocher et remplacement
de l'offre sont atomiques. Une pose refusée, annulée ou périmée ne change rien.
L'outil n'entre jamais en réserve ou sur le plateau et ne compte pas dans les
achats de gemmes. Au dernier rocher, les autres outils proposés sont remplacés.
Sans revenu du circuit, l'excavation doit laisser le prix courant d'une récolte N1.

Chaque excavation a 25 % de chance de révéler un minéral, avec une découverte
garantie toutes les quatre excavations. Les espèces encore absentes sont
prioritaires : Quartz rose, Fluorite, Pyrite et Azurite. Après les quatre espèces,
les doublons augmentent leurs quantités. Aucun bonus ni revenu n'y est attaché.
Le hasard d'excavation est séparé de celui des offres et sauvegardé. Un aperçu
n'avance aucun tirage réel et ne révèle pas de trouvaille. La collection s'ouvre
via le cristal du bandeau ; une découverte s'annonce brièvement sur l'en-tête de
boutique, sans déplacer la grille ni couvrir les offres.

Creuser avant le contact laisse continuer la branche déjà partie. Après le
contact, une branche éclatée reste terminée. Les autres branches ne sont pas
interrompues. Théorie, contribution et aperçus tiennent compte des rochers actuels.

Une excavation validée déclenche neuf fragments, cinq nuages de poussière et un
halo bref sur la case libérée pendant 700 ms. Les tailles suivent les cases et
les effets sont confinés au plateau. En mode réduit, seul un flash fixe de
250 ms subsiste. Ce feedback fonctionne dans les deux vues et en pause ; il est
piloté par le ticker PixiJS, sans état React à chaque image, sans monnaie ni
recalcul des flux. Les effets simultanés sont bornés, nettoyés au démontage et
jamais restaurés avec une sauvegarde. Un achat refusé ne déclenche aucun effet.

Les sauvegardes antérieures sans terrain sont migrées avec des cases libres,
sans obstacle ajouté sous les gemmes. L'ancien champ d'offre `gem` devient `item` ;
la progression est conservée. Seule une nouvelle partie introduit les rochers.

## Achats et fusions

Une nouvelle partie possède une grille sans gemmes et 30 Éclats. Le joueur glisse
une offre de la boutique vers une case vide du plateau pour acheter. Le paiement,
la pose et le remplacement de l'offre constituent une seule transaction. Un
dépôt annulé, incompatible, périmé ou sans fonds ne coûte rien. Une offre peut
être posée sur un double compatible : l'achat fusionne directement les gemmes.
Renouveler change les trois offres. Le premier renouvellement coûte 5 Éclats,
le deuxième 6, puis 7, etc. Son compteur propre augmente seulement après un
renouvellement réussi et reste sauvegardé ; un refus faute de fonds ne coûte rien.

Si une émission sur le plateau actuel ne produit aucun Éclat, le renouvellement
doit laisser de quoi acheter une récolte de niveau 1 au tarif courant, inflation
incluse. Sinon il est refusé sans aucun changement. Un tirage accepté dans cette
situation conserve au moins une récolte abordable : à défaut, sa première offre
est remplacée par une récolte de niveau 1, sans changer les identifiants ni ajouter
de tirage. Un circuit déjà productif n'a pas cette restriction de budget.

Chaque groupe de **5 achats réussis**, y compris les achats avec fusion,
augmente de **1 Éclat** le prix des gemmes. Le compteur d'achats est sauvegardé ;
les offres coûtent leur prix catalogue plus `floor(achats / 5)`. Le palier est
configurable dans le catalogue. Un achat refusé, un renouvellement,
un déplacement, une fusion entre gemmes possédées ou un recyclage ne modifie pas
ce compteur. Recycler ne fait donc pas redescendre les prix.

Glisser une gemme possédée hors du plateau la détruit et rembourse **50 % du
montant payé**, sans compter ce remboursement comme de la production du circuit.
L'interface annonce le montant avant de relâcher. Un bouton après sélection offre
la même action au clavier. Un geste annulé ou une tentative de fusion incompatible
sur le plateau conserve la gemme. Les offres non achetées ne sont pas recyclables.

Une fusion additionne les coûts d'achat des deux gemmes. Le remboursement est
donc la moitié de l'investissement total, sans réévaluer les gemmes à cause de
l'inflation. Les anciennes gemmes sans coût enregistré utilisent le prix catalogue
comme valeur initiale ; leurs données et leur solde restent conservés.

L'inventaire de douze places est actif. Deux pages de six emplacements gardent
les cibles de 44 px en portrait comme en paysage. Il remplace visuellement les
offres dans la même zone, sans déplacer la grille. Les transferts et fusions
fonctionnent dans les deux sens, ainsi qu'entre deux places d'inventaire.
Les achats peuvent viser un emplacement vide ou un double compatible de
l'inventaire. Un emplacement occupé incompatible n'est jamais écrasé ; un
inventaire plein n'empêche pas un achat directement sur le plateau.

La table `EXCAVATION_REWARDS` dans `src/game/rewards.ts` définit des poids relatifs :
68 rien, 20 récolte classique N1, 8 multiplicatrice classique N1 (sertissage
fixe tiré au sort), 2 récolte rare N1, 2 majeure rare N1. Les majeures sont obtenues
uniquement par excavation ; la génération de boutique reste classique.
Le tirage est indépendant de la collection
de minéraux, sans nouveau système d'album ni bonus passif. Les trouvailles sont
stockées dans la première place libre et ne font pas augmenter les tarifs.
Leur investissement est nul ; les fusions additionnent toujours les coûts réels.
Si le tirage donne une gemme mais que les douze places sont pleines, toute
l'excavation est refusée sans paiement, retrait de pierre, remplacement d'offre
ou changement du hasard. La récompense reste disponible après avoir libéré une
place. Les aperçus ne révèlent pas la récompense et n'affectent aucun tirage.

Les gemmes sont classiques (rareté absente ou `common`) ou rares (`rare`, marque ✦).
Les majeures sont toujours rares, y compris si ce champ est absent.
La rareté ne modifie pas la production. Elle doit être identique pour fusionner,
en plus de la catégorie, du niveau et des attaches. Les anciennes sauvegardes
restent compatibles et l'ancienne réserve conserve ses douze objets éventuels.

Sélectionner puis toucher une destination est une alternative au glisser-déposer
depuis la boutique et au sein du plateau. Deux gemmes identiques fusionnent au niveau suivant à destination ;
la source est libérée. La catégorie, le niveau et le sertissage exact doivent
correspondre. Les niveaux maximaux ne fusionnent plus. Une destination occupée
incompatible n'est jamais écrasée.

Les douze niveaux suivent une progression linéaire : la récolte vaut le niveau
affiché (`+1`, `+2`… `+12`) et le facteur vaut `1 + niveau affiché / 10`
(`×1,1`, `×1,2`… `×2,2`). Une fusion ajoute donc toujours 1 à la récolte ou
0,1 au facteur. Au niveau 12, la fusion est refusée et conserve les deux gemmes.
Les sauvegardes stockent les niveaux et adoptent automatiquement ces valeurs,
sans changer le solde, les objets, leurs attaches ou leurs coûts investis.

## Affichage

Le plateau et la boutique tiennent dans la hauteur dynamique du viewport, sans
défilement de page. Seule la fenêtre du plateau défile horizontalement. Sur les écrans courts, les cases rétrécissent.
En paysage, la boutique passe à côté du circuit. L'aide et les paramètres sont
des fenêtres compactes ; le tutoriel n'occupe plus l'écran de jeu.

Les gemmes changent de nuances marquées sur les douze niveaux : cuivre corail,
ambre, or puis champagne pour les récoltes ; indigo, améthyste puis orchidée
claire pour les multiplicatrices. La saturation est renforcée, surtout aux
niveaux intermédiaires. La teinte et
la luminosité des quatre couleurs de facettes progressent avec le niveau, sans
changer la silhouette ni les attaches. La palette est centralisée dans
`src/components/gemPalette.ts` et partagée par plateau, boutique et fantôme de
glisser. Une fusion l'actualise immédiatement ; aucune donnée de sauvegarde
supplémentaire n'est nécessaire. Les valeurs restent lisibles en encre sombre.

Le mode `viewMode` est sauvegardé dans les paramètres : `simple` par défaut, ou
`advanced`. Le bouton œil permet aussi de basculer instantanément. Les anciennes
sauvegardes sans ce champ adoptent la vue épurée, sans perdre leur progression.
Changer de vue ne suspend, ne relance ni ne recalcule aucune émission.

En vue épurée, le flux est un éclat chaud de 6 px de cœur avec halo et courte
traînée, sans bulle sombre ni chiffre. Le solde, les valeurs des gemmes, les prix
et les icônes restent visibles. Les statistiques, niveaux secondaires de boutique
et textes d'accompagnement sont masqués ; les erreurs et alertes restent visibles.

En vue avancée, les impulsions sont des boules à halo ambre avec leur puissance actuelle au
centre, derrière les gemmes. Leur diamètre est fixe (18 px) et ne dépend pas de
la puissance. La valeur se met à jour après amplification et chaque branche affiche
sa propre puissance, arrondie uniquement à l'écran à une décimale. Les SVG des gemmes traversées
s'éclairent ; un gain réel « +… » ou un facteur « ×… » apparaît pendant 750 ms.
Ces effets sont pilotés par le ticker PixiJS, sans calcul de production. En mode
réduit, les valeurs apparaissent au même endroit sans mouvement ni fondu.

L'inspection d'une sélection en vue avancée remplace visuellement la boutique,
en superposition absolue : elle ne déplace ni ne redimensionne la grille. Elle
montre fonction, niveau, valeur exacte, connexions, remboursement et contribution.
Les contrôles couverts sont inertes ; fermeture et recyclage restent accessibles
dans le panneau. Pendant un glisser, ce panneau laisse place aux indications du
geste sans changer la géométrie du plateau.

## Rendement et prévisualisation

En vue avancée, « Dernier flux réel » reste le gain de la dernière émission
terminée, éventuellement influencée par les manipulations pendant son parcours.
Avant toute émission terminée, il affiche un tiret. Le « Rendement théorique »
utilise une émission neuve sur le plateau actuel figé :

`rendement (Éclats/s) = gain simulé par émission / 5`.

Cette estimation est un potentiel à cadence nominale, même en pause. Elle ne
prévoit pas les manipulations futures ni les gains de démarrage/hors ligne et
ne touche ni au solde, ni aux statistiques, ni aux flux en cours.

La contribution d'une gemme posée est `(gain du plateau − gain avec sa case vide) / 5`.
Elle inclut l'amplification et le routage ; elle peut être négative. Les contributions
ne constituent pas des parts additives du revenu. Une offre non posée n'a pas
encore de contribution à un emplacement défini.

Avant un dépôt, le glisser, le survol d'une case après sélection ou le focus au
clavier montrent le rendement candidat et sa différence avec le plateau actuel.
La simulation candidate utilise les mêmes validations d'achat/fusion/déplacement
que la transaction réelle, mais son état est jeté : aucun paiement ni tirage n'est
appliqué à la partie. Un recyclage glissé possède aussi son aperçu de rendement.
Les analyses sont mémorisées sur leurs données, sans recalcul à chaque image.

Une simulation limitée est signalée par `≥` et « Estimation partielle ». Si le
plateau actuel ou son alternative atteint une limite, la différence ou la
contribution concernée affiche une indisponibilité plutôt qu'une comparaison
tronquée. Le rendement principal affiche deux décimales maximum (`3,879744` devient
`3,88 ✧/s`), avec abréviation des grands nombres. Toucher ou activer au clavier
cette statistique ouvre les détails avec le taux complet (jusqu'à six décimales,
précision des calculs), le gain par émission et la cadence. Les contributions et
aperçus gardent leur précision d'affichage. Aucun calcul n'est arrondi par ce choix.

La propagation est fixée à **800 ms par case**, sans réglage dans les paramètres.
La vitesse n'est pas comprimée sur les longs circuits.
Plusieurs émissions peuvent donc coexister, sans mélanger ni doubler leurs gains.

La puissance n'est pas arrondie à chaque multiplication. Par exemple, trois ×1,1
produisent 1,1, puis 1,21, puis 1,331 ; la bulle affiche 1,1, 1,2, puis 1,3. Un
quatrième ×1,1 donne 1,4641, affiché 1,5. Les récoltes utilisent la puissance interne.

Une branche heurtant un rocher, un bord ou une connexion fermée termine au contact, sans
attendre le centre de la cellule extérieure ou de la gemme bloquante. La bulle
disparaît et six petites particules se dissipent en 280 ms. Les branches sœurs
continuent leur route. Les particules sont omises en mode réduit.

## Temps et sauvegarde

Le moteur calcule chaque arrivée sur la case concernée au moment de son passage,
à partir du plateau courant. Les récoltes sont créditées une seule fois à cette
arrivée. La statistique du dernier flux est mise à jour lorsque toutes ses
branches sont terminées. Les animations PixiJS ne produisent aucune monnaie.

Les excavations, placements, déplacements, fusions et recyclages conservent les impulsions :
identité, puissance acquise, historique et trajet en cours. La prochaine case
rencontrera la gemme présente à l'arrivée. Aucun gain futur n'est attribué en
avance lors d'une manipulation du plateau.

La pause ou la suspension de l'onglet retire les parcours non terminés, en
conservant seulement les gains déjà récoltés. Aucun rattrapage hors ligne ni
réexécution de ces parcours n'est effectué à la reprise.

Les valeurs, attaches, positions, réserve, offres, solde, statistiques,
terrain, compteur et hasard d'excavation, collection de minéraux,
compteurs d'achats et de renouvellements, investissements, paramètres et étape
du tutoriel sont sauvegardés localement. Les sauvegardes
invalides sont signalées et remplacées par une partie initiale. Un stockage
interdit est signalé ; le jeu reste utilisable dans l'onglet.

Le format et la clé V1 restent compatibles : les anciennes gemmes conservent
leur empreinte 1×1 et leur rareté par défaut. La catégorie `major` s'ajoute sans
modifier les anciennes données ni multiplier les objets. À la lecture, bords,
recouvrements et pierres sous une empreinte sont validés sur les quatre cellules.
Une sauvegarde invalide suit la récupération explicite habituelle ; aucun objet
n'est tronqué ou déplacé silencieusement.
Le champ `columns` conserve la largeur achetée et valide la longueur des tableaux.
Une ancienne sauvegarde sans largeur est migrée en 7×9, sans ajout de rochers ni
remise à zéro des objets, niveaux, Éclats ou découvertes. La caméra n'est pas
sauvegardée : au rechargement, elle revient à la source. Le nombre d'excavations
peut désormais dépasser 63 sur le territoire étendu.

## Exemple de référence

Puissance 1 → **+2** → **×2 en T**, puis **+5 à droite** et **+5 en bas** :
`2 + (2 × 5) + (2 × 5) = 22 Éclats`. Un test unitaire couvre cet exemple.
