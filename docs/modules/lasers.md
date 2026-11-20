# 04 · Miroirs laser (`lasers`)

> **Statut : proposition** à valider par Alan. Responsable du code : Alan (module 4). Difficulté ★★★.

## En une phrase

Guider un laser jusqu'à un capteur en réglant des miroirs, sans que le faisceau traverse une caméra. Les caméras sont invisibles sur l'écran.

## Écran

- Une grille **7 × 5** avec un émetteur à gauche, un capteur à droite et **4 miroirs numérotés**.
- Le faisceau est tracé en direct selon l'orientation des miroirs.
- Laser allumé sur le capteur sans caméra traversée : le capteur passe au vert. Caméra traversée ou capteur manqué : alarme.

## Pièces d'information

| Pièce | Contenu |
|---|---|
| `mirrors` | Les 4 miroirs : orientation (`/` ou `\`), boutons **Tourner** et **Lever**, puis **Allumer le laser**. Seule cette place agit. |
| `cameras` | Le plan des caméras : les cases surveillées sur la même grille. |
| `notice` | La notice d'entretien : quels miroirs sont **bloqués** (impossibles à lever ou à tourner). |
| `ignition` | Le code d'allumage à 3 chiffres demandé au moment d'allumer. |

Un miroir **levé** laisse passer le faisceau tout droit.

## Répartition

| Joueurs | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 4 | `mirrors` | `notice` | `ignition` | `cameras` |
| 3 | `mirrors` | `cameras` + `ignition` | `notice` | — |
| 2 | `mirrors` + `notice` | `cameras` + `ignition` | — | — |

## Génération

1. Placer émetteur, capteur, 4 miroirs et 2 à 4 caméras.
2. Tirer les miroirs bloqués (0 à 2).
3. Vérifier par recherche exhaustive (2 orientations × levé ou non = 4 états par miroir, 256 combinaisons) qu'**au moins une** configuration atteint le capteur sans caméra en respectant les blocages, et que la configuration de départ **n'est pas** une solution.
4. Tirer le code d'allumage.

## Actions

| Action | Qui | Résultat |
|---|---|---|
| `{ type: 'rotate', mirror: 1…4 }` | place `mirrors` | `ok` (ou `INVALID_ACTION` si le miroir est bloqué, sans erreur comptée) |
| `{ type: 'lift', mirror: 1…4 }` | place `mirrors` | idem |
| `{ type: 'fire', code: '123' }` | place `mirrors` | `solved` si le code est bon et le faisceau valide ; sinon `error` |

## Exemple

Départ : le faisceau passe par les miroirs 1 et 2 puis traverse la caméra de la 4e ligne.
Solution : **lever le miroir 1**, le faisceau va jusqu'au miroir 3, descend au miroir 4 puis atteint le capteur.

## Maquette

Artboard *Module 04 · Miroirs laser*.
