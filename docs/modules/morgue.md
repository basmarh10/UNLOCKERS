# Module 4 : La morgue

> Responsable : Alan · Sprint S3
> Identifiant : `morgue`

## Résumé

Un homme important a été retrouvé mort dans l'hôpital. Cinq corps reposent à la morgue, mais un seul est le sien. L'écran commun montre les cinq fiches d'identification. Chaque téléphone détient **un indice** sur le vrai corps (certains positifs, d'autres négatifs). Aucun indice ne suffit seul : l'équipe doit les croiser pour éliminer les mauvais candidats, puis ouvrir le bon tiroir.

Différence avec la pharmacie : ici, ce n'est pas une chaîne d'infos vers un préparateur, c'est une **déduction par élimination**. Tout le monde réfléchit en même temps.

## Habillage (provisoire, à valider en atelier)

Shanghai, avril 1941. Gu Sanye, parrain de la Bande Verte, a été abattu dans l'hôpital Xinhe (voir `lore.md`). Il faut identifier son corps pour récupérer ce qu'il cachait sur lui. À la résolution, le tiroir s'ouvre et révèle un objet (qui peut servir de fragment pour le module final si l'équipe adopte cette idée).

## Ce que voit l'écran commun

Cinq **tiroirs numérotés de 1 à 5**, chacun avec une fiche qui décrit le corps selon 5 attributs :

| Attribut | Valeurs possibles |
|---|---|
| `height` (taille) | petit, moyen, grand |
| `scar` (cicatrice) | aucune, visage, bras, torse |
| `tattoo` (tatouage) | aucun, dragon, carpe, caractère chinois |
| `goldTooth` (dent en or) | oui, non |
| `ring` (bague) | oui, non |

Tout le monde voit toutes les fiches. Ce qui manque, c'est **lequel** est le bon.

## Les indices

Chaque indice porte sur **un attribut** et peut être :
- **positif** : « Il avait un tatouage de carpe. »
- **négatif** : « Il n'a jamais porté de bague. »

Il y a toujours **4 indices**, un par pièce d'information. Habillage des pièces : rapport de police, témoignage d'une infirmière, carnet du médecin légiste, lettre anonyme.

Propriétés garanties par la génération :
1. Les 4 indices réunis désignent **exactement un** corps.
2. **Chaque indice est nécessaire** : si on en retire un, au moins deux corps restent possibles.

## Contrôles

Le joueur qui a les contrôles voit 5 boutons **Ouvrir le tiroir 1 à 5**. Les contrôles vont toujours à `slots[n - 1]` (le dernier slot), pour que ce ne soit pas le même joueur que dans la pharmacie.

## Répartition selon le nombre de joueurs

Les 4 indices sont distribués en tourniquet : l'indice `i` va à `slots[i % n]`.

| Joueurs | Indices par joueur | Contrôles |
|---|---|---|
| 2 | 2 et 2 | `slots[1]` |
| 3 | 2, 1 et 1 | `slots[2]` |
| 4 | 1 chacun | `slots[3]` |

Comme chaque indice est nécessaire, **aucun joueur ne peut trouver seul**, quel que soit le nombre de joueurs.

Redistribution : on rappelle `viewFor` avec la nouvelle liste `slots`, rien d'autre à faire.

## Génération (`setup`)

À partir de `rng`, en boucle (maximum 200 essais, puis on recommence avec de nouveaux corps) :
1. Générer 5 corps avec des attributs aléatoires, **tous différents** (pas deux fiches identiques).
2. Choisir le corps cible.
3. Construire la liste de tous les indices possibles vrais pour la cible :
   - positifs : « attribut = valeur de la cible » ;
   - négatifs : « attribut ≠ une valeur que la cible n'a pas ».
