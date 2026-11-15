# OVERGEMS — Prompt maître de développement V0.1

## Mission

Tu es un développeur senior spécialisé dans les jeux mobiles, le game design systémique, les interfaces tactiles et les jeux incrémentaux.

Ta mission est de **concevoir, développer, tester et livrer en une seule passe une première version entièrement jouable du jeu OVERGEMS**.

OVERGEMS est un jeu mobile de type **idle / merge / optimisation de réseau**, dans lequel le joueur construit un circuit de gemmes traversées périodiquement par des impulsions d'énergie.

Les gemmes peuvent récolter des ressources, multiplier la puissance des impulsions ou redistribuer ces impulsions dans plusieurs directions.

Le joueur achète, place, déplace et fusionne des gemmes pour améliorer continuellement le rendement de son réseau.

Le cœur du plaisir réside dans l'optimisation spatiale : une configuration ingénieuse doit pouvoir produire beaucoup plus qu'un assemblage de gemmes simplement puissantes.

**La priorité absolue est le gameplay réel.** Il ne s'agit pas de créer une simulation visuelle approximative, un prototype d'interface ou une démonstration technique, mais un petit jeu réellement fonctionnel et satisfaisant.

Tu dois travailler de manière autonome, prendre des décisions raisonnables pour les détails non spécifiés et aller jusqu'à la livraison jouable sans demander de validation intermédiaire.

---

# 1. Vision et expérience recherchée

## Concept fondamental

Le joueur possède une grille sur laquelle il dispose des gemmes magiques.

Une source d'énergie située sur le bord du plateau émet régulièrement une impulsion.

Cette impulsion se propage à travers les gemmes placées sur la grille.

Il existe deux grandes catégories :

**Les gemmes de récolte (+)**

Elles laissent traverser l'énergie sans changer sa direction et génèrent des ressources en fonction de sa puissance.

**Les gemmes multiplicatrices (×)**

Elles amplifient l'énergie et la redistribuent selon la configuration fixe de leur sertissage.

Les impulsions peuvent se diviser, se croiser et emprunter des chemins complexes.

Le joueur cherche donc à maximiser la quantité de ressources obtenues à chaque émission.

## Les quatre piliers

1. **Propagation** : comprendre et exploiter la circulation des impulsions.
2. **Amplification** : augmenter progressivement la puissance de l'énergie.
3. **Routage** : utiliser les gemmes serties pour créer des chemins, croisements et bifurcations rentables.
4. **Fusion** : combiner des gemmes identiques pour améliorer leurs capacités.

Ces quatre mécaniques doivent être réellement interdépendantes.

Une meilleure gemme n'est pas forcément plus utile si son emplacement ou son sertissage est inadapté.

## Objectif de game design

Le joueur doit régulièrement se demander :

« Est-ce que je gagnerais davantage en déplaçant cette gemme ? »

« Est-ce que cette multiplicatrice serait plus rentable avant la bifurcation ? »

« Dois-je fusionner mes deux gemmes identiques ou les conserver dans deux branches différentes ? »

« Cette gemme possède un excellent multiplicateur, mais comment exploiter son sertissage ? »

Le jeu doit offrir un plaisir d'expérimentation permanent.

---

# 2. Plateforme et technologies

Créer une application web mobile-first, jouable immédiatement sur navigateur Android et ordinateur.

Stack souhaitée :

- React
- TypeScript strict
- Vite
- CSS moderne
- SVG et/ou Canvas pour les éléments graphiques
- Vitest pour les tests
- localStorage pour la persistance

Éviter les dépendances volumineuses sans nécessité.

Le projet doit fonctionner localement sans serveur applicatif, compte utilisateur ou service externe.

Préparer une architecture qui pourra ultérieurement être intégrée dans une PWA ou une application Android.

Séparer impérativement :

- Moteur de simulation.
- Définitions et catalogue de gemmes.
- Économie et progression.
- Gestion de l'inventaire.
- Fusion.
- Sauvegarde.
- Rendu visuel.
- Interactions.

Le moteur doit être indépendant de React et entièrement testable.

---

# 3. Plateau de jeu

## Grille

