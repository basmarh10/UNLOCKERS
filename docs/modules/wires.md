# 01 · Boîtier à fils (`wires`)

> **Statut : proposition** à valider par Alan. Responsable du code : Alan (module 1). Difficulté ★☆☆.

## En une phrase

Couper le bon fil d'un boîtier : une place a la pince mais pas les règles, une autre a les règles, une troisième a le numéro de série dont dépend une règle.

## Écran

- Un boîtier avec **5 fils** colorés, repérés **A à E** sur la borne de gauche.
- Couleurs tirées parmi : rouge, bleu, jaune, blanc, noir (doublons possibles).
- Un fil coupé s'affiche sectionné, avec une étincelle. Bon fil : le boîtier s'éteint (vert). Mauvais fil : flash rouge + alarme.

## Pièces d'information

| Pièce | Contenu |
|---|---|
| `cutter` | La liste des fils A–E (lettre + couleur) avec un bouton **Couper** par fil. Seule cette place peut couper. |
| `rulesA` | Règles 1 et 2 du manuel. |
| `rulesB` | Règle 3 du manuel (la règle « sinon »). |
| `serial` | Le numéro de série gravé sur le boîtier (ex. `BX-27`). |

Les règles s'appliquent **dans l'ordre** : la première qui s'applique décide.

## Répartition

| Joueurs | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 4 | `rulesA` | `serial` | `cutter` | `rulesB` |
| 3 | `rulesA` + `rulesB` | `serial` | `cutter` | — |
| 2 | `rulesA` + `rulesB` | `cutter` + `serial` | — | — |

## Génération

1. Tirer 5 couleurs.
2. Tirer un numéro de série `XX-NN`.
3. Tirer 3 règles dans une banque de règles (ex. « aucun fil jaune → coupe le 2e fil », « n° de série impair → coupe le dernier fil rouge », « plus d'un fil blanc → coupe le premier fil blanc »), la dernière étant toujours une règle « sinon, coupe … » pour garantir une solution.
4. Calculer la solution côté serveur (`state.solution = 'D'`). Elle n'est jamais envoyée au client.

## Actions

| Action (téléphone → serveur) | Qui | Résultat |
|---|---|---|
| `{ type: 'cut', wire: 'A'…'E' }` | place `cutter` | `solved` si c'est la solution, sinon `error` (le fil reste coupé, on peut retenter un autre fil) |

## Exemple

Fils : A rouge, B bleu, C jaune, D rouge, E blanc · série `BX-27`.
Règle 1 (aucun jaune) ne s'applique pas · règle 2 (série impaire) s'applique → **couper D**, le dernier rouge.

## Maquette

Toile « Maquettes UNLOCKERS », artboard *Module 01 · Boîtier à fils*.
