# Énigmes de l'époque 1 : Shanghai, avril 1941

> Proposition d'Alan, à valider en équipe. Lore et agents : voir [lore.md](lore.md). Fiches détaillées : [pharmacie](modules/pharmacie.md), [morgue](modules/morgue.md).
> Les modules 2 et 3 du PLAN appartiennent à Sara et Basma : le télégramme et le standard ci-dessous sont des **propositions** qu'elles peuvent prendre, modifier ou remplacer.

## Vue d'ensemble

| Acte | Module | Type d'énigme | Agent qui brille | Élément transmis au final |
|---|---|---|---|---|
| 1 | **Pharmacie** (principal) | Chaîne d'infos vers un préparateur | Chen Wei (registre en chinois), Camille Roux (ordonnance en français) | Le symbole du bon flacon |
| 1 | Dossier du patient (annexe) | Compatibilité / tableau | Camille Roux | Aucun |
| 2 | **Morgue** (principal) | Déduction par élimination | Amaru Quispe (détails physiques) | Le tatouage du parrain |
| 2 | Coffre de Gu Sanye (annexe) | Code à reconstituer | Chen Wei | Aucun |
| 3 | **Télégramme** (principal) | Déchiffrement en 2 étapes | Chen Wei (code chinois), Nina Halloway (télégraphe) | Le mot décodé |
| 3 | **Standard téléphonique** (principal) | Routage / branchements | Nina Halloway, Sato Ren (appel en japonais) | Le numéro de la ligne |
| 3 | Radio clandestine (annexe) | Réglage + morse | Nina Halloway | Aucun |
| 4 | **Pavillon d'isolement** (final) | Procédure + timing en temps réel | Sato Ren (notes japonaises) | Fin de l'époque |

Chaque module principal renvoie un `clue` quand il est résolu. Le final s'en sert : la partie forme une seule histoire, pas une suite d'énigmes isolées.

Rappel de la règle des agents : **un avantage, jamais une dépendance**. Chaque pièce « en langue » existe en version brute (caractères originaux + lexique) pour les équipes qui n'ont pas l'agent qui parle cette langue.

---

## Acte 1 : La pharmacie (module principal)

Fiche complète : [modules/pharmacie.md](modules/pharmacie.md).

**En bref** : 6 flacons à l'écran (couleur de bouchon + symbole). Les téléphones se partagent l'ordonnance, le registre médicament → symbole, la fiche des couleurs contaminées et le cahier des doses. Un préparateur choisit le flacon et le nombre de doses.

**Histoire** : le patient de la chambre 12 a pris du Sérum de l'Aube et fait une réaction. Sœur Marie-Clémence vous laisse entrer à la pharmacie.

**Élément pour le final** : le symbole du bon flacon (ex. losange). C'est aussi le symbole gravé sur les flacons du Cartographe.

## Acte 1 : Le dossier du patient (annexe, mode long)

**Histoire** : avant de soigner, il faut vérifier que le patient de la chambre 12 est bien celui de l'ordonnance : les dossiers ont été mélangés.