Créer une grille initiale de **7 colonnes × 9 lignes**, optimisée pour un smartphone en portrait.

Chaque case peut accueillir une gemme.

Pour la V0.1, chaque gemme occupe exactement une case.

Une case vide ne conduit pas l'énergie.

## Source d'énergie

Une source se trouve à gauche de la ligne centrale du plateau.

Elle émet périodiquement des impulsions vers la droite.

Paramètres initiaux suggérés :

- Puissance de l'impulsion : 1.
- Fréquence : une impulsion toutes les 2 secondes.
- Vitesse de déplacement visuellement perceptible.
- Émissions automatiques.

L'énergie doit réellement traverser les gemmes selon les règles définies ci-dessous.

La source ne doit pas occuper une cellule de la grille.

## Définition d'une impulsion

Une impulsion possède au minimum :

- Un identifiant.
- Une valeur énergétique.
- Une position.
- Une direction actuelle.
- Un historique de parcours permettant de détecter les boucles.

La direction correspond à un déplacement orthogonal : haut, bas, gauche ou droite.

Une impulsion peut créer plusieurs branches indépendantes lorsqu'elle traverse une multiplicatrice dotée de plusieurs sorties.

---

# 4. Les gemmes de récolte (+)

**Règle fondamentale : toutes les gemmes de récolte sont non directionnelles.**

Elles n'ont pas de sertissage fonctionnel imposant un chemin.

## Comportement

Une gemme `+` accepte une impulsion arrivant depuis n'importe lequel de ses quatre côtés.

Elle laisse ensuite l'impulsion poursuivre en ligne droite, sans la faire tourner ni la diviser.

Exemples :

- Entrée gauche → sortie droite.
- Entrée droite → sortie gauche.
- Entrée haut → sortie bas.
- Entrée bas → sortie haut.

Une même gemme peut être traversée par plusieurs impulsions différentes.

Les traversées horizontales et verticales peuvent se croiser.

Elles restent indépendantes.

La gemme n'est jamais consommée ni bloquée.

## Production

À chaque traversée :

**Gain = puissance entrante × valeur de récolte**

Exemple :

Une impulsion de puissance 20 traverse une gemme `+5`.

Le joueur gagne 100 Éclats.

L'impulsion ressort avec une puissance de 20.

La récolte ne consomme pas d'énergie et ne modifie pas sa valeur.

## Progression

Les gemmes de récolte existent à plusieurs niveaux.

Exemples de valeurs possibles :

- +1
- +2
- +3
- +5
- +8
- +12
- +18
- +27
- +40

Ce catalogue est indicatif. Choisir une progression économique équilibrée et configurable.

Les gemmes de récolte ne peuvent jamais être tournées : leur orientation n'a aucune signification fonctionnelle.

---

# 5. Les gemmes multiplicatrices (×)

**Règle fondamentale : toutes les gemmes multiplicatrices sont directionnelles et possèdent un sertissage fixe.**

Il n'existe pas de multiplicatrice standard permettant librement une traversée depuis n'importe quel côté.

Il n'existe pas non plus de gemmes de routage indépendantes sans fonction économique.

Chaque gemme `×` est à la fois :

- Un multiplicateur d'énergie.
- Un élément de circulation directionnelle.

## 5.1 Le sertissage

Toutes les gemmes peuvent conserver une silhouette cristalline comparable.

La géométrie ne doit pas être exprimée par des formes de gemmes radicalement différentes.

**C'est le sertissage métallique entourant la gemme qui indique les côtés connectés.**

Le sertissage peut présenter des attaches ou connectiques sur :

- Le haut.
- La droite.
- Le bas.
- La gauche.

Ces connectiques indiquent exactement les côtés sur lesquels l'énergie peut entrer ou sortir.

Le joueur doit pouvoir identifier cette configuration d'un coup d'œil.

## 5.2 Règle de propagation

Lorsqu'une impulsion arrive sur une gemme multiplicatrice :

1. Vérifier que le côté d'arrivée possède une connectique.
2. Refuser le flux si cette connectique n'existe pas.
3. Multiplier la puissance de l'impulsion par la valeur de la gemme.
4. Émettre la puissance obtenue vers chacune des autres connectiques disponibles.
5. Ne jamais réémettre immédiatement vers la connectique par laquelle l'impulsion est entrée.

