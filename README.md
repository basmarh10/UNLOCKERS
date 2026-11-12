# UNLOCKERS

**L'escape game multijoueur : chacun a une partie de la solution, sur son propre téléphone.**

Projet Web, ESME · Sara El Abassi, Alan André, Basma Rhilane

---

## Le concept

| Élément | Rôle |
|---|---|
| **Écran commun** (site web) | Affiche la salle et l'histoire pour tous les joueurs |
| **Un téléphone par joueur** | On rejoint avec un code de salle ou un QR code, et chaque téléphone affiche des infos différentes |
| **Coopération** | Les énigmes s'enchaînent d'un joueur à l'autre : personne ne peut s'échapper seul |

Exemple : Sara a un code → Basma en a besoin pour obtenir une clé → Alan utilise la clé pour ouvrir le coffre.

## Déroulement d'une partie

1. **Lancer** : le site affiche l'histoire, un code de salle et un QR code.
2. **Rejoindre** : chaque joueur scanne le QR code avec son téléphone.
3. **Jouer** : chaque téléphone montre des indices différents.
4. **S'échapper** : ensemble, les joueurs résolvent les énigmes et ouvrent la porte.

Au centre, un serveur synchronise tout en temps réel entre l'écran commun et les téléphones.

## Briques techniques

- **Temps réel** : écran et téléphones toujours synchronisés
- **Sessions et joueurs** : créer une salle, rejoindre une partie, attribuer les rôles
- **Base de données** : énigmes, parties et progression des joueurs
- **Conception d'énigmes** : des énigmes qui dépendent les unes des autres

## Périmètre du semestre 1

- Une salle de jeu jouable
- Plusieurs joueurs, chacun sur son téléphone
- Quelques énigmes qui se complètent
- Une démo à la fin

Semestre 2 : une application Android reprendra le côté téléphone. Le backend doit donc pouvoir servir aussi un client mobile natif.

## Équipe

| Rôle | Personne | Domaine |
|---|---|---|
| A | Basma | Backend, temps réel, architecture système |
| B | Sara | Écran commun (Phaser) |
| C | Alan | Téléphones et conception des énigmes |

Détail des tâches et technos : [docs/REPARTITION.md](docs/REPARTITION.md)

**Plan de référence (architecture, contrat d'événements, sprints, tests) : [docs/PLAN.md](docs/PLAN.md)**

## Structure du dépôt

```
UNLOCKERS/
├── shared/     # Contrat commun : événements, constantes, types JSDoc
├── modules/    # Un dossier par module de jeu
├── server/     # Serveur Node.js : Express, Socket.IO, règles, SQLite (Basma)
├── screen/     # Écran commun Phaser 3 (Sara)
├── phone/      # Page téléphone HTML/CSS/JS (Alan)
└── docs/       # Plan, répartition, fiches des modules
```
