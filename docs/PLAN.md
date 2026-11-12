# UNLOCKERS : plan du projet

> **Document de référence.** Ce fichier est le contexte à garder en tête pour tout le code du projet. Toute décision qui change l'architecture, le contrat d'événements ou le périmètre doit être reportée ici, dans la même Pull Request.

## Contexte

Projet Web ESME (semestre 1), en équipe : **Basma, Sara, Alan**.
**Échéance : vendredi 18/12/2026.** Ce jour-là on rend tout : le code, le rapport, le PowerPoint et la démo.

UNLOCKERS est un **jeu coopératif à information asymétrique**, dans l'esprit des jeux de désamorçage de bombe :
- un **écran commun** (site web) montre la partie à tout le monde ;
- chaque joueur rejoint avec **son téléphone** (code de salle ou QR code) ;
- chaque téléphone affiche **des informations et des contrôles différents** ;
- personne ne peut gagner seul : les joueurs doivent **se parler** pour résoudre des modules qui dépendent les uns des autres, avant la fin du chrono et sans dépasser le nombre d'erreurs autorisé.

Au semestre 2, une **application Android** remplacera le côté téléphone. Le serveur et le protocole doivent donc être utilisables par un client natif, pas seulement par le navigateur.

## Décisions validées

- **Langage** : JavaScript partout (ES modules), avec un frontend et un backend.
- **Écran commun** : **Phaser 3** + Vite.
- **Téléphone** : HTML / CSS / JavaScript + Vite (pas de framework imposé).
- **Serveur** : **Node.js + Express + Socket.IO**.
- **Base de données** : **SQLite** (via Prisma ou Drizzle, choix de Basma au sprint 1).
- **Le serveur fait autorité** : il détient l'état de la partie, valide toutes les actions et décide de qui voit quoi. Les clients (écran et téléphones) ne font qu'**afficher** et **envoyer des actions**. On ne fait jamais confiance au client.
- **Répartition par couche** (détail dans [REPARTITION.md](REPARTITION.md)) :
  - **A, Basma** : backend, temps réel, architecture, règles du jeu, lobby, écran de fin ;
  - **B, Sara** : écran commun Phaser ;
  - **C, Alan** : téléphones et conception des modules.
- **Chacun crée au moins un module de jeu de bout en bout** (serveur, écran, téléphone).

## Principe de travail : personne ne bloque personne

1. **Le contrat d'abord.** Les événements temps réel et le format des modules sont définis dans `shared/` **avant** d'être codés. Un changement de contrat passe par une PR relue par les 3.
2. **Un faux serveur dès le sprint 1.** Basma livre un `mock-server` qui rejoue des événements scriptés. Sara et Alan développent l'écran et le téléphone contre ce mock, sans attendre le vrai serveur.
3. **Chacun dans ses dossiers.** A : `backend/`, B : `frontend/screen/`, C : `frontend/phone/`. Exception : Basma code les scènes **Lobby** et **Fin** dans `frontend/screen/scenes/`, dans des fichiers séparés, à partir de la coquille Phaser livrée par Sara. Chaque module de `modules/` appartient à la personne qui le crée. `shared/` ne change que par PR relue par les 3.
4. **Une branche par tâche et une PR relue** par quelqu'un d'autre. Pas de push direct sur `main`.
5. **Intégration chaque fin de sprint** : le dimanche, `main` doit tourner de bout en bout.

## Structure du jeu

```
PARTIE
 ├── Lobby      → code de salle, QR, joueurs qui rejoignent, lancement
 ├── En jeu     → plusieurs MODULES actifs, chrono qui tourne, compteur d'erreurs
 └── Fin        → victoire (tous les modules résolus) ou défaite (chrono à 0 ou trop d'erreurs)
```

- **Partie** : code de salle, liste des joueurs, chrono, erreurs, état (`lobby` → `playing` → `won` | `lost`).
- **Joueur** : un téléphone, un pseudo, une **place** (`P1`, `P2`, `P3`, `P4`) et un état de connexion.
- **Module** : la brique de jeu. Chaque module a un état (`locked` → `active` → `solved`). Il distribue **une vue différente à chaque joueur**, reçoit les actions des joueurs et répond `ok`, `erreur` ou `résolu`. Un module peut en **débloquer** d'autres.
- **Règles globales** (serveur) : durée de la partie, nombre d'erreurs autorisées, effet d'une erreur (pénalité de temps par exemple), répartition des vues selon le nombre de joueurs (2 à 4).