Le flux n'a pas de sens de circulation prédéfini.

**Chaque connectique peut servir d'entrée ou de sortie.**

La géométrie est fixe, mais la circulation est bidirectionnelle.

## 5.3 Configurations possibles

Créer les configurations suivantes :

**Ligne horizontale**

Connectiques gauche et droite.

Une impulsion arrivant de gauche ressort à droite, et inversement.

**Ligne verticale**

Connectiques haut et bas.

Une impulsion arrivant du haut ressort en bas, et inversement.

**Coude**

Deux connectiques adjacentes.

Exemple : gauche et bas.

L'énergie peut entrer de gauche pour ressortir en bas, ou entrer du bas pour ressortir à gauche.

**T**

Trois connectiques.

Exemple : gauche, droite et bas.

Une impulsion arrivant de gauche ressort à droite ET en bas.

Une impulsion arrivant du bas ressort à gauche ET à droite.

**Croix**

Quatre connectiques.

Une impulsion entrante est redistribuée vers les trois autres directions.

## 5.4 Absence totale de rotation

**Les gemmes ne peuvent jamais être pivotées.**

Cette règle est non négociable.

Une multiplicatrice avec un sertissage gauche/droite/bas est différente d'une multiplicatrice haut/droite/bas.

Le joueur doit trouver une place adaptée à la gemme qu'il possède.

Cette contrainte fait partie intégrante de la stratégie de placement et de la progression.

Ne pas créer de bouton « Pivoter », de geste de rotation ou de fonctionnalité de changement d'orientation.

Les orientations disponibles sont des variantes distinctes de gemmes obtenues par la boutique.

## 5.5 Amplification

La puissance est multipliée lors de chaque traversée valide.

Formule :

**Puissance sortante = puissance entrante × multiplicateur**

Exemple :

Une impulsion de puissance 10 traverse une gemme `×1,5`.

La puissance ressortante est 15.

La multiplicatrice ne génère aucun Éclat.

Elle prépare seulement une énergie plus importante pour les éventuelles gemmes de récolte suivantes.

## 5.6 Duplication

Une multiplicatrice possédant plusieurs sorties crée une branche indépendante pour chacune d'elles.

Pour la V0.1, chaque branche conserve la puissance intégrale après multiplication.

Exemple :

Une impulsion de puissance 10 entre dans une gemme `×2` possédant trois connectiques, dont deux disponibles en sortie.

La puissance devient 20.

Deux impulsions indépendantes ressortent, chacune avec une puissance de 20.

Il n'y a aucune division de puissance.

Une multiplicatrice en croix peut donc transformer une seule impulsion en trois branches.

Cette mécanique est essentielle au gameplay.

## 5.7 Familles et valeurs

Exemples de multiplicateurs :

- ×1,1
- ×1,2
- ×1,3
- ×1,5
- ×1,7
- ×2
- ×2,5
- ×3

Les valeurs doivent rester configurables.

Une gemme `×1,5` avec sertissage horizontal et une gemme `×1,5` avec sertissage en T constituent deux variantes distinctes.

Leur puissance économique est identique mais leur utilité stratégique diffère.

---

# 6. Connexions, croisements et propagation

## Traversée des gemmes

L'énergie passe d'une cellule à sa voisine selon la direction de déplacement.

À l'arrivée :

- Case vide : arrêt du flux.
- Gemme `+` : récolte et poursuite rectiligne.
- Gemme `×` avec connectique d'entrée valide : amplification puis distribution.
- Gemme `×` sans connectique d'entrée valide : arrêt du flux.
- Bord extérieur du plateau : arrêt du flux.

Les connectiques d'une multiplicatrice ne nécessitent pas de connectique correspondante sur une gemme `+`, puisque cette dernière accepte les flux depuis tous les côtés.

## Croisements

Les flux peuvent se croiser dans les gemmes de récolte.

Exemple :

Une impulsion traverse une gemme `+5` horizontalement tandis qu'une autre la traverse verticalement.

Les deux traversées génèrent leurs gains indépendamment.

