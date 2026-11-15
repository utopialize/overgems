# Règles de la version jouable

## Circuit

Une source extérieure à gauche de la ligne 5 émet une puissance de 1 toutes les
5 secondes. Le plateau compte 7 colonnes et 9 lignes. Une case vide laisse le
flux continuer tout droit, sans gain ni amplification. Une connectique fermée
ou le bord termine une branche.

Une récolte **+v** accepte les quatre directions, rapporte
`énergie entrante × v` Éclats et laisse le flux continuer tout droit,
sans consommer ni amplifier l'énergie.

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

## Collection

Une nouvelle partie possède une grille vide et 30 Éclats. Le joueur glisse
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

La réserve est masquée. Ses données et opérations sont conservées pour une
réactivation future ; une réserve historique pleine ne bloque pas les achats.

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
défilement de la page ni du plateau. Sur les écrans courts, les cases rétrécissent.
En paysage, la boutique passe à côté du circuit. L'aide et les paramètres sont
des fenêtres compactes ; le tutoriel n'occupe plus l'écran de jeu.

Les gemmes changent de nuances sur les douze niveaux : cuivre vers champagne pour
les récoltes, améthyste vers lavande pâle pour les multiplicatrices. La teinte et
la luminosité des quatre couleurs de facettes progressent avec le niveau, sans
changer la silhouette ni les attaches. La palette est centralisée dans
`src/components/gemPalette.ts` et partagée par plateau, boutique et fantôme de
glisser. Une fusion l'actualise immédiatement ; aucune donnée de sauvegarde
supplémentaire n'est nécessaire. Les valeurs restent lisibles en encre sombre.

Les impulsions sont des boules à halo ambre avec leur puissance actuelle au
centre, derrière les gemmes. Leur diamètre est fixe (18 px) et ne dépend pas de
la puissance. La valeur se met à jour après amplification et chaque branche affiche
sa propre puissance, arrondie uniquement à l'écran à une décimale. Les SVG des gemmes traversées
s'éclairent ; un gain réel « +… » ou un facteur « ×… » apparaît pendant 750 ms.
Ces effets sont pilotés par le ticker PixiJS, sans calcul de production. En mode
réduit, les valeurs apparaissent au même endroit sans mouvement ni fondu.

La propagation est fixée à **800 ms par case**, sans réglage dans les paramètres.
La vitesse n'est pas comprimée sur les longs circuits.
Plusieurs émissions peuvent donc coexister, sans mélanger ni doubler leurs gains.

La puissance n'est pas arrondie à chaque multiplication. Par exemple, trois ×1,1
produisent 1,1, puis 1,21, puis 1,331 ; la bulle affiche 1,1, 1,2, puis 1,3. Un
quatrième ×1,1 donne 1,4641, affiché 1,5. Les récoltes utilisent la puissance interne.

Une branche heurtant un bord ou une connexion fermée termine au contact, sans
attendre le centre de la cellule extérieure ou de la gemme bloquante. La bulle
disparaît et six petites particules se dissipent en 280 ms. Les branches sœurs
continuent leur route. Les particules sont omises en mode réduit.

## Temps et sauvegarde

Le moteur calcule chaque arrivée sur la case concernée au moment de son passage,
à partir du plateau courant. Les récoltes sont créditées une seule fois à cette
arrivée. La statistique du dernier flux est mise à jour lorsque toutes ses
branches sont terminées. Les animations PixiJS ne produisent aucune monnaie.

Les placements, déplacements, fusions et recyclages conservent les impulsions :
identité, puissance acquise, historique et trajet en cours. La prochaine case
rencontrera la gemme présente à l'arrivée. Aucun gain futur n'est attribué en
avance lors d'une manipulation du plateau.

La pause ou la suspension de l'onglet retire les parcours non terminés, en
conservant seulement les gains déjà récoltés. Aucun rattrapage hors ligne ni
réexécution de ces parcours n'est effectué à la reprise.

Les valeurs, attaches, positions, réserve, offres, solde, statistiques,
compteurs d'achats et de renouvellements, investissements, paramètres et étape
du tutoriel sont sauvegardés localement. Les sauvegardes
invalides sont signalées et remplacées par une partie initiale. Un stockage
interdit est signalé ; le jeu reste utilisable dans l'onglet.

## Exemple de référence

Puissance 1 → **+2** → **×2 en T**, puis **+5 à droite** et **+5 en bas** :
`2 + (2 × 5) + (2 × 5) = 22 Éclats`. Un test unitaire couvre cet exemple.
