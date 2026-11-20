# Fiches des modules

> **Statut : proposition.** Ces fiches viennent des maquettes visuelles (toile « Maquettes UNLOCKERS »). La conception des énigmes revient à Alan (voir [REPARTITION.md](../REPARTITION.md)) : tout ici peut être modifié, à condition de mettre à jour la fiche dans la même PR que le code.

Une fiche par module décrit ce que voit l'écran, ce que voit chaque place, les actions, la solution et la répartition des infos pour 2, 3 et 4 joueurs. Le format du code d'un module (`config.json`, `server.js`, `screen.js`, `phone.js`) est décrit dans [PLAN.md](../PLAN.md#contrat-dun-module).

| N° | Module | `id` proposé | Responsable (plan) | Mené par (à 4) | Difficulté |
|---|---|---|---|---|---|
| 01 | [Boîtier à fils](wires.md) | `wires` | Alan | Mèche (P3) | ★☆☆ |
| 02 | [Digicode du hall](keypad.md) | `keypad` | Sara | Byte (P1) | ★★☆ |
| 03 | [Disjoncteurs](breakers.md) | `breakers` | Basma | Crochet (P2) | ★★☆ |
| 04 | [Miroirs laser](lasers.md) | `lasers` | Alan | Vigie (P4) | ★★★ |
| 05 | [Coffre-fort](vault.md) (final) | `vault` | Les 3 | Toute l'équipe | ★★★ |

## Principes communs

- **Information asymétrique** : l'écran montre l'objet, chaque téléphone montre une **pièce** différente (contrôle, règle, valeur). Aucune place ne peut résoudre un module seule.
- **Pièces → places** : chaque module découpe ses infos en pièces, puis les distribue aux places **présentes** selon la table de sa fiche. Les personnages sont liés aux places (P1 Byte, P2 Crochet, P3 Mèche, P4 Vigie) : à 2 joueurs, seuls P1 et P2 existent.
- **Personne d'inactif** : à 4 joueurs, chaque place a au moins une pièce utile sur chaque module, puisque toute l'équipe regarde le module en focus.
- **Redistribution** : si un joueur ne revient pas après 60 s, le serveur rejoue la répartition avec les places restantes (table à n − 1 joueurs). `viewFor(state, slot, slots)` reçoit donc toujours la liste des places présentes et en déduit les pièces de `slot`.
- **Aléatoire** : toutes les valeurs (couleurs, symboles, tensions, positions) sont tirées avec le `rng` de la partie. Les exemples des fiches sont des exemples.
- **Erreurs** : une mauvaise action validée renvoie `error` (+1 alarme). Les actions « de réglage » (tourner un miroir, basculer un levier) ne comptent pas : seule la **validation** peut coûter une erreur.

## Personnages et places

| Place | Agent | Couleur | Spécialité (habillage des pièces) |
|---|---|---|---|
| P1 | Byte, la hackeuse | `#3EF0FF` | terminaux, codes, commandes à distance |
| P2 | Crochet, le crocheteur | `#FFD23E` | serrures, leviers, plaques gravées |
| P3 | Mèche, l'artificière | `#FF3EA5` | fils, détonateurs, schémas électriques |
| P4 | Vigie, le guetteur | `#3EFF8B` | caméras, rondes, plans de surveillance |

La spécialité ne sert qu'à habiller les textes : la logique ne dépend que de la place.