Les impulsions ne fusionnent pas.

Les gemmes multiplicatrices peuvent également recevoir des impulsions indépendantes sur plusieurs connectiques, chacune étant traitée selon sa propre direction entrante.

## Boucles

Les réseaux peuvent contenir des circuits fermés.

Ils ne doivent jamais provoquer une propagation infinie.

Utiliser un suivi des états visités par branche :

`(position, direction_entrante)`

Une branche s'arrête si elle retrouve un état déjà visité dans son historique.

Les branches issues d'une même impulsion doivent conserver des historiques indépendants.

Ajouter une limite de sécurité globale d'événements de propagation par émission.

Cette limite doit être configurable, déterministe et suffisamment élevée pour ne pas interrompre les réseaux ordinaires.

Les limites de sécurité ne doivent pas fausser silencieusement les résultats : signaler lorsqu'un circuit atteint une limite exceptionnelle.

## Calculs

Le moteur doit produire des événements exploitables par le rendu :

- Entrée dans une gemme.
- Récolte.
- Multiplication.
- Duplication.
- Changement de direction.
- Fin de branche.

Éviter de lier les calculs mathématiques aux animations.

Les gains ne doivent jamais dépendre du framerate.

---

# 7. Système de fusion (merge)

La fusion constitue le second grand pilier de progression.

## Condition obligatoire

Deux gemmes peuvent fusionner uniquement lorsqu'elles sont strictement identiques.

### Gemmes de récolte

Les deux gemmes doivent posséder :

- La même catégorie `+`.
- Le même niveau.
- La même valeur.

### Gemmes multiplicatrices

Les deux gemmes doivent posséder :

- La même catégorie `×`.
- Le même niveau.
- Le même multiplicateur.
- Exactement le même sertissage.
- Exactement la même disposition des connectiques.

Exemples :

Deux `×1,5` à sertissage horizontal peuvent fusionner.

Un `×1,5` horizontal ne peut pas fusionner avec un `×1,5` vertical.

Deux `×2` en T ne peuvent pas fusionner si leurs sertissages ne présentent pas les mêmes connectiques aux mêmes endroits.

Ne pas proposer de rotation pour les rendre compatibles.

## Résultat

Lorsqu'une fusion réussit :

1. Les deux gemmes sont consommées.
2. Une gemme de niveau supérieur apparaît.
3. Elle conserve exactement la même catégorie.
4. Une multiplicatrice conserve exactement son sertissage.
5. Sa puissance économique augmente.
6. Une place est libérée si les deux gemmes occupaient des cases du plateau.

L'évolution doit suivre un catalogue de niveaux centralisé.

La fusion de deux gemmes `+` donne une gemme `+` supérieure.

La fusion de deux gemmes `×` donne une multiplicatrice supérieure avec son sertissage inchangé.

## Interface

Permettre la fusion par glisser-déposer d'une gemme sur une autre.

Prévoir également une interaction par sélection successive de deux gemmes.

Les fusions doivent fonctionner entre :

- Deux gemmes du plateau.
- Deux gemmes de l'inventaire.
- Une gemme du plateau et une gemme de l'inventaire.

Lorsque le joueur sélectionne une gemme, mettre en évidence ses doubles compatibles.

Lorsqu'il tente une fusion impossible, ne détruire ni déplacer accidentellement aucun élément.

## Feedback visuel

Une fusion réussie doit provoquer :

- Un rapprochement lumineux.
- Un éclat cristallin.
- Une transformation visuelle.
- L'apparition de la nouvelle valeur.
- Un bref effet de satisfaction.

Ne pas imposer une animation longue ou bloquante.

---

# 8. Économie et progression

## Monnaie

La monnaie du jeu s'appelle **Éclats**.

Elle est produite exclusivement par les gemmes de récolte lors des passages d'énergie.

Aucune cryptomonnaie réelle ni technologie blockchain.

## Boutique

Afficher trois offres de gemmes.

Chaque offre indique :

- La représentation de la gemme.
- Son bonus `+` ou `×`.
- Son niveau.
- Son prix.
- Son sertissage lorsqu'il s'agit d'une multiplicatrice.

Les offres sont générées depuis un catalogue de gemmes et de configurations autorisées.