4. Tirer 4 indices au hasard dans cette liste, sur **4 attributs différents**.
5. Garder ce tirage seulement si les deux propriétés garanties sont vraies (un seul corps compatible avec les 4, et au moins deux corps compatibles avec n'importe quel groupe de 3).

Coût négligeable : 5 corps et une dizaine d'indices candidats, les vérifications sont instantanées.

### État (exemple)

```json
{
  "bodies": [
    { "height": "tall", "scar": "face", "tattoo": "dragon", "goldTooth": true, "ring": false },
    { "height": "medium", "scar": "none", "tattoo": "carp", "goldTooth": true, "ring": true },
    { "height": "short", "scar": "arm", "tattoo": "carp", "goldTooth": false, "ring": false },
    { "height": "short", "scar": "arm", "tattoo": "carp", "goldTooth": true, "ring": false },
    { "height": "short", "scar": "chest", "tattoo": "character", "goldTooth": true, "ring": false }
  ],
  "clues": [
    { "attr": "height", "op": "neq", "value": "tall" },
    { "attr": "ring", "op": "neq", "value": true },
    { "attr": "goldTooth", "op": "eq", "value": true },
    { "attr": "scar", "op": "neq", "value": "chest" }
  ],
  "solution": 4
}
```

Vérification : chaque indice élimine exactement un mauvais corps.

| Indice | Élimine | Reste |
|---|---|---|
| « Il n'était pas grand » | corps 1 | 2, 3, 4, 5 |
| « Il ne portait pas de bague » | corps 2 | 1, 3, 4, 5 |
| « Il avait une dent en or » | corps 3 | 1, 2, 4, 5 |
| « Pas de cicatrice sur le torse » | corps 5 | 1, 2, 3, 4 |

Les 4 réunis ne laissent que le **corps 4**. Si on en retire un, le corps qu'il éliminait redevient possible : chaque indice est bien nécessaire. Un tirage où un indice serait redondant est rejeté par l'étape 5.

`solution` (index de 1 à 5) n'est jamais envoyé au client.

## Vues

`screenView(state)` : `{ bodies: [{ index, height, scar, tattoo, goldTooth, ring }], opened: null | index }`

`viewFor(state, slot, slots)` :

```json
{
  "canAct": false,
  "clues": [
    { "source": "Témoignage d'une infirmière", "text": "Il avait un tatouage de carpe sur l'épaule." }
  ]
}
```

Le texte de l'indice est généré côté serveur à partir de `{ attr, op, value }`, avec quelques tournures différentes par attribut pour l'ambiance.

## Actions (`handleAction`)

| Action | Condition | Résultat |
|---|---|---|
| `{ type: "open", drawer: 1-5 }` | slot sans `canAct` | refus `INVALID_ACTION` |
| idem | bon tiroir | `solved` (l'écran ouvre le tiroir) |
| idem | mauvais tiroir | `error` ; ce tiroir est marqué comme ouvert à tort et ne peut plus être choisi |

Marquer le mauvais tiroir évite qu'une équipe tente les 5 au hasard : chaque essai coûte une erreur sur 3 autorisées.

## Tests Vitest

- `setup` : les 5 corps sont distincts ; les 4 indices portent sur 4 attributs différents ; un seul corps compatible avec les 4 indices ; pour chaque groupe de 3 indices, au moins 2 corps compatibles.
- `setup` : même graine = même état ; 1000 graines différentes génèrent toutes un état valide (pas de boucle infinie).
- `viewFor` à 2, 3 et 4 joueurs : chaque indice distribué une fois, un seul slot a `canAct`, et c'est le dernier.
- `viewFor` ne contient jamais `solution`.
- `handleAction` : bon tiroir → `solved`, mauvais → `error`, même mauvais tiroir une 2e fois → refus, slot sans contrôles → refus.

## Pistes si trop facile

- Passer à 6 corps et 5 attributs par indice.
- Ajouter un indice **faux** (la lettre anonyme ment) avec une règle sur la fiche du légiste pour le repérer.
