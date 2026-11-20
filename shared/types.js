// @ts-check
/**
 * Types JSDoc partagés, contrat v1.
 *
 * Ce fichier ne contient que de la documentation de types : il n'exporte aucune valeur.
 * Utilisation dans un autre fichier :
 *
 *   /** @type {import('@unlockers/shared/types.js').GameStatePayload} *\/
 *
 * Source : docs/PLAN.md (Contrat d'un module, API REST, Contrat d'événements v1).
 */

// ─── Valeurs de base ──────────────────────────────────────────────────────────

/** @typedef {'P1' | 'P2' | 'P3' | 'P4'} Slot */
/** @typedef {'lobby' | 'playing' | 'won' | 'lost'} GameStatus */
/** @typedef {'locked' | 'active' | 'solved'} ModuleStatus */
/** @typedef {'ok' | 'error' | 'solved'} ActionResult */
/** @typedef {'won' | 'lost'} GameResult */
/** @typedef {'final_solved' | 'time_up' | 'too_many_errors' | 'not_enough_players'} EndReason */
/**
 * @typedef {'GAME_NOT_FOUND' | 'GAME_FULL' | 'GAME_STARTED' | 'NOT_ENOUGH_PLAYERS' | 'NOT_FOCUSED'
 *   | 'FOCUS_COOLDOWN' | 'MODULE_LOCKED' | 'INVALID_ACTION' | 'INVALID_PAYLOAD'} ErrorCode
 */

// ─── API REST ─────────────────────────────────────────────────────────────────

/**
 * Réponse de `POST /api/games`.
 * @typedef {object} CreateGameResponse
 * @property {string} code     Code de salle (4 caractères)
 * @property {string} joinUrl  Lien complet pour rejoindre : `<PUBLIC_URL>/play?code=XXXX`
 */

/**
 * Réponse de `GET /api/games/:code`.
 * @typedef {object} GameInfoResponse
 * @property {string} code
 * @property {GameStatus} status
 * @property {number} playerCount
 * @property {number} maxPlayers
 */

// ─── Écran → serveur ──────────────────────────────────────────────────────────

/**
 * `screen:join`
 * @typedef {object} ScreenJoinPayload
 * @property {string} code
 */

/** `game:start` et `game:restart` : pas de données (`{}`). */
/** @typedef {Record<string, never>} EmptyPayload */

// ─── Téléphone → serveur ──────────────────────────────────────────────────────

/**
 * `player:join`
 * @typedef {object} PlayerJoinPayload
 * @property {string} code
 * @property {string} nickname
 * @property {string} [playerId]  Présent uniquement pour une reconnexion
 */

/**
 * `module:focus`
 * @typedef {object} ModuleFocusPayload
 * @property {string} moduleId
 */

/**
 * `module:action`. Le contenu de `action` est défini par chaque module.
 * @typedef {object} ModuleActionPayload
 * @property {string} moduleId
 * @property {unknown} action
 */

// ─── Serveur → client(s) ──────────────────────────────────────────────────────

/**
 * `player:joined` (au téléphone). `playerId` est à stocker dans le navigateur pour la reconnexion.
 * @typedef {object} PlayerJoinedPayload
 * @property {string} playerId
 * @property {Slot} slot
 */

/**
 * Un joueur tel qu'il apparaît dans le lobby et dans `game:state`.
 * @typedef {object} PublicPlayer
 * @property {Slot} slot
 * @property {string} nickname
 * @property {boolean} connected
 */

/**
 * `lobby:update` (à tous).
 * @typedef {object} LobbyUpdatePayload
 * @property {PublicPlayer[]} players
 * @property {boolean} canStart  `true` dès 2 joueurs
 */

/**
 * Un module tel que le voit l'écran.
 * @typedef {object} ScreenModule
 * @property {string} id
 * @property {ModuleStatus} status
 * @property {unknown} view  Résultat de `screenView(state)` du module
 */

