# 02 · Digicode du hall (`keypad`)

> **Statut : proposition** à valider par Alan. Responsable du code : Sara (module 2). Difficulté ★★☆.

## En une phrase

Taper un code à 4 chiffres : l'écran ne montre que des symboles, la table « symbole → chiffre » est éclatée entre plusieurs téléphones, et l'ordre des symboles est connu d'une seule place.

## Écran

- Un clavier de **9 touches à symboles**, sans chiffres (◆ ▲ ● ★ ■ ✚ ♠ ♥ ◐, positions tirées au hasard).
- Un afficheur à 4 cases qui se remplit au fur et à mesure de la saisie (chiffres en vert).
- Mauvais code validé : l'afficheur clignote en rouge et se vide.

## Pièces d'information

| Pièce | Contenu |
|---|---|
| `keypad` | Le pavé numérique 0–9 + **Effacer** + **Valider**. Seule cette place tape. |
| `order` | La « caméra du hall » : les 4 symboles du code, dans l'ordre. |
| `tableA` / `tableB` / `tableC` | La table symbole → chiffre, découpée en parts (3 symboles chacune). |

## Répartition

| Joueurs | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 4 | `keypad` + `tableA` | `tableB` | `tableC` | `order` |
| 3 | `keypad` + `tableA` | `tableB` + `tableC` | `order` | — |
| 2 | `keypad` + `tableA` + `tableB` | `order` + `tableC` | — | — |

> La maquette téléphone actuelle montre une table coupée en deux (P1 4 symboles, P4 5 symboles) : c'est une simplification. À 4 joueurs, la table en trois parts occupe aussi P2 et P3.

## Génération

1. Placer les 9 symboles sur le clavier de l'écran.
2. Attribuer un chiffre distinct à chaque symbole.
3. Tirer 4 symboles (distincts) pour le code ; la solution est la suite de leurs chiffres.

## Actions

| Action | Qui | Résultat |
|---|---|---|
| `{ type: 'digit', value: 0…9 }` | place `keypad` | `ok` (le chiffre s'affiche à l'écran) |
| `{ type: 'clear' }` | place `keypad` | `ok` |
| `{ type: 'submit' }` | place `keypad` | `solved` si les 4 chiffres sont bons, sinon `error` et l'afficheur se vide |

## Exemple

Ordre : ◆ ▲ ● ✚ · table : ◆ = 4, ▲ = 9, ● = 1, ✚ = 6 → **code 4916**.

## Maquettes

Artboards *Écran · Partie (module en focus)*, *Téléphone · Digicode vu par P1* et *vu par P4*.
