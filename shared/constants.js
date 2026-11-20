// @ts-check
/**
 * Constantes partagées, contrat v1 : règles par défaut, états, places, codes d'erreur.
 *
 * Source : sections « Règles du jeu » et « Contrat d'événements » de docs/PLAN.md.
 * Utilisées par le serveur, le mock, l'écran et le téléphone.
 */

/** Version du contrat. À incrémenter à chaque changement incompatible. */
export const CONTRACT_VERSION = 1;

/** Places des joueurs, attribuées dans l'ordre d'arrivée. */
export const SLOTS = Object.freeze(/** @type {const} */ (['P1', 'P2', 'P3', 'P4']));

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

/** Règles par défaut d'une partie (surchargeables par GAME_DURATION / MAX_ERRORS pour les tests). */
export const DEFAULT_RULES = Object.freeze({
  /** Durée d'une partie, en secondes (5 min). */
  durationSeconds: 300,
  /** Nombre d'erreurs qui provoque la défaite. */
  maxErrors: 3,
  /** Modules actifs dès le début (hors module final). */
  regularModuleCount: 4,
  /** Délai minimum entre deux changements de focus, en ms. */
  focusCooldownMs: 2000,
  /** Délai pour revenir après une déconnexion, en ms. */
  reconnectGraceMs: 60_000,
});

/** États d'une partie : LOBBY → PLAYING → WON | LOST (et retour au LOBBY avec « Rejouer »). */
export const GAME_STATUS = Object.freeze({
  LOBBY: 'lobby',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
});

/** États d'un module. Le module final reste `locked` tant que les 4 autres ne sont pas résolus. */
export const MODULE_STATUS = Object.freeze({
  LOCKED: 'locked',
  ACTIVE: 'active',
  SOLVED: 'solved',
});

/** Résultat d'une action sur un module (`handleAction` puis `module:result`). */
export const ACTION_RESULT = Object.freeze({
  OK: 'ok',
  ERROR: 'error',
  SOLVED: 'solved',
});

/** Résultat d'une partie (`game:over`). */
export const GAME_RESULT = Object.freeze({
  WON: 'won',
  LOST: 'lost',
});

/** Raison de la fin de partie (`game:over.reason`). */
export const END_REASON = Object.freeze({
  /** Victoire : module final résolu avant la fin du chrono. */
  FINAL_SOLVED: 'final_solved',
  /** Défaite : chrono à 0. */
  TIME_UP: 'time_up',
  /** Défaite : nombre maximum d'erreurs atteint. */
  TOO_MANY_ERRORS: 'too_many_errors',
  /** Défaite : moins de 2 joueurs restants. */
  NOT_ENOUGH_PLAYERS: 'not_enough_players',
});

/** Raison d'une pause (`game:paused.reason`). */
export const PAUSE_REASON = Object.freeze({
  PLAYER_DISCONNECTED: 'player_disconnected',
});

/** Codes d'erreur envoyés avec l'événement `error`. */
export const ERROR_CODES = Object.freeze({
  /** Aucune partie avec ce code. */
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  /** Déjà 4 joueurs. */
  GAME_FULL: 'GAME_FULL',
  /** La partie est lancée : on ne peut plus rejoindre (sauf reconnexion). */
  GAME_STARTED: 'GAME_STARTED',
  /** Lancement demandé avec moins de 2 joueurs. */
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  /** Action sur un module qui n'est pas en focus. */
  NOT_FOCUSED: 'NOT_FOCUSED',
  /** Changement de focus moins de 2 s après le précédent. */
  FOCUS_COOLDOWN: 'FOCUS_COOLDOWN',
  /** Focus ou action sur un module verrouillé (module final). */
  MODULE_LOCKED: 'MODULE_LOCKED',
  /** Action refusée par le module. */
  INVALID_ACTION: 'INVALID_ACTION',
  /** Données reçues mal formées (validation des messages). */
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
});

/** Codes de salle : 4 caractères majuscules, sans caractères ambigus (pas de O, 0, I, 1). */
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Pseudo : longueur autorisée après suppression des espaces autour. */
export const NICKNAME_MIN_LENGTH = 1;
export const NICKNAME_MAX_LENGTH = 16;

/** Chemin de la page téléphone ; le lien pour rejoindre est `/play?code=XXXX`. */
export const PLAY_PATH = '/play';

/**
 * Met un code saisi au propre : espaces retirés, majuscules.
 * @param {string} input code tapé par le joueur
 * @returns {string}
 */
export function normalizeRoomCode(input) {
  return String(input ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Vérifie qu'un code de salle a le bon format (ne vérifie pas que la partie existe).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string' || code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((char) => ROOM_CODE_ALPHABET.includes(char));
}