/**
 * `game:state` (à l'écran) : état complet.
 * @typedef {object} GameStatePayload
 * @property {GameStatus} status
 * @property {number} timeLeft         Secondes restantes
 * @property {number} errors
 * @property {number} maxErrors
 * @property {string | null} focusedModuleId
 * @property {ScreenModule[]} modules
 * @property {PublicPlayer[]} players
 */

/**
 * Un module dans la liste du téléphone (sans sa vue).
 * @typedef {object} ModuleSummary
 * @property {string} id
 * @property {ModuleStatus} status
 */

/**
 * `player:view` (à un seul téléphone) : sa vue du module en focus.
 * @typedef {object} PlayerViewPayload
 * @property {GameStatus} status
 * @property {string | null} focusedModuleId
 * @property {ModuleSummary[]} modules
 * @property {unknown} view  Résultat de `viewFor(state, slot, slots)` du module en focus
 */

/**
 * `module:result` (à tous).
 * @typedef {object} ModuleResultPayload
 * @property {string} moduleId
 * @property {Slot} slot
 * @property {ActionResult} result
 */

/**
 * `game:tick` (à tous).
 * @typedef {object} GameTickPayload
 * @property {number} timeLeft
 */

/**
 * `game:paused` (à tous).
 * @typedef {object} GamePausedPayload
 * @property {'player_disconnected'} reason
 * @property {Slot} slot
 * @property {number} resumeDeadline  Horodatage (ms, epoch) au-delà duquel la partie reprend sans le joueur
 */

/**
 * `game:resumed` (à tous).
 * @typedef {object} GameResumedPayload
 * @property {boolean} redistributed  `true` si les infos du joueur absent ont été redistribuées
 */

/**
 * `game:over` (à tous).
 * @typedef {object} GameOverPayload
 * @property {GameResult} result
 * @property {EndReason} reason
 * @property {number} time    Durée jouée, en secondes
 * @property {number} errors
 */

/**
 * `error` (au client fautif).
 * @typedef {object} ErrorPayload
 * @property {ErrorCode} code
 * @property {string} message  Message lisible (en français)
 */

// ─── Format d'un module ───────────────────────────────────────────────────────

/**
 * Contenu de `modules/<module-id>/config.json`.
 * @typedef {object} ModuleConfig
 * @property {string} id
 * @property {string} name
 * @property {number} minPlayers  2 à 4
 * @property {number} maxPlayers  2 à 4
 * @property {boolean} isFinal    `true` pour le module final (verrouillé au départ)
 */

/**
 * Générateur aléatoire de la partie (initialisé avec la graine de la partie).
 * Renvoie un nombre dans [0, 1), comme `Math.random`.
 * @typedef {() => number} Rng
 */

/**
 * Contexte passé à `setup`.
 * @typedef {object} ModuleSetupContext
 * @property {Slot[]} slots  Places présentes (['P1', 'P2', …])
 * @property {Rng} rng
 */

/**
 * Retour de `handleAction`.
 * @template S
 * @typedef {object} ModuleActionOutcome
 * @property {ActionResult} result
 * @property {S} state  Nouvel état du module
 */

/**
 * Partie serveur d'un module (`modules/<module-id>/server.js`, export par défaut).
 * Ce code n'est JAMAIS envoyé au client : il contient les solutions.
 * @template [S=any] Type de l'état interne du module
 * @typedef {object} ModuleDefinition
 * @property {(ctx: ModuleSetupContext) => S} setup
 *   Génère l'état du module.
 * @property {(state: S, slot: Slot, slots: Slot[]) => unknown} viewFor
 *   Ce que voit le joueur `slot` (doit marcher pour 2, 3 ou 4 joueurs).
 * @property {(state: S) => unknown} screenView
 *   Ce que voit l'écran commun.
 * @property {(state: S, slot: Slot, action: unknown) => ModuleActionOutcome<S>} handleAction
 *   Traite l'action d'un joueur.
 */

export {};