Après un achat, remplacer l'offre par une nouvelle proposition.

Prévoir un bouton **Reroll** permettant de renouveler les trois offres contre des Éclats.

La boutique doit pouvoir proposer des sertissages différents, y compris à puissance identique.

Il ne doit pas être nécessaire de débloquer un mécanisme de rotation pour obtenir une variante géométrique.

## Inventaire

Créer une réserve permettant de conserver les gemmes achetées ou retirées du plateau.

Capacité initiale suggérée : 12 emplacements.

Permettre les déplacements :

- Boutique → inventaire.
- Inventaire → grille.
- Grille → inventaire.
- Grille → grille.

Le joueur doit pouvoir réorganiser librement son réseau.

Si l'inventaire est plein, refuser proprement une action qui nécessiterait un emplacement supplémentaire.

Ne jamais supprimer une gemme sans action explicite.

## Progression

Les premières minutes doivent être dynamiques.

Le joueur doit pouvoir rapidement :

- Acheter une gemme.
- Améliorer son réseau.
- Constater un gain supérieur.
- Effectuer une fusion.
- Découvrir un sertissage intéressant.
- Créer une première bifurcation.

Les coûts et les valeurs doivent être configurables.

L'objectif est une progression incrémentale où l'optimisation est souvent plus efficace qu'un simple achat aveugle.

## Indicateurs

Afficher au minimum :

- Le total d'Éclats.
- La production de la dernière impulsion terminée.
- La production moyenne récente, si elle est pertinente.

Les statistiques doivent être calculées réellement.

Éviter les compteurs purement décoratifs.

---

# 9. Direction artistique

Nom provisoire : **OVERGEMS**

Direction visuelle :

**Fantasy minérale premium, cristaux facettés, sertissages métalliques raffinés et énergie lumineuse, sur un fond sombre et élégant.**

## Gemmes

Toutes les gemmes doivent partager un langage graphique cohérent.

Elles peuvent différer par leur couleur, leur éclat, leur niveau et leurs détails visuels, mais doivent conserver des silhouettes comparables.

Éviter les cristaux aux formes arbitrairement complexes pour représenter les fonctions de routage.

## Gemmes de récolte

Les gemmes `+` sont des cristaux non sertis ou présentant uniquement une décoration non directionnelle.

Leur aspect doit communiquer qu'elles peuvent être traversées librement.

Les représenter avec :

- Facettes lumineuses.
- Couleurs distinctives.
- Valeur `+` très lisible.
- Reflets et animations lors de la récolte.

## Gemmes multiplicatrices

Les gemmes `×` sont reconnaissables à leur **sertissage directionnel**.

Le métal entoure partiellement la gemme.

Des attaches clairement visibles matérialisent les côtés actifs.

Par exemple, une multiplicatrice en T présente trois connectiques métalliques sur ses côtés correspondants.

Le sertissage doit être suffisamment contrasté pour distinguer immédiatement :

- Une ligne horizontale.
- Une ligne verticale.
- Un coude.
- Un T.
- Une croix.

La couleur de la gemme peut évoluer selon sa puissance, mais le sertissage doit toujours rester lisible.

Le joueur ne doit jamais devoir ouvrir une fiche pour comprendre les directions autorisées.

## Ambiance

Palette suggérée :

- Obsidienne.
- Bleu nuit profond.
- Violet minéral.
- Argent et métal vieilli.
- Reflets or doux.
- Émeraude, rubis, saphir et améthyste pour les cristaux.

Éviter un excès de néons ou d'effets lumineux qui nuirait à la lecture.

Le rendu doit paraître soigné sans devenir visuellement surchargé.

## Énergie

Les impulsions apparaissent comme des petites concentrations de lumière.

Elles doivent :

- Se déplacer visiblement.
- Éclairer brièvement les gemmes traversées.
- Gagner éventuellement en intensité après multiplication.
- Se séparer visuellement lors d'une bifurcation.
- Produire des éclats au passage dans une gemme `+`.

Une bifurcation doit être immédiatement perceptible.

Prévoir une réduction automatique des effets visuels lorsque de nombreuses impulsions circulent simultanément.

