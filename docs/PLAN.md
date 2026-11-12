# UNLOCKERS : plan du projet

> **Document de référence.** Ce fichier est le contexte à garder en tête pour tout le code du projet. Toute décision qui change les règles du jeu, l'architecture, le contrat d'événements ou le périmètre doit être reportée ici, **dans la même Pull Request** que le code concerné.

## Contexte

Projet Web ESME (semestre 1), en équipe : **Basma, Sara, Alan**.
**Échéance : vendredi 18/12/2026.** Ce jour-là on rend tout : le code, le rapport, le PowerPoint et la démo.

UNLOCKERS est un **jeu coopératif à information asymétrique**, dans l'esprit des jeux de désamorçage de bombe :
- un **écran commun** (navigateur d'un PC, idéalement projeté) montre la partie à tout le monde ;
- chaque joueur rejoint avec **son téléphone**, par code de salle ou QR code ;
- chaque téléphone affiche **des informations et des contrôles différents** ;
- personne ne peut gagner seul : les joueurs doivent **se parler** pour résoudre les modules avant la fin du chrono, sans dépasser le nombre d'erreurs autorisé.

Au semestre 2, une **application mobile native** remplacera la page téléphone. Le serveur et le protocole doivent donc être utilisables par un client natif, pas seulement par le navigateur : tout passe par l'API REST et Socket.IO, jamais par du rendu côté serveur.

## Décisions validées

> **Phaser et Socket.IO ne font pas le même travail : on utilise les deux.**
> - **Phaser** est le moteur d'**affichage** de l'écran commun (dessin, animations, sons). Il n'a **aucune fonction réseau**.
> - **Socket.IO** est la couche **réseau temps réel** : elle transporte les messages entre les téléphones, le serveur et l'écran.
>
> Une scène Phaser ne parle jamais directement à un téléphone : elle reçoit l'état du serveur via Socket.IO, puis l'affiche.

| Sujet | Décision |
|---|---|
| Langage | **JavaScript + JSDoc** (ES modules). Types documentés en JSDoc, `// @ts-check` encouragé. Pas de TypeScript. |
| Langue | **Code en anglais** (variables, fonctions, événements, fichiers), **docs, commentaires et rapport en français**. |
| Dépôt | **Monorepo npm workspaces** : un `npm install`, un `npm run dev`. |
| Écran commun | **Phaser 3** + Vite. |
| Téléphone | HTML / CSS / JavaScript + Vite, sans framework. |
| Serveur | **Node.js 22 LTS + Express + Socket.IO**. |
| Base de données | **SQLite + Drizzle ORM** (driver `better-sqlite3`). |
| Déploiement | **Un seul serveur** Node qui sert l'API, Socket.IO, l'écran (`/`) et le téléphone (`/play`). Hébergé sur Render ou Railway. |
| Autorité | **Le serveur fait autorité** : il détient l'état, valide toutes les actions et décide de qui voit quoi. Les clients ne font qu'**afficher** et **envoyer des actions**. On ne fait jamais confiance au client. |
| Qualité | **GitHub Actions** : lint + tests à chaque PR. `main` protégée : CI verte + 1 relecture obligatoires. |

## Règles du jeu

| Règle | Valeur par défaut |
|---|---|
| Joueurs | **2 à 4**. Places `P1` à `P4` attribuées dans l'ordre d'arrivée. |
| Durée | **5 minutes**. |
| Erreurs | **3 erreurs = défaite**. Pas de pénalité de temps. |
| Modules | **4 modules actifs dès le début + 1 module final**, verrouillé jusqu'à ce que les 4 autres soient résolus. |
| Victoire | Le module final est résolu avant la fin du chrono. |
| Défaite | Chrono à 0, ou 3e erreur, ou moins de 2 joueurs restants. |
| Génération | Chaque module est **généré aléatoirement** au lancement (graine aléatoire par partie), donc chaque partie est différente. |

### Déroulement d'une partie

```
LOBBY ──(bouton « Lancer » sur l'écran, ≥ 2 joueurs)──> PLAYING ──> WON | LOST
  ▲                                                       │
  └──────────────(bouton « Rejouer » sur l'écran)─────────┘
```

1. **Accueil** : l'écran commun crée une partie et affiche le code (4 caractères) et le QR code.
2. **Lobby** : les joueurs rejoignent depuis `/play` (QR code ou saisie du code) et choisissent un pseudo. L'écran affiche la liste en direct. Le bouton **« Lancer »** est actif dès **2 joueurs**. Maximum **4 joueurs**.
3. **Partie** : le serveur génère les modules et envoie à chaque téléphone sa propre vue. Le chrono démarre.
4. **Fin** : l'écran affiche victoire ou défaite, le temps et les erreurs. Le bouton **« Rejouer »** relance une partie avec **la même salle et les mêmes joueurs**, et de nouveaux modules générés.

Après le lancement, plus personne ne peut rejoindre la partie, sauf un joueur qui se **reconnecte** à sa place.

### Focus partagé

Plusieurs modules sont actifs en même temps, mais **toute l'équipe travaille sur un seul module à la fois** : le module « en focus ».
- L'écran commun met le module en focus en avant.
- **Tous les téléphones affichent la vue de ce module.**
- **N'importe quel joueur** peut changer le focus depuis son téléphone (liste des modules actifs) : tout le monde bascule. Un délai minimum de 2 s entre deux changements évite les bascules en boucle.
- Une action envoyée sur un module qui n'est pas en focus est refusée par le serveur.

### Déconnexion d'un joueur

1. **Déconnexion pendant la partie** : le chrono se met **en pause** et l'écran affiche « P2 déconnecté… ». Le joueur garde sa place et sa vue.
2. **Retour dans les 60 s** : le téléphone se reconnecte automatiquement avec son `playerId` (stocké dans le navigateur), et la partie reprend.
3. **Pas de retour après 60 s** : la partie **reprend sans lui**. Le serveur **redistribue ses informations** aux joueurs restants (les modules doivent savoir se répartir sur 2, 3 ou 4 places).
4. **Moins de 2 joueurs restants** : la partie s'arrête (défaite).

En lobby, un joueur déconnecté libère simplement sa place.

## Principe de travail : personne ne bloque personne

1. **Le contrat d'abord.** Les événements temps réel, les types partagés et le format des modules sont définis dans `shared/` **avant** d'être codés. Un changement de contrat passe par une PR relue par les 3, et par la mise à jour de ce plan.
2. **Un faux serveur dès le sprint 1.** Basma livre un `mock` qui rejoue des scénarios scriptés (lobby, partie, erreur, focus, déconnexion, victoire, défaite). Sara et Alan développent l'écran et le téléphone contre ce mock, sans attendre le vrai serveur.
3. **Chacun dans ses dossiers.**
   - A, Basma : `server/` ;
   - B, Sara : `screen/` ;
   - C, Alan : `phone/`.

   Exception : Basma code les scènes **Lobby** et **Fin** dans `screen/src/scenes/`, dans des fichiers séparés, à partir de la coquille Phaser livrée par Sara. Chaque module de `modules/` appartient à la personne qui le crée. `shared/` ne change que par PR relue par les 3.
4. **Une branche par tâche et une PR relue** par quelqu'un d'autre. Pas de push direct sur `main`.
5. **Intégration chaque fin de sprint** : le dimanche, `main` doit tourner de bout en bout.

## Répartition

Détail des tâches et technos dans [REPARTITION.md](REPARTITION.md).

| Rôle | Personne | Domaine |
|---|---|---|
| A | **Basma** | Serveur, temps réel, architecture, règles du jeu, BDD, CI, déploiement, scènes Lobby et Fin |
| B | **Sara** | Écran commun Phaser : coquille, scène Jeu, animations, sons, direction artistique |
| C | **Alan** | Page téléphone, contrôles, conception et équilibrage des modules |

| Module | Responsable | Sprint |
|---|---|---|
| Module 1 | Alan | S2 (module modèle) |
| Module 2 | Sara | S3 |
| Module 3 | Basma | S3 |
| Module 4 | Alan | S3 |
| Module final | Les 3 (conçu ensemble) | S4 |

La conception des mécaniques de chaque module (ce que voit chaque place, ce que voit l'écran, les actions, la solution) est décrite dans une fiche par module, dans `docs/modules/`.

## Architecture

```
[Écran commun]  Phaser 3 ───────┐
                                ├── Socket.IO + REST ──> [Serveur Node.js + Express] ──> [SQLite / Drizzle]
[Téléphones]    HTML/CSS/JS ────┘                         (état en mémoire, règles, modules)
```

- **État vivant en mémoire** dans le serveur (une instance `Game` par salle) : rapide et simple.
- **SQLite sert à sauvegarder** les parties, les joueurs, la progression et les résultats (historique, reprise après redémarrage, statistiques pour le rapport).
- **En production**, un seul processus Node sert tout : `/` (écran), `/play` (téléphone), `/api/*`, `/socket.io`.
- **En développement**, chaque frontend tourne sur son serveur Vite, avec un proxy vers le backend.

| Programme | Dev | Prod |
|---|---|---|
| Serveur (API + Socket.IO) | `http://localhost:3000` | même origine |
| Écran commun | `http://localhost:5173` (proxy `/api`, `/socket.io` → 3000) | `/` |
| Téléphone | `http://localhost:5174` (proxy idem) | `/play` |

Pour tester sur un vrai téléphone en dev : Vite avec `--host`, puis ouvrir `http://<IP-du-PC>:5174` sur le même Wi-Fi.

### Arborescence (monorepo npm workspaces)

```
UNLOCKERS/
├── package.json            # workspaces + scripts globaux (dev, test, lint, build, start)
├── shared/                 # @unlockers/shared : contrat commun (PR relue par les 3)
│   ├── events.js           # noms des événements Socket.IO
│   ├── constants.js        # règles par défaut, états, places P1-P4, codes d'erreur
│   └── types.js            # types JSDoc partagés (GameState, PlayerView, ModuleDefinition…)
├── modules/                # @unlockers/modules : un dossier par module
│   ├── index.js            # registre des modules
│   └── <module-id>/        # config.json, server.js, screen.js, phone.js, README.md
├── server/                 # @unlockers/server (Basma)
│   ├── src/
│   │   ├── index.js        # démarrage Express + Socket.IO, fichiers statiques en prod
│   │   ├── api/            # routes REST
│   │   ├── rooms/          # salles, codes, connexion, reconnexion
│   │   ├── game/           # machine à états, chrono, erreurs, focus, moteur de modules
│   │   └── db/             # schéma Drizzle, migrations, accès
│   ├── mock/               # faux serveur + scénarios scriptés
│   └── tests/
├── screen/                 # @unlockers/screen (Sara ; scènes Lobby/Fin par Basma)
│   └── src/
│       ├── main.js         # config Phaser
│       ├── net.js          # connexion Socket.IO
│       └── scenes/         # LobbyScene, GameScene, EndScene
├── phone/                  # @unlockers/phone (Alan)
│   └── src/
│       ├── main.js
│       ├── net.js
│       ├── pages/          # join, lobby, game, end
│       └── controls/       # contrôles réutilisables (boutons, saisie, interrupteurs, fils…)
├── docs/                   # PLAN.md, REPARTITION.md, modules/, architecture
└── .github/workflows/ci.yml
```

### Contrat d'un module

Tous les modules ont **la même forme**. Ajouter un module revient à ajouter un dossier et une ligne dans `modules/index.js`, sans toucher au moteur.

```
modules/<module-id>/
 ├── config.json   → id, nom, joueurs min/max (2-4), final ou non
 ├── server.js     → logique, exécutée uniquement sur le serveur
 ├── screen.js     → rendu sur l'écran commun (Phaser)
 ├── phone.js      → rendu sur le téléphone (DOM)
 └── README.md     → mécanique, solution, répartition des infos selon 2/3/4 joueurs
```

```js
// modules/<module-id>/server.js
/** @type {import('@unlockers/shared/types.js').ModuleDefinition} */
export default {
  /** Génère l'état du module. `slots` = places présentes (['P1','P2',…]), `rng` = aléatoire de la partie. */
  setup({ slots, rng }) { return state },

  /** Ce que voit le joueur `slot` (doit marcher pour 2, 3 ou 4 joueurs). */
  viewFor(state, slot, slots) { return view },

  /** Ce que voit l'écran commun. */
  screenView(state) { return view },

  /** Action d'un joueur. */
  handleAction(state, slot, action) { return { result: 'ok' | 'error' | 'solved', state } },
}
```

- `screen.js` exporte `render(scene, view)` et `onResult(scene, result)` pour les animations.
- `phone.js` exporte `render(container, view, send)`, où `send(action)` envoie l'action au serveur.
- **Le code de `server.js` n'est jamais envoyé au client** : il contient les solutions.

### API REST

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/games` | Crée une partie. Renvoie `{ code, joinUrl }` |
| `GET` | `/api/games/:code` | Existe ? Statut et nombre de joueurs (pour la page « rejoindre ») |
| `GET` | `/api/games/:code/qr` | QR code (SVG) de `joinUrl` |
| `GET` | `/api/health` | Le serveur tourne |

- **Code de salle** : 4 caractères en majuscules, sans caractères ambigus (pas de `O`, `0`, `I`, `1`).
- **Lien pour rejoindre** : `/play?code=XXXX`.

### Contrat d'événements Socket.IO (v1)

- **Une room Socket.IO par partie**, nommée par le code de salle.
- L'écran rejoint la room en tant qu'écran.
- Chaque téléphone reçoit **ses propres** messages `player:view`.
- Les noms vivent dans `shared/events.js`. On n'écrit **jamais** un nom d'événement « en dur ».

**Écran → serveur**

| Événement | Données | Rôle |
|---|---|---|
| `screen:join` | `{ code }` | L'écran s'abonne à la partie |
| `game:start` | `{}` | Lance la partie (≥ 2 joueurs) |
| `game:restart` | `{}` | Rejouer avec les mêmes joueurs |

**Téléphone → serveur**

| Événement | Données | Rôle |
|---|---|---|
| `player:join` | `{ code, nickname, playerId? }` | Rejoindre, ou se reconnecter avec `playerId` |
| `module:focus` | `{ moduleId }` | Demande à mettre un module en focus pour toute l'équipe |
| `module:action` | `{ moduleId, action }` | Action sur le module en focus |

**Serveur → client(s)**

| Événement | Destinataire | Données | Rôle |
|---|---|---|---|
| `player:joined` | le téléphone | `{ playerId, slot }` | Confirme la place (à stocker pour la reconnexion) |
| `lobby:update` | tous | `{ players: [{ slot, nickname, connected }], canStart }` | Lobby en direct |
| `game:state` | écran | `{ status, timeLeft, errors, maxErrors, focusedModuleId, modules: [{ id, status, view }], players }` | État complet pour l'écran |
| `player:view` | chaque téléphone | `{ status, focusedModuleId, modules: [{ id, status }], view }` | Vue propre à ce joueur pour le module en focus |
| `module:result` | tous | `{ moduleId, slot, result }` | Pour les animations et les vibrations |
| `game:tick` | tous | `{ timeLeft }` | Chrono, une fois par seconde |
| `game:paused` | tous | `{ reason: 'player_disconnected', slot, resumeDeadline }` | Pause sur déconnexion |
| `game:resumed` | tous | `{ redistributed: boolean }` | Reprise (joueur revenu ou infos redistribuées) |
| `game:over` | tous | `{ result: 'won' \| 'lost', reason, time, errors }` | Fin de partie |
| `error` | le client fautif | `{ code, message }` | `GAME_NOT_FOUND`, `GAME_FULL`, `GAME_STARTED`, `NOT_FOCUSED`, `INVALID_ACTION`… |

**Règle de reconnexion** : à chaque reconnexion, le serveur renvoie immédiatement l'état complet (`game:state` ou `player:view`). Un client ne suppose jamais qu'il a reçu tous les événements.

### Modèle de données (SQLite + Drizzle)

| Table | Colonnes principales |
|---|---|
| `games` | id, code, status, seed, duration, maxErrors, errors, result, endReason, createdAt, startedAt, endedAt |
| `players` | id (= `playerId`), gameId, nickname, slot, connected, lastSeenAt |
| `module_states` | id, gameId, moduleId, status, state (JSON), solvedAt |
| `game_events` | id, gameId, at, type, payload (JSON) |

`game_events` sert d'historique : debug, statistiques et matière pour le rapport. On écrit en base aux moments clés (création, joueur, lancement, module résolu, erreur, fin), pas à chaque tick.

### Commandes

| Commande | Rôle |
|---|---|
| `npm install` | Installe tout le monorepo |
| `npm run dev` | Lance serveur + écran + téléphone en parallèle |
| `npm run dev:mock` | Lance le mock à la place du vrai serveur |
| `npm test` | Tests Vitest (serveur + modules) |
| `npm run lint` | ESLint + Prettier |
| `npm run build` | Build de l'écran et du téléphone |
| `npm start` | Production : un seul serveur qui sert tout |

Variables d'environnement (`.env`, modèle dans `.env.example`) : `PORT`, `DB_FILE`, `PUBLIC_URL`, et en option `GAME_DURATION` et `MAX_ERRORS` pour les tests.

## Conventions

- **Branches** : `feat/<sujet>`, `fix/<sujet>`, `test/<sujet>`, `docs/<sujet>`, `chore/<sujet>` (ex. `feat/lobby-scene`).
- **Commits** : courts, en français, à l'impératif (« Ajoute la scène Lobby », « Corrige la reconnexion »).
- **Pull Requests** : une PR par tâche Notion, avec le titre de la tâche, ce qui a été fait et comment tester. CI verte + 1 relecture avant fusion.
- **Code** : ES modules, `const` par défaut, pas de nom d'événement en dur, JSDoc sur toutes les fonctions exportées.

## Tests (au fil de l'eau)

Chaque rôle teste sa partie **dans le sprint où il la code**, pas à la fin. La CI lance `lint` + `test` sur chaque PR.

| Rôle | Quoi tester | Comment |
|---|---|---|
| A, Basma | Règles (chrono, 3 erreurs, victoire/défaite), focus, pause et redistribution, salles et codes | **Vitest** + tests d'intégration Socket.IO avec 2 à 4 faux clients |
| Tous les modules | `setup`, `viewFor` pour 2, 3 et 4 joueurs, `handleAction` (bonne réponse, erreur, résolu) | **Vitest**, un fichier de test par module (écrit par son auteur) |
| B, Sara | Scènes avec chaque scénario du mock, animations sur `module:result`, plusieurs tailles d'écran | Scénarios mock + checklist manuelle |
| C, Alan | Rejoindre (QR, code, mauvais code, partie pleine, partie lancée), vue de chaque place, focus, reconnexion après veille | Vrais téléphones iOS et Android + checklist manuelle |
| Tous | Partie complète de bout en bout | **Partie test à chaque fin de sprint**, bugs ajoutés en tâches |

## Planning : sprints d'une semaine (lundi → dimanche)

| Sprint | Dates | Objectif | Livrable de fin de sprint |
|---|---|---|---|
| **S0** | 12 → 15/11 | Mise en place | Plan validé, monorepo, contrat v1 dans `shared/`, CI, tâches |
| **S1** | 16 → 22/11 | Squelettes indépendants | Mock, serveur + salles, coquille Phaser + Lobby, page rejoindre, fiches des modules |
| **S2** | 23 → 29/11 | Première partie de bout en bout | Lobby réel + focus + module 1 jouable à 2 téléphones |
| **S3** | 30/11 → 06/12 | Contenu du jeu | Modules 2, 3, 4, chrono, erreurs, victoire/défaite, BDD, plan du rapport |
| **S4** | 07 → 13/12 | Module final et stabilisation | Module final, pause/reconnexion/redistribution, rejouer, déploiement, rapport avancé, PowerPoint en brouillon |
| **S5** | 14 → 18/12 | Rendu | Plus de nouvelles fonctionnalités : bugs, recette, rapport et PowerPoint finaux, répétition, **démo le 18/12** |

Le **rapport et le PowerPoint** démarrent dès le S3 (plan du rapport, captures, schémas), en parallèle du code.

## Périmètre

- **Indispensable pour la démo** :
  - créer et rejoindre une partie (code + QR), 2 à 4 joueurs ;
  - 4 modules + 1 module final ;
  - focus partagé, chrono de 5 min, 3 erreurs, victoire/défaite, rejouer ;
  - temps réel fiable, déployé en ligne.
- **Important** : pause et reconnexion, redistribution des infos, sauvegarde en BDD, sons et animations, vibrations sur téléphone.
- **Bonus** : réglage de la difficulté dans le lobby, classement des meilleurs temps, mini-jeu gyroscope.
- **Hors périmètre S1** : comptes utilisateurs, application mobile native (S2), vraie 3D.

## Évolutions envisagées (semestre 2)

- **Application mobile native** à la place de la page `/play`, branchée sur le même protocole.
- **Assistant robot** : quand un joueur abandonne, un bot prend sa place et partage ses informations sous forme de bulles de dialogue, au lieu de les redistribuer.

## Risques

- **Wi-Fi de l'école** qui bloque les connexions entre appareils → démo sur la version déployée en ligne (S4) + vidéo de secours.
- **Téléphone en veille / réseau perdu** → pause de 60 s, reconnexion par `playerId`, redistribution.
- **Contrat qui change en cours de route** → PR relue par les 3 + mise à jour de ce plan.
- **Trop d'ambition (4 modules + final)** → le module 4 et le final sont les premiers à simplifier si le S3 prend du retard. Mieux vaut 3 modules solides que 5 fragiles.

## Points ouverts

- Mécaniques des 4 modules et du module final (Alan + équipe, S0-S1).
- Direction artistique de l'écran commun (Sara + équipe, S1).
- Hébergement final : Render ou Railway (Basma, S4).
- Consignes exactes du rapport et de la soutenance (à récupérer auprès du prof).
