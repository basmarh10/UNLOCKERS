# 03 · Disjoncteurs (`breakers`)

> **Statut : proposition** à valider par Alan. Responsable du code : Basma (module 3). Difficulté ★★☆.

## En une phrase

Abaisser la bonne combinaison de leviers pour atteindre **exactement** une tension cible : une place manipule les leviers, les autres connaissent la cible et la valeur de chaque levier.

## Écran

- Un tableau de **6 disjoncteurs A–F** (levier haut = branché, voyant vert).
- Un **voltmètre à aiguille** qui affiche en direct la somme des leviers branchés.
- La **cible n'est jamais affichée** (« Cible : ??? V »).
- Courant envoyé au bon niveau : le tableau s'allume en vert. Sinon : court-circuit, flash rouge + alarme.

## Pièces d'information

| Pièce | Contenu |
|---|---|
| `levers` | 6 interrupteurs A–F + bouton **Envoyer le courant**. Seule cette place agit. |
| `target` | La note du gardien : la tension cible (ex. 85 V). |
| `valuesA` | Les valeurs des leviers A, C, E. |
| `valuesB` | Les valeurs des leviers B, D, F. |
| `forbidden` | La consigne de sécurité : un levier qui ne doit **jamais** être branché. |

## Répartition

| Joueurs | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 4 | `forbidden` | `levers` | `valuesB` | `target` + `valuesA` |
| 3 | `target` + `valuesA` | `levers` | `valuesB` + `forbidden` | — |
| 2 | `target` + `valuesA` + `valuesB` | `levers` + `forbidden` | — | — |

## Génération

1. Tirer 6 valeurs (multiples de 5, entre 5 et 50 V).
2. Tirer un levier interdit.
3. Tirer une combinaison de 2 à 4 leviers **sans** le levier interdit ; sa somme est la cible.

Plusieurs combinaisons peuvent donner la cible : toutes sont acceptées tant que le levier interdit est baissé. Une combinaison qui atteint la cible **avec** le levier interdit est un piège : elle compte comme une erreur.

## Actions

| Action | Qui | Résultat |
|---|---|---|
| `{ type: 'toggle', lever: 'A'…'F' }` | place `levers` | `ok` (le voltmètre bouge, aucune erreur possible) |
| `{ type: 'send' }` | place `levers` | `solved` si somme = cible **et** levier interdit baissé ; sinon `error` |

## Exemple

Valeurs : A 10, B 20, C 25, D 15, E 40, F 30 · interdit : D · cible 85 V.
Solution possible : **B + C + E** (20 + 25 + 40). Piège : D + E + F donne aussi 85 V, mais D est interdit.

## Maquette

Artboard *Module 03 · Disjoncteurs*.
