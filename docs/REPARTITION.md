# Répartition des tâches : UNLOCKERS

UNLOCKERS est un jeu coopératif à information asymétrique, dans l'esprit des jeux de désamorçage de bombe. L'écran commun montre la partie, chaque téléphone affiche des informations et des contrôles différents, et les joueurs doivent se parler pour réussir.

## Résumé

| Rôle | Personne | Domaine |
|---|---|---|
| **A** | **Basma** | Backend, temps réel et architecture système, plus les règles du jeu, le lobby et l'écran de fin |
| **B** | **Sara** | Écran commun en Phaser : affichage, animations, sons, direction artistique |
| **C** | **Alan** | Téléphones et conception des énigmes : interface de chaque joueur, contrôles, mécaniques des énigmes |

Chacun crée aussi **au moins un module de bout en bout** (règle côté serveur, affichage Phaser, interface téléphone) : module 1 et module 4 pour Alan, module 2 pour Sara, module 3 pour Basma. Le module final est conçu à trois. Règles du jeu, architecture et contrat : voir [PLAN.md](PLAN.md).

## Détail par rôle

| Nom | Tâches | Technos possibles |
|---|---|---|
| **Basma**<br>*Rôle A : backend, temps réel, architecture système* | • **Architecture** : schéma du système, `docs/architecture.md`, choix techniques<br>• **Serveur** : mise en place du serveur et de sa structure<br>• **API REST** : créer une partie, récupérer son état, résultats<br>• **Temps réel** : contrat d'événements, salles, synchronisation écran ↔ téléphones<br>• **Sessions et joueurs** : code de salle, rejoindre, reconnexion, nombre de joueurs<br>• **Règles du jeu** : état de la partie, erreurs autorisées, chrono, répartition « qui voit quoi », validation des actions<br>• **Base de données** : modèle (parties, joueurs, énigmes, progression)<br>• **Scènes Lobby et Fin** (dans la coquille Phaser de Sara) : code, QR, joueurs connectés, résultat, rejouer<br>• **Focus partagé, pause et redistribution** en cas de déconnexion<br>• **CI** GitHub Actions<br>• **Déploiement** : mise en ligne pour la démo<br>• **Module 3** de bout en bout | • **Node.js 22** + **Express**<br>• **Socket.IO** (rooms, reconnexion, clients natifs disponibles pour le S2)<br>• **npm workspaces** (monorepo)<br>• **GitHub Actions** (CI : lint + tests)<br>• **SQLite** + **Drizzle ORM** (`better-sqlite3`)<br>• **qrcode** (génération du QR)<br>• **nanoid** (codes de salle)<br>• **Zod** (validation des messages reçus)<br>• **Vitest** (tests des règles du jeu)<br>• **Render** ou **Railway** (hébergement gratuit)<br>• **Mermaid** ou **draw.io** (schémas d'architecture) |
| **Sara**<br>*Rôle B : écran commun (Phaser)* | • **Coquille Phaser** : configuration du jeu, gestion des scènes<br>• **Affichage de la bombe / salle** et de ses modules<br>• **Modules à l'écran** : ce que tout le monde voit pour chaque énigme<br>• **Réactions au temps réel** : afficher les réussites et erreurs envoyées par le serveur<br>• **Animations** : réussite, erreur, explosion, victoire<br>• **Chrono affiché** et indicateur d'erreurs<br>• **Sons et musique**<br>• **Direction artistique** (avec l'équipe)<br>• **Module 2** de bout en bout | • **Phaser 3**<br>• **Vite** (build et serveur de développement)<br>• **socket.io-client**<br>• **Tiled** (décors en tuiles, si besoin)<br>• **TexturePacker** ou **Free Texture Packer** (sprites)<br>• **Aseprite** ou **Piskel** (pixel art)<br>• **Kenney.nl**, **itch.io** (assets gratuits)<br>• **Howler.js** ou le son intégré de Phaser<br>• **Figma** (maquettes) |
| **Alan**<br>*Rôle C : téléphones et conception des énigmes* | • **Page « rejoindre »** : saisie du code ou arrivée par le QR, pseudo<br>• **Interface joueur** : affichage différent selon le rôle de chacun (manuel, indices, contrôles)<br>• **Contrôles** : boutons, fils à couper, saisie de codes, interrupteurs…<br>• **Adaptation mobile** : responsive, plein écran, vibration, empêcher la mise en veille<br>• **Conception des énigmes** : mécaniques, difficulté, répartition des infos entre joueurs<br>• **Format des modules** : `config.json` + fiche par module dans `docs/modules/` (défini avec Basma)<br>• **Tests de jouabilité** avec de vrais joueurs<br>• **Modules 1 et 4** de bout en bout<br>• **Préparation du passage à l'app mobile** (S2) | • **HTML / CSS / JavaScript** + **Vite**<br>• **socket.io-client**<br>• **Tailwind CSS** ou **Pico.css** (style rapide)<br>• **API Vibration**, **Screen Wake Lock**, **Fullscreen** (fonctions du navigateur)<br>• **DeviceOrientation** (gyroscope, pour les mini-jeux)<br>• **Phaser 3** (pour un mini-jeu sur le téléphone si besoin)<br>• **JSON** (format des énigmes)<br>• **Figma** (maquettes mobiles) |
| **Tout le monde** | • Atelier de conception : liste des énigmes, style visuel, règles<br>• Revue des Pull Requests des autres<br>• Partie test chaque semaine<br>• Préparation de la démo et de la soutenance | • **GitHub** (dépôt, Pull Requests)<br>• **GitHub Projects** (tableau des tâches)<br>• **Discord** (communication)<br>• **ESLint** + **Prettier** (code homogène) |

## Points de coordination

- **Basma ↔ Sara et Alan** : le **contrat d'événements temps réel** (noms des messages, format des données, états de la partie) est écrit en premier. B et C peuvent ainsi avancer en parallèle avec de fausses données, sans attendre le serveur.
- **Basma ↔ Alan** : le **format JSON des énigmes**, la répartition des infos entre joueurs et la validation des réponses.
- **Sara ↔ Alan** : chaque module d'énigme a une partie écran (Sara) et une partie téléphone (Alan), à concevoir ensemble.

## Règles Git

- Pas de push direct sur `main`.
- Une branche par tâche (`feature/lobby`, `feature/module-fils`…).
- Une Pull Request relue par un autre membre avant chaque fusion.
