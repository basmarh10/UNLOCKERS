// @ts-check
/**
 * Une partie en cours : machine à états, modules, focus partagé, erreurs et chrono.
 *
 *   LOBBY ──start()──> PLAYING ──> WON | LOST
 *
 * Cette classe ne connaît pas Socket.IO : elle applique les règles et renvoie des
 * résultats ; `realtime/handlers.js` se charge de diffuser. Le serveur fait autorité :
 * toute action est validée ici, jamais côté client.
 *
 * Règles : docs/PLAN.md (Règles du jeu, Focus partagé).
 */
import {
  ACTION_RESULT,
  END_REASON,
  ERROR_CODES,
  GAME_RESULT,
  GAME_STATUS,
  MIN_PLAYERS,
  MODULE_STATUS,
} from '@unlockers/shared';
import { pickModules } from './moduleLoader.js';
import { createRng, randomSeed } from './rng.js';

/**
 * @typedef {import('@unlockers/shared/types.js').Slot} Slot
 * @typedef {import('@unlockers/shared/types.js').ErrorCode} ErrorCode
 * @typedef {import('@unlockers/shared/types.js').ModuleStatus} ModuleStatus
 * @typedef {import('./moduleLoader.js').ModuleEntry} ModuleEntry
 */

/**
 * Un module dans une partie (état interne côté serveur, jamais envoyé tel quel).
 * @typedef {object} GameModule
 * @property {string} id
 * @property {boolean} isFinal
 * @property {ModuleStatus} status
 * @property {any} state      État renvoyé par `setup` puis `handleAction`
 * @property {ModuleEntry['server']} definition
 */

/**
 * @typedef {object} GameRules
 * @property {number} durationSeconds
 * @property {number} maxErrors
 * @property {number} regularModuleCount
 * @property {number} focusCooldownMs
 */

/** @typedef {{ ok: false, code: ErrorCode }} Refusal */

export class Game {
  /**
   * @param {import('../rooms/Room.js').Room} room
   * @param {object} options
   * @param {readonly ModuleEntry[]} options.registry modules disponibles (déjà validés)
   * @param {GameRules} options.rules
   * @param {number} [options.seed] graine de la partie (tirée au hasard sinon)
   * @param {() => number} [options.now] horloge en ms (injectable pour les tests)
   */
  constructor(room, { registry, rules, seed = randomSeed(), now = Date.now }) {
    this.room = room;
    this.registry = registry;
    this.rules = rules;
    this.seed = seed;
    this.now = now;

    this.timeLeft = rules.durationSeconds;
    this.errors = 0;
    /** @type {GameModule[]} */
    this.modules = [];
    /** @type {string | null} */
    this.focusedModuleId = null;
    /** Moment du dernier changement de focus demandé par un joueur. */
    this.lastFocusAt = -Infinity;
    /** @type {Slot[]} places présentes au lancement */
    this.slots = [];
    /** @type {import('@unlockers/shared/types.js').GameOverPayload | null} */
    this.over = null;
  }

  get isPlaying() {
    return this.room.status === GAME_STATUS.PLAYING;
  }

  /**
   * @param {string | null} id
   * @returns {GameModule | undefined}
   */
  moduleById(id) {
    return this.modules.find((m) => m.id === id);
  }

  /**
   * LOBBY → PLAYING : génère les modules et met le premier en focus.
   * @returns {{ ok: true } | Refusal}
   */
  start() {
    if (this.room.status !== GAME_STATUS.LOBBY)
      return { ok: false, code: ERROR_CODES.GAME_STARTED };
    const players = this.room.publicPlayers().filter((p) => p.connected);
    if (players.length < MIN_PLAYERS) return { ok: false, code: ERROR_CODES.NOT_ENOUGH_PLAYERS };

    const rng = createRng(this.seed);
    this.slots = players.map((p) => p.slot);
    this.modules = pickModules(this.registry, {
      playerCount: this.slots.length,
      rng,
      count: this.rules.regularModuleCount,
    }).map(({ config, server }) => ({
      id: config.id,
      isFinal: config.isFinal,
      status: config.isFinal ? MODULE_STATUS.LOCKED : MODULE_STATUS.ACTIVE,
      state: server.setup({ slots: [...this.slots], rng }),
      definition: server,
    }));
    this.timeLeft = this.rules.durationSeconds;
    this.errors = 0;
    this.over = null;
    this.lastFocusAt = -Infinity;
    this.focusedModuleId = this.nextActiveModuleId();
    this.room.status = GAME_STATUS.PLAYING;
    return { ok: true };
  }

  /**
   * Un joueur met un module en focus pour toute l'équipe.
   * @param {Slot} _slot place qui demande (n'importe laquelle)
   * @param {string} moduleId
   * @returns {{ ok: true, changed: boolean } | Refusal}
   */
  focus(_slot, moduleId) {
    if (!this.isPlaying) return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    const module = this.moduleById(moduleId);
    if (!module) return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    if (module.status === MODULE_STATUS.LOCKED)
      return { ok: false, code: ERROR_CODES.MODULE_LOCKED };
    if (module.status === MODULE_STATUS.SOLVED)
      return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    if (moduleId === this.focusedModuleId) return { ok: true, changed: false };

    const now = this.now();
    if (now - this.lastFocusAt < this.rules.focusCooldownMs) {
      return { ok: false, code: ERROR_CODES.FOCUS_COOLDOWN };
    }
    this.lastFocusAt = now;
    this.focusedModuleId = moduleId;
    return { ok: true, changed: true };
  }