- **Écran** : 4 dossiers médicaux (nom, âge, date d'admission, service, groupe sanguin).
- **Pièces** : le registre des admissions de Sœur Marie-Clémence (en français), la fiche de chevet de la chambre 12 (« patient de 50 à 60 ans, admis le 3 avril »), un bracelet d'identité avec un nom en caractères chinois (`lang: "zh"`).
- **Action** : choisir le bon dossier.
- **Génération** : 4 dossiers, un seul compatible avec toutes les pièces.

---

## Acte 2 : La morgue (module principal)

Fiche complète : [modules/morgue.md](modules/morgue.md).

**En bref** : 5 corps à l'écran, avec chacun 5 attributs (taille, cicatrice, tatouage, dent en or, bague). Les 4 indices (rapport de police, témoignage, carnet du légiste, rumeur de la Bande Verte) sont répartis entre les téléphones. Chaque indice est nécessaire, et il faut ouvrir le bon tiroir.

**Histoire** : Gu Sanye a été abattu cette nuit, mais la morgue a reçu plusieurs corps et les étiquettes ont été arrachées. Quelqu'un ne veut pas qu'on le retrouve.

**Lien avec les agents** : le témoignage d'une infirmière est en shanghaïen (`lang: "zh"`), le rapport de la police de la Concession en français (`lang: "fr"`).

**Élément pour le final** : le tatouage du parrain (dragon, carpe ou caractère).

## Acte 2 : Le coffre de Gu Sanye (annexe, mode long)

**Histoire** : dans les affaires du parrain, un petit coffre à 4 chiffres.

- **Inspiration réelle** : les membres de la Bande Verte recevaient un **caractère de génération** (字辈) qui indiquait leur rang dans la hiérarchie.
- **Écran** : le coffre, et une plaque avec 4 caractères de génération.
- **Pièces** : la liste ordonnée des caractères de génération (`lang: "zh"`, réseau Bande Verte), une lettre de Gu Sanye (« ma combinaison, c'est mon rang et celui de mes trois disciples »), le nom des 3 disciples avec leur caractère (rumeurs du port).
- **Action** : saisir le code à 4 chiffres (rang de chaque caractère dans la liste).
- **Génération** : la liste et les disciples sont tirés au hasard à chaque partie.

---

## Acte 3 : Le télégramme (module principal)

**Inspiration réelle** : le **code télégraphique chinois**. Depuis 1872, on télégraphiait le chinois en remplaçant chaque caractère par un nombre à 4 chiffres tiré d'un code officiel. Les services secrets ajoutaient une **clé secrète** par-dessus pour chiffrer le message.

**Histoire** : le télégramme trouvé dans la doublure de Gu Sanye est une suite de nombres. Il faut le décoder pour savoir où et quand le sérum va partir.

- **Écran** : la bande du télégramme, avec 4 groupes de 4 chiffres (ex. `7351 2094 6618 0472`).
- **Pièces** :
  - `codebook` : un extrait du code télégraphique, 12 lignes « nombre → caractère » (`lang: "zh"` : avec Chen Wei, chaque caractère est traduit ; sans elle, caractères seuls).
  - `key` : la clé du jour, 4 chiffres (réseau Juntong, carnet d'agent).
  - `method` : la règle de déchiffrement (« soustraire la clé chiffre par chiffre, sans retenue ») et l'ordre de lecture (réseau télégraphe : Nina Halloway).
- **Contrôles** : le joueur qui a les contrôles voit les 12 caractères du codebook sous forme de boutons et compose le message (4 caractères dans l'ordre), puis valide.
- **Génération** : choisir un message parmi une liste (ex. 午夜 + 南京 = « minuit » + « Nanjing »), attribuer des nombres aléatoires aux 12 caractères du codebook (dont 8 leurres), tirer une clé, chiffrer chaque groupe : `(code + clé) mod 10`, chiffre par chiffre.
- **Exemple** : code de 午 = `5241`, clé = `2110` → groupe envoyé = `7351`. Le joueur fait `7351 - 2110` chiffre par chiffre = `5241` → 午.
- **Erreur** : un message faux compte comme une erreur.
- **Élément pour le final** : le mot décodé (ex. « Nanjing »).

## Acte 3 : Le standard téléphonique (module principal)

**Inspiration réelle** : les standards manuels à fiches de l'époque, où une opératrice branchait les câbles pour relier deux postes.

**Histoire** : le télégramme parle d'un transfert ce soir. Il faut écouter l'appel entre l'inspecteur Ma (76 Jessfield Road) et le faux Dr Kuroda, sans se faire repérer.

- **Écran** : un standard de 8 prises numérotées, avec des lampes. 3 lampes s'allument (3 appels entrants en même temps).
- **Pièces** :
  - `directory` : l'annuaire interne de l'hôpital, poste → service (`lang: "fr"`).
  - `calllog` : le carnet de l'opératrice de nuit, qui note qui appelle qui ce soir, sans les numéros (réseau télégraphe / téléphone).
  - `rule` : la règle d'écoute : « pour écouter sans être repéré, branchez d'abord les deux autres appels, puis la ligne visée sur la prise d'écoute 8 » (réseau Juntong).
  - `voice` (version longue uniquement) : un fragment de l'appel en japonais (`lang: "ja"` : avec Sato Ren, il confirme que c'est bien Kuroda).
- **Contrôles** : un panneau de prises sur le téléphone : on touche une prise de départ, puis une d'arrivée, pour poser un câble. Bouton « Valider le branchement ».
- **Génération** : attribuer les services aux 7 postes, choisir les 3 appelants et leurs destinataires, désigner l'appel de Kuroda.
- **Erreur** : mauvais câble ou mauvais ordre = l'opératrice de Ma entend un clic, erreur.
- **Élément pour le final** : le numéro de la ligne de Kuroda.

## Acte 3 : La radio clandestine (annexe, mode long)

**Inspiration réelle** : le Juntong communiquait avec Chongqing par des postes radio clandestins cachés dans la ville, souvent en morse.

- **Écran** : une radio avec une aiguille de fréquence et un voyant.
- **Pièces** : la table de fréquences selon l'heure (Juntong), l'alphabet morse (Nina Halloway), le signal entendu (une suite de bips affichée sur le téléphone d'un autre joueur, pas sur l'écran).
- **Action** : régler la fréquence, puis saisir le mot de passe reçu en morse.

---

## Acte 4 : Le pavillon d'isolement (module final)

**Histoire** : le laboratoire caché du faux Dr Kuroda. La machine qui fabrique le sérum est en marche. Il faut l'arrêter dans le bon ordre, sinon elle détruit tout (et les preuves avec).

- **Écran** : la machine avec 4 verrous (un par élément récupéré : symbole, tatouage, mot, ligne) et une **jauge de pression** qui monte et descend en continu (animation Phaser).
- **Pièces** :
  - `procedure` : la procédure d'arrêt de Kuroda, en japonais (`lang: "ja"`), coupée en deux moitiés sur deux téléphones. Elle donne l'**ordre** des 4 verrous.
  - `clues` : les 4 éléments récupérés pendant la partie, répartis entre les téléphones (chaque joueur se souvient de ce que son agent a trouvé).
  - `gauge` : la règle de la jauge (« ne déverrouillez que lorsque l'aiguille est dans la zone verte »).
- **Contrôles** : chaque joueur a **un verrou** à actionner (les 4 verrous sont répartis entre les joueurs présents). Pour chaque verrou : choisir le bon élément parmi 3 propositions, puis appuyer au bon moment.
- **Coopération** : l'ordre vient du lecteur de la procédure, le bon élément vient de celui qui l'a récupéré, et le bon moment vient de celui qui regarde la jauge à l'écran. Tout le monde parle en même temps : c'est le climax.
- **Mode démo (5 min)** : 2 verrous au lieu de 4, pas de jauge.
- **Victoire** : la machine s'arrête, révélation finale (les vrais papiers de Kuroda, le fragment de mémoire n°1).

---

## Répartition selon le nombre de joueurs (tous les modules)

Même principe partout :
1. Les pièces sont d'abord données aux agents **compatibles** (langue ou réseau), une par joueur au maximum tant que c'est possible.
2. Le reste est distribué en tourniquet.
3. Deux pièces qui, ensemble, donnent la solution ne vont **jamais** au même joueur (ex. le codebook et la clé du télégramme).
4. Les contrôles changent de joueur d'un module à l'autre, pour que tout le monde agisse.

Chaque fiche de module doit montrer un tableau de répartition à 2, 3 et 4 joueurs, comme dans la pharmacie et la morgue.

## Ce qu'il faut pour la démo du 18/12

| Priorité | Contenu |
|---|---|
| Indispensable | Pharmacie, morgue, télégramme, final simplifié (2 verrous), mode démo 5 min |
| Important | Standard téléphonique, final complet avec jauge |
| Bonus | Annexes (dossier, coffre, radio), mode long |
