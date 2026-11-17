// @ts-check
/**
 * Contrat d'événements Socket.IO, v1.
 *
 * Source : section « Contrat d'événements Socket.IO (v1) » de docs/PLAN.md.
 * On n'écrit JAMAIS un nom d'événement en dur : on importe ces constantes.
 * Toute modification passe par une PR relue par les 3 et par la mise à jour du plan.
 *
 * Le format des données de chaque événement est décrit dans `types.js`.
 */

/** Écran commun → serveur. */
export const SCREEN_EVENTS = Object.freeze({
  /** `{ code }` : l'écran s'abonne à la partie. Données : `ScreenJoinPayload`. */
  JOIN: 'screen:join',
  /** `{}` : lance la partie (≥ 2 joueurs). */
  START_GAME: 'game:start',
  /** `{}` : rejouer avec la même salle et les mêmes joueurs. */
  RESTART_GAME: 'game:restart',
});

/** Téléphone → serveur. */
export const PHONE_EVENTS = Object.freeze({
  /** `{ code, nickname, playerId? }` : rejoindre, ou se reconnecter avec `playerId`. Données : `PlayerJoinPayload`. */
  JOIN: 'player:join',
  /** `{ moduleId }` : met un module en focus pour toute l'équipe. Données : `ModuleFocusPayload`. */
  FOCUS_MODULE: 'module:focus',
  /** `{ moduleId, action }` : action sur le module en focus. Données : `ModuleActionPayload`. */
  MODULE_ACTION: 'module:action',
});

/** Serveur → client(s). */
export const SERVER_EVENTS = Object.freeze({
  /** Au téléphone : confirme sa place. Données : `PlayerJoinedPayload`. */
  PLAYER_JOINED: 'player:joined',
  /** À tous : lobby en direct. Données : `LobbyUpdatePayload`. */
  LOBBY_UPDATE: 'lobby:update',
  /** À l'écran : état complet. Données : `GameStatePayload`. */
  GAME_STATE: 'game:state',
  /** À chaque téléphone : sa vue propre. Données : `PlayerViewPayload`. */
  PLAYER_VIEW: 'player:view',
  /** À tous : résultat d'une action (animations, vibrations). Données : `ModuleResultPayload`. */
  MODULE_RESULT: 'module:result',
  /** À tous : chrono, une fois par seconde. Données : `GameTickPayload`. */
  GAME_TICK: 'game:tick',
  /** À tous : pause sur déconnexion. Données : `GamePausedPayload`. */
  GAME_PAUSED: 'game:paused',
  /** À tous : reprise. Données : `GameResumedPayload`. */
  GAME_RESUMED: 'game:resumed',
  /** À tous : fin de partie. Données : `GameOverPayload`. */
  GAME_OVER: 'game:over',
  /** Au client fautif uniquement. Données : `ErrorPayload`. */
  ERROR: 'error',
});

/**
 * Tous les événements réunis, pratique pour un import unique :
 * `socket.emit(EVENTS.PLAYER_JOIN, …)`.
 */
export const EVENTS = Object.freeze({
  SCREEN_JOIN: SCREEN_EVENTS.JOIN,
  GAME_START: SCREEN_EVENTS.START_GAME,
  GAME_RESTART: SCREEN_EVENTS.RESTART_GAME,

  PLAYER_JOIN: PHONE_EVENTS.JOIN,
  MODULE_FOCUS: PHONE_EVENTS.FOCUS_MODULE,
  MODULE_ACTION: PHONE_EVENTS.MODULE_ACTION,

  PLAYER_JOINED: SERVER_EVENTS.PLAYER_JOINED,
  LOBBY_UPDATE: SERVER_EVENTS.LOBBY_UPDATE,
  GAME_STATE: SERVER_EVENTS.GAME_STATE,
  PLAYER_VIEW: SERVER_EVENTS.PLAYER_VIEW,
  MODULE_RESULT: SERVER_EVENTS.MODULE_RESULT,
  GAME_TICK: SERVER_EVENTS.GAME_TICK,
  GAME_PAUSED: SERVER_EVENTS.GAME_PAUSED,
  GAME_RESUMED: SERVER_EVENTS.GAME_RESUMED,
  GAME_OVER: SERVER_EVENTS.GAME_OVER,
  ERROR: SERVER_EVENTS.ERROR,
});