### Contrat d'un module

Tous les modules ont **la même forme**. Ajouter un module revient à ajouter un dossier, sans toucher au moteur :

```
modules/<id-module>/
 ├── config.json   → id, nom, joueurs min/max, dépendances, paramètres
 ├── server.js     → logique (côté backend)
 ├── screen.js     → affichage sur l'écran commun (Phaser)
 └── phone.js      → interface sur chaque téléphone
```

```js
// modules/<id>/server.js
export default {
  // Crée l'état du module (aléatoire pour que chaque partie soit différente)
  setup({ players, rng }) { return state },
  // Ce que voit chaque joueur : une vue par place (P1, P2…)
  viewFor(state, playerSlot) { return view },
  // Ce que voit l'écran commun
  screenView(state) { return view },
  // Une action d'un joueur → { result: 'ok' | 'error' | 'solved', state }
  handleAction(state, playerSlot, action) { return { result, state } },
}
```

`screen.js` exporte une fonction qui reçoit la scène Phaser et la vue écran. `phone.js` exporte une fonction qui reçoit un conteneur DOM, la vue du joueur et une fonction `send(action)`.

## Architecture

```
[Écran commun]  Phaser 3 + Vite ──┐
                                  ├── Socket.IO ──> [Serveur Node.js + Express] ──> [SQLite]
[Téléphones]    HTML/JS + Vite ───┘                  (état de la partie, règles, modules)
```

### Arborescence cible

```
UNLOCKERS/
├── shared/              # partagé par tout le monde (modifié par PR uniquement)
│   ├── events.js        # noms des événements Socket.IO
│   └── constants.js     # états, places des joueurs, règles par défaut
├── modules/             # un dossier par module (contrat ci-dessus)
├── backend/             # A, Basma
│   ├── src/
│   │   ├── server.js    # Express + Socket.IO
│   │   ├── api/         # routes REST
│   │   ├── rooms/       # création de salle, rejoindre, reconnexion
│   │   ├── game/        # machine à états, chrono, erreurs, chargement des modules
│   │   └── db/          # schéma et accès SQLite
│   ├── mock/            # faux serveur pour B et C
│   └── tests/
├── frontend/
│   ├── screen/          # B, Sara : écran commun Phaser (scènes Lobby, Jeu, Fin)
│   └── phone/           # C, Alan : page rejoindre + interface joueur
└── docs/                # PLAN.md, REPARTITION.md, architecture, rapport
```