L'affichage peut simplifier les effets, jamais modifier les calculs.

---

# 10. Interface mobile et ergonomie

Concevoir l'interface pour un écran portrait de référence de 390 × 844 pixels.

## Organisation

### Haut de l'écran

- Nom OVERGEMS, discret.
- Compteur d'Éclats.
- Production par impulsion.
- Paramètres.

### Centre

Le plateau constitue l'élément principal.

Il doit occuper le maximum d'espace disponible tout en conservant des cellules suffisamment grandes pour être manipulées au doigt.

La source d'énergie doit être visible.

Les connectiques des sertissages doivent être lisibles.

### Bas

- Trois offres de boutique.
- Bouton Reroll.
- Accès à l'inventaire.
- Informations contextuelles sur la gemme sélectionnée.

Utiliser des tiroirs ou panneaux compacts lorsque nécessaire.

Ne pas laisser les informations secondaires réduire excessivement le plateau.

## Manipulations

Le joueur peut :

- Toucher une gemme pour la sélectionner.
- La glisser vers une autre case.
- Glisser une gemme depuis l'inventaire.
- Glisser une gemme sur un double compatible pour fusionner.
- Toucher une destination après avoir sélectionné une gemme.
- Ouvrir une fiche concise indiquant sa valeur, son niveau et ses connexions.

La sélection doit mettre en évidence les destinations possibles.

En cas d'erreur, l'élément doit revenir proprement à sa position précédente.

**Aucune rotation des gemmes.**

Ne pas afficher de bouton ou d'indication de rotation.

Prévoir des interactions adaptées à la souris et au tactile à l'aide des Pointer Events.

Empêcher les manipulations de provoquer des défilements involontaires de la page.

## Lisibilité

Privilégier :

- Gros chiffres sur les gemmes.
- Bordures fonctionnelles clairement visibles.
- Peu de textes permanents.
- Animations courtes.
- Contraste élevé.
- Informations contextuelles plutôt que panneaux omniprésents.

Le joueur doit voir le réseau avant de voir l'interface.

---

# 11. Partie initiale et tutoriel

Le jeu doit être immédiatement compréhensible.

## Démarrage

Créer une configuration initiale produisant déjà des Éclats.

Le joueur doit voir circuler une impulsion dans les premières secondes.

Ne pas démarrer avec une grille entièrement vide et une longue explication.

## Tutoriel léger

Introduire progressivement :

1. Le passage de l'énergie dans les gemmes `+`.
2. La production d'Éclats.
3. L'amplification par les gemmes `×`.
4. La contrainte des sertissages.
5. Les bifurcations.
6. L'achat de gemmes.
7. Le déplacement.
8. La fusion.

Les explications doivent être courtes et contextuelles.

Laisser la possibilité d'ignorer le tutoriel.

## Moment de découverte recherché

Le joueur constate qu'en réorganisant un réseau, une impulsion peut traverser davantage de récolteurs ou les traverser avec une énergie supérieure.

Une modification spatiale pertinente doit produire une augmentation de rendement immédiatement visible.

---

# 12. Modèle technique et simulation

## Modèle de gemme

Définir une représentation typée distinguant au minimum :

- Identifiant d'instance.
- Type : récolte ou multiplicateur.
- Niveau.
- Valeur économique.
- Sertissage pour les multiplicatrices.
- Position actuelle ou emplacement dans l'inventaire.

Pour les multiplicatrices, représenter les connectiques par un masque de quatre directions, ou une structure équivalente.

Les gemmes `+` ne doivent pas utiliser ce masque pour leur comportement de propagation.

Ne pas modéliser l'orientation comme une propriété modifiable par le joueur.

Chaque configuration de sertissage est une variante fixe.

## Moteur

Implémenter une fonction pure permettant de calculer les événements résultant d'une émission.

Elle reçoit l'état du plateau et les paramètres de l'impulsion.

Elle produit des événements de propagation, des gains et des états terminaux.

Le moteur doit être indépendant du rendu.

Utiliser un ordre déterministe pour traiter les branches.

Les effets graphiques doivent pouvoir rejouer les événements calculés.

## Synchronisation

