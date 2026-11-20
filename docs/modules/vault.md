# 05 · Coffre-fort, module final (`vault`)

> **Statut : proposition** à valider par l'équipe (module final conçu à trois). Difficulté ★★★. `config.json` : `final: true`, verrouillé tant que les modules 01 à 04 ne sont pas résolus.

## En une phrase

Chaque joueur tourne **sa** molette, mais la cible de chacun est affichée sur le téléphone d'**un autre**. Une fois tout aligné, tout le monde maintient le bouton en même temps.

## Écran

- Une porte de coffre avec **un anneau par joueur présent**, aux couleurs des agents (de l'extérieur vers l'intérieur : P4, P3, P2, P1).
- Un repère en haut : un anneau est « aligné » quand son symbole est sous le repère.
- À droite : l'état de chaque agent (aligné ✓ ou « tourne… ») et une jauge de **maintien simultané** (« 2 agents sur 4 maintiennent »).
- Victoire : la porte pivote et s'ouvre (enchaîne sur la scène Fin).

## Pièces d'information

Chaque place a **sa molette** (`dial`) et la **cible d'une autre place** (`targetOf`).

| Pièce | Contenu |
|---|---|
| `dial` | Sa molette (symbole courant, boutons ↺ ↻) et le bouton **Maintenir appuyé**. |
| `targetOf(X)` | Le symbole cible de la place X, avec le nom de son agent (« Cible de Mèche : ● »). |

## Répartition

La correspondance « qui voit la cible de qui » est un **dérangement** tiré au hasard : une permutation des places présentes sans point fixe, pour que personne ne voie sa propre cible.

| Joueurs | Exemple de tirage |
|---|---|
| 4 | P1 → cible de P4 · P2 → cible de P3 · P3 → cible de P1 · P4 → cible de P2 |
| 3 | P1 → cible de P2 · P2 → cible de P3 · P3 → cible de P1 |
| 2 | P1 → cible de P2 · P2 → cible de P1 |

En cas de redistribution (joueur parti), on retire son anneau et on tire un nouveau dérangement.

## Génération

1. Pour chaque place présente, tirer une position de départ et un symbole cible (8 symboles par anneau), départ ≠ cible.
2. Tirer le dérangement.

## Actions

| Action | Qui | Résultat |
|---|---|---|
| `{ type: 'turn', dir: -1 \| 1 }` | chaque place, sur **sa** molette | `ok` |
| `{ type: 'hold', down: true \| false }` | chaque place | `ok` ; quand **toutes** les places présentes maintiennent **et** que tous les anneaux sont alignés pendant **3 s**, `solved` |

Relâcher pendant les 3 s alors que tout le monde maintenait : `error`. Maintenir alors que son anneau n'est pas aligné : refusé sans erreur (le bouton reste grisé sur le téléphone).

> Point à trancher avec Basma : le maintien simultané demande que le serveur suive les `hold` de chaque place avec un minuteur de 3 s. C'est le seul module avec une action « continue » : à valider avant de figer le contrat.

## Maquette

Artboard *Module 05 · Coffre-fort final*.