  /**
   * Action d'un joueur sur le module en focus.
   * @param {Slot} slot
   * @param {string} moduleId
   * @param {unknown} action contenu libre, interprété par le module
   * @returns {{ ok: true, result: import('@unlockers/shared/types.js').ActionResult } | Refusal}
   */
  act(slot, moduleId, action) {
    if (!this.isPlaying) return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    const module = this.moduleById(moduleId);
    if (!module) return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    if (module.status === MODULE_STATUS.LOCKED)
      return { ok: false, code: ERROR_CODES.MODULE_LOCKED };
    if (moduleId !== this.focusedModuleId) return { ok: false, code: ERROR_CODES.NOT_FOCUSED };
    if (module.status !== MODULE_STATUS.ACTIVE)
      return { ok: false, code: ERROR_CODES.INVALID_ACTION };

    let outcome;
    try {
      outcome = module.definition.handleAction(module.state, slot, action);
    } catch {
      // Le module refuse l'action (mal formée, mauvaise place…) : pas d'erreur comptée.
      return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    }
    const { result, state } = outcome;
    if (!Object.values(ACTION_RESULT).includes(result)) {
      return { ok: false, code: ERROR_CODES.INVALID_ACTION };
    }
    module.state = state;

    if (result === ACTION_RESULT.ERROR) {
      this.errors += 1;
      if (this.errors >= this.rules.maxErrors) {
        this.finish(GAME_RESULT.LOST, END_REASON.TOO_MANY_ERRORS);
      }
    } else if (result === ACTION_RESULT.SOLVED) {
      this.solve(module);
    }
    return { ok: true, result };
  }

  /**
   * Une seconde passe. Renvoie `true` si cette seconde termine la partie (chrono à 0).
   * @returns {boolean}
   */
  tick() {
    if (!this.isPlaying) return false;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    if (this.timeLeft > 0) return false;
    this.finish(GAME_RESULT.LOST, END_REASON.TIME_UP);
    return true;
  }

  /**
   * Module résolu : déverrouille le final si besoin, déplace le focus, détecte la victoire.
   * @param {GameModule} module
   */
  solve(module) {
    module.status = MODULE_STATUS.SOLVED;
    const regular = this.modules.filter((m) => !m.isFinal);
    const final = this.modules.find((m) => m.isFinal);
    const regularDone = regular.every((m) => m.status === MODULE_STATUS.SOLVED);

    // Victoire : module final résolu, ou (tant qu'il n'existe pas) tous les modules résolus.
    if (module.isFinal || (!final && regularDone)) {
      this.finish(GAME_RESULT.WON, END_REASON.FINAL_SOLVED);
      return;
    }
    if (regularDone && final?.status === MODULE_STATUS.LOCKED) final.status = MODULE_STATUS.ACTIVE;
    // Déplacement automatique : ne compte pas dans le délai de focus des joueurs.
    this.focusedModuleId = this.nextActiveModuleId();
  }

  /** Premier module actif (ordre de la partie : normaux puis final). */
  nextActiveModuleId() {
    return this.modules.find((m) => m.status === MODULE_STATUS.ACTIVE)?.id ?? null;
  }

  /**
   * @param {import('@unlockers/shared/types.js').GameResult} result
   * @param {import('@unlockers/shared/types.js').EndReason} reason
   */
  finish(result, reason) {
    if (this.over) return;
    this.room.status = result === GAME_RESULT.WON ? GAME_STATUS.WON : GAME_STATUS.LOST;
    this.over = {
      result,
      reason,
      time: this.rules.durationSeconds - this.timeLeft,
      errors: this.errors,
    };
  }

  /**
   * Données de `game:state` (écran commun).
   * @returns {import('@unlockers/shared/types.js').GameStatePayload}
   */
  gameState() {
    return {
      status: this.room.status,
      timeLeft: this.timeLeft,
      errors: this.errors,
      maxErrors: this.rules.maxErrors,
      focusedModuleId: this.focusedModuleId,
      modules: this.modules.map((m) => ({
        id: m.id,
        status: m.status,
        view: m.definition.screenView(m.state),
      })),
      players: this.room.publicPlayers(),
    };
  }

  /**
   * Données de `player:view` pour une place : sa vue du module en focus uniquement.
   * @param {Slot} slot
   * @returns {import('@unlockers/shared/types.js').PlayerViewPayload}
   */
  playerView(slot) {
    const focused = this.moduleById(this.focusedModuleId);
    return {
      status: this.room.status,
      focusedModuleId: this.focusedModuleId,
      modules: this.modules.map(({ id, status }) => ({ id, status })),
      view: focused ? focused.definition.viewFor(focused.state, slot, [...this.slots]) : null,
    };
  }
}