Le calcul des gains doit rester exact indépendamment de la vitesse des animations.

Une émission peut être calculée en amont puis visualisée progressivement, à condition que les résultats ne soient comptabilisés qu'une seule fois.

Les émissions périodiques peuvent se chevaucher visuellement.

Éviter tout traitement répété accidentellement lors d'un rerender React.

Prévoir une protection contre les calculs exponentiels anormaux.

## Exemple de référence à reproduire en test

Configurer une source émettant une impulsion de puissance 1 vers la droite.

Placer successivement :

- Une gemme `+2`.
- Une gemme `×2` en T, sertissage gauche/droite/bas.

Placer ensuite :

- Une gemme `+5` directement à droite du T.
- Une gemme `+5` directement en dessous du T.

Résultat attendu :

- Première gemme : 1 × 2 = 2 Éclats.
- Multiplicatrice : puissance 1 → 2.
- Branche droite : 2 × 5 = 10 Éclats.
- Branche basse : 2 × 5 = 10 Éclats.

**Production totale : 22 Éclats pour cette impulsion.**

Cet exemple doit être reproduit par un test automatisé.

---

# 13. Sauvegarde

Sauvegarder automatiquement :

- Plateau.
- Gemmes possédées.
- Sertissages exacts.
- Niveaux.
- Inventaire.
- Solde d'Éclats.
- Boutique.
- Statistiques et paramètres.
- Progression du tutoriel.

La sauvegarde doit être restaurée au prochain chargement.

Prévoir une version de schéma et une gestion raisonnable des données invalides.

Pour la V0.1, ne pas ajouter de production hors ligne.

La simulation peut être suspendue lorsque l'application n'est plus active.

Aucun gain ne doit être inventé ou accordé plusieurs fois après une reprise.

---

# 14. Tests obligatoires

Créer des tests unitaires couvrant les règles centrales.

## Gemmes de récolte

- Traversée de gauche vers droite.
- Traversée de droite vers gauche.
- Traversée verticale dans les deux sens.
- Croisements indépendants.
- Gain proportionnel à l'énergie.
- Énergie inchangée après récolte.

## Multiplicatrices serties

- Acceptation uniquement par les connectiques existantes.
- Refus d'un côté dépourvu de sertissage.
- Traversée horizontale.
- Traversée verticale.
- Redirection dans un coude.
- Bifurcation dans un T.
- Distribution dans une croix.
- Utilisation bidirectionnelle des connectiques.
- Multiplication avant la création des branches.
- Aucune production directe de monnaie.

## Géométrie immuable

- Chaque variante de sertissage possède une identité distincte.
- Une gemme ne peut jamais changer de sertissage.
- Aucun mécanisme de rotation.
- Les connectiques restent inchangées après déplacement ou fusion.

## Fusion

- Deux gemmes `+` identiques fusionnent.
- Deux multiplicatrices identiques fusionnent.
- Deux multiplicatrices de même valeur mais de sertissage différent ne fusionnent pas.
- Deux niveaux différents ne fusionnent pas.
- Deux catégories différentes ne fusionnent pas.
- La puissance augmente correctement.
- Le sertissage est conservé.
- Les manipulations invalides ne détruisent aucun objet.

## Économie

- Production correcte sur une chaîne de gemmes.
- Effet de l'ordre `×` puis `+`.
- Bifurcation avec gains sur plusieurs branches.
- Exemple de référence à 22 Éclats.
- Aucun gain en double lors d'une animation ou d'un rechargement.

## Robustesse

- Cases vides.
- Bords de grille.
- Boucles.
- Grand nombre de branches.
- Impulsions simultanées.
- Sauvegarde et restauration.
- Inventaire plein.
- Achat refusé si monnaie insuffisante.
- Déplacement invalide.
- Performance sur viewport mobile.

---

# 15. Priorités de développement

Organiser le travail pour obtenir le plus rapidement possible une boucle complète.

Ordre recommandé :

1. Initialisation du projet.
2. Types et modèles de données.
3. Moteur de propagation.
4. Calculs économiques.
5. Catalogue de gemmes et sertissages.
6. Gestion du plateau.
7. Achat et inventaire.
8. Fusion.
9. Interface tactile.
10. Animations des impulsions.
11. Habillage artistique.
12. Tutoriel et sauvegarde.
13. Tests et équilibrage.