### API REST (première version)

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/games` | Crée une partie et renvoie `{ code, joinUrl }` |
| `GET` | `/api/games/:code` | État public d'une partie (pour vérifier qu'un code existe) |
| `GET` | `/api/games/:code/qr` | QR code du lien pour rejoindre |
| `GET` | `/api/health` | Vérifie que le serveur tourne |

### Contrat d'événements Socket.IO (v0, à figer au sprint 0)

Une **room Socket.IO par partie** (le code de salle). L'écran et les téléphones sont dans la même room, mais chaque téléphone reçoit **sa propre vue**.

| Sens | Événement | Données | Rôle |
|---|---|---|---|
| écran → serveur | `screen:join` | `{ code }` | L'écran s'abonne à la partie |
| téléphone → serveur | `player:join` | `{ code, nickname, playerId? }` | Rejoindre (ou se reconnecter avec `playerId`) |
| serveur → téléphone | `player:joined` | `{ playerId, slot }` | Confirme la place du joueur |
| serveur → tous | `lobby:update` | `{ players: [{ slot, nickname, connected }] }` | Liste des joueurs en direct |
| écran → serveur | `game:start` | `{}` | Lance la partie |
| serveur → écran | `game:state` | `{ status, timeLeft, errors, maxErrors, modules: [screenView] }` | État complet de l'écran |
| serveur → téléphone | `player:view` | `{ modules: [viewFor(slot)] }` | Vue propre à ce joueur |
| téléphone → serveur | `module:action` | `{ moduleId, action }` | Action d'un joueur sur un module |
| serveur → tous | `module:result` | `{ moduleId, result: 'ok' \| 'error' \| 'solved' }` | Pour les animations et les vibrations |
| serveur → tous | `game:tick` | `{ timeLeft }` | Chrono (une fois par seconde) |
| serveur → tous | `game:over` | `{ result: 'won' \| 'lost', time, errors }` | Fin de partie |
| serveur → client | `error` | `{ code, message }` | Code invalide, partie pleine, action refusée… |

Les noms vivent dans `shared/events.js`. On n'écrit jamais un nom d'événement « en dur » dans le code.

### Modèle de données (SQLite)

- `Game` : id, code, status, maxErrors, duration, startedAt, endedAt, result, errors
- `Player` : id, gameId, nickname, slot, connected, lastSeenAt
- `ModuleState` : id, gameId, moduleId, status, state (JSON), solvedAt
- `GameEvent` *(optionnel)* : id, gameId, at, type, payload (JSON). Historique d'une partie, utile pour le debug et pour le rapport.

L'état vivant d'une partie est **en mémoire** sur le serveur (rapide). La base sert à **sauvegarder** (reprise après redémarrage, historique, résultats).

## Tests (au fil de l'eau)

Chaque rôle teste sa partie **dans le sprint où il la code**, pas à la fin.

| Rôle | Quoi tester | Comment |
|---|---|---|
| A, Basma | Règles (chrono, erreurs, victoire/défaite), `handleAction` de chaque module, création et accès aux salles | **Vitest** (tests unitaires) + test d'intégration Socket.IO (2 faux clients) |
| B, Sara | Chaque scène s'affiche avec les données du mock, réaction à chaque `module:result`, rendu sur plusieurs tailles d'écran | Scénarios rejoués avec le mock + checklist manuelle |
| C, Alan | Parcours rejoindre (code, QR, mauvais code), vue de chaque place, contrôles tactiles, reconnexion après mise en veille | Tests sur **vrais téléphones** (iOS et Android) + checklist manuelle |
| Tous | Partie complète de bout en bout | **Partie test chaque fin de sprint** à 3 téléphones, bugs notés dans les tâches |

## Planning : sprints d'une semaine (lundi → dimanche)

| Sprint | Dates | Objectif | Livrable de fin de sprint |
|---|---|---|---|
| **S0** | 12 → 15/11 | Mise en place | Plan validé, contrat v0, outils, tâches dans Notion |
| **S1** | 16 → 22/11 | Squelettes indépendants | Serveur + lobby, mock, écran lobby, page rejoindre, chacun contre le mock |
| **S2** | 23 → 29/11 | Première partie de bout en bout | Lobby réel + 1 module jouable à 2 téléphones |
| **S3** | 30/11 → 06/12 | Contenu du jeu | 3 modules, chrono, erreurs, victoire/défaite, BDD |
| **S4** | 07 → 13/12 | Stabilisation | Déploiement en ligne, reconnexion, finitions visuelles, rapport bien avancé, PowerPoint en brouillon |
| **S5** | 14 → 18/12 | Rendu | Bugs corrigés, rapport et PowerPoint finaux, répétition, **démo le 18/12** |

Le **rapport et le PowerPoint** démarrent dès le S3 (plan du rapport, captures, schémas), en parallèle du code, pour ne pas tout faire la dernière semaine.

## Périmètre

- **Indispensable pour la démo** : créer et rejoindre une partie (code + QR), 2 à 4 joueurs, au moins **3 modules** coopératifs, chrono, erreurs, victoire/défaite, temps réel fiable, déployé en ligne.
- **Important** : reconnexion d'un joueur, sauvegarde en BDD, sons et animations.
- **Bonus** : plus de modules, niveaux de difficulté, mini-jeu gyroscope sur téléphone, classement des meilleurs temps.
- **Hors périmètre S1** : comptes utilisateurs, application Android (S2), vraie 3D.

## Risques

- **Wi-Fi de l'école** qui bloque les connexions entre appareils → déployer en ligne (Render ou Railway) dès le S4 et faire la démo sur la version en ligne.
- **Téléphone en veille ou réseau perdu** → reconnexion avec `playerId` et état renvoyé au retour.
- **Contrat qui change en cours de route** → toute modification passe par PR + mise à jour de ce fichier.
- **Trop d'ambition** → 3 modules solides valent mieux que 6 fragiles.

## Points ouverts

- Prisma ou Drizzle pour SQLite (Basma, S1).
- Liste et mécaniques des modules (Alan, avec l'équipe, S0-S1).
- Direction artistique de l'écran commun (Sara, avec l'équipe, S1).
- Hébergement final : Render ou Railway (Basma, S4).
- Consignes exactes du rapport et de la soutenance (à récupérer auprès du prof).