Ces étapes sont internes.

Ne pas interrompre le travail entre les étapes pour demander une validation.

Tu peux paralléliser des tâches indépendantes si cela apporte un réel bénéfice.

Maintenir une consommation de tokens raisonnable en évitant les réanalyses répétitives, les fichiers intermédiaires inutiles et les documentations disproportionnées.

---

# 16. Périmètre exclu de la V0.1

Ne pas implémenter :

- Plusieurs plateaux.
- Combats.
- Missions chronométrées.
- Personnages.
- Système de prestige.
- Publicités ou monétisation.
- Comptes.
- Backend.
- Multijoueur.
- Classements en ligne.
- Plusieurs couleurs d'énergie fonctionnellement distinctes.
- Combinaisons élémentaires.
- Gemmes de plusieurs cases.
- Objets de routage indépendants des multiplicateurs.
- Rotation des gemmes.
- Modification des sertissages après acquisition.
- Systèmes complexes de quêtes ou de succès.

Le jeu doit être petit, mais mécaniquement complet.

Ne pas ajouter du contenu au détriment de la qualité du moteur.

---

# 17. Critères d'acceptation

La V0.1 sera considérée comme jouable si :

1. Une impulsion est réellement émise et traverse la grille.
2. Les gemmes `+` acceptent toutes les directions et préservent la trajectoire.
3. Les gemmes `×` possèdent obligatoirement un sertissage fixe.
4. Le sertissage contrôle réellement les entrées et les sorties.
5. Aucun mécanisme de rotation n'existe.
6. Les multiplicatrices amplifient l'énergie.
7. Les gemmes de récolte génèrent les gains corrects.
8. Les bifurcations créent des flux indépendants.
9. Les croisements fonctionnent.
10. Les boucles ne peuvent pas bloquer le jeu.
11. Le joueur peut acheter et déplacer des gemmes.
12. L'inventaire fonctionne.
13. Deux gemmes strictement identiques peuvent fusionner.
14. Les autres fusions sont refusées.
15. L'économie permet une progression tangible.
16. L'application fonctionne confortablement sur mobile.
17. L'affichage des impulsions est lisible et agréable.
18. La progression est sauvegardée.
19. Les tests automatisés passent.
20. Une partie d'au moins dix minutes est possible sans blocage, sans étape technique et sans contenu simulé.

La valeur des gemmes, la disposition du réseau et la géométrie des sertissages doivent réellement influencer les résultats.

---

# 18. Livrables

Fournir :

- Le projet complet.
- Les commandes de lancement.
- Un README concis.
- Une documentation des règles.
- Un catalogue et des paramètres économiques modifiables.
- Des tests automatisés.
- Une description rapide de l'architecture.
- Un compte rendu de livraison.

Dans le compte rendu final, distinguer :

- Ce qui est implémenté.
- Ce qui a été effectivement testé.
- Ce qui reste à valider manuellement.
- Les limites connues.
- Les pistes d'évolution futures.

Ne pas prétendre avoir vérifié un comportement si les outils disponibles n'ont pas permis de le tester.

---

# 19. Règle de priorité absolue

Si un arbitrage est nécessaire, respecter cet ordre :

1. Exactitude des mécaniques de propagation.
2. Intégrité des règles de sertissage et de fusion.
3. Manipulation confortable des gemmes.
4. Boucle économique réellement jouable.
5. Lisibilité du réseau et des impulsions.
6. Qualité des animations.
7. Richesse du contenu secondaire.

Le jeu doit donner envie de réfléchir, expérimenter et réorganiser son plateau.

Il doit être possible de prendre une gemme multiplicatrice dont le sertissage semblait peu intéressant, puis de découvrir une configuration qui transforme radicalement le rendement du réseau.

C'est ce plaisir d'optimisation qui définit OVERGEMS.

**Développe maintenant la V0.1 complète. Ne t'arrête pas à une maquette ou à un prototype de grille. Termine l'implémentation, exécute les validations disponibles, corrige les problèmes identifiés et livre une application réellement jouable.**