// @ts-check
/**
 * Fausse partie du mock : un état minimal (chrono, erreurs, focus, modules) qui produit
 * des messages conformes au contrat v1. Aucune vraie règle de module ici.
 */
import {
  DEFAULT_RULES,
  END_REASON,
  GAME_RESULT,
  GAME_STATUS,
  MODULE_STATUS,
} from '@unlockers/shared';
import { MOCK_MODULES } from './scenarios.js';

/** @typedef {import('@unlockers/shared/types.js').Slot} Slot */

export class FakeGame {
  /**
   * @param {import('../src/rooms/Room.js').Room} room
   * @param {number} duration en secondes
   */
  constructor(room, duration) {
    this.room = room;
    this.duration = duration;
    this.timeLeft = duration;
    this.errors = 0;
    this.maxErrors = DEFAULT_RULES.maxErrors;
    this.paused = false;
    /** @type {string} */
    this.focusedModuleId = MOCK_MODULES[0].id;
    /** @type {{ id: string, name: string, isFinal: boolean, status: import('@unlockers/shared/types.js').ModuleStatus }[]} */
    this.modules = MOCK_MODULES.map((m) => ({
      id: m.id,
      name: m.name,
      isFinal: Boolean(m.isFinal),
      status: m.isFinal ? MODULE_STATUS.LOCKED : MODULE_STATUS.ACTIVE,
    }));
    /** @type {import('@unlockers/shared/types.js').GameOverPayload | null} */
    this.over = null;
  }

  get focused() {
    return this.modules.find((m) => m.id === this.focusedModuleId);
  }

  /**
   * Applique le résultat d'une action sur le module en focus.
   * @param {'ok' | 'error' | 'solved'} result
   */
  applyResult(result) {
    const module = this.focused;
    if (!module) return;
    if (result === 'error') this.errors += 1;
    if (result === 'solved') {
      module.status = MODULE_STATUS.SOLVED;
      const regularSolved = this.modules
        .filter((m) => !m.isFinal)
        .every((m) => m.status === MODULE_STATUS.SOLVED);
      const final = this.modules.find((m) => m.isFinal);
      if (regularSolved && final?.status === MODULE_STATUS.LOCKED)
        final.status = MODULE_STATUS.ACTIVE;
      if (module.isFinal) this.finish(GAME_RESULT.WON, END_REASON.FINAL_SOLVED);
    }
    if (this.errors >= this.maxErrors) this.finish(GAME_RESULT.LOST, END_REASON.TOO_MANY_ERRORS);
  }

  /** Une seconde passe (sauf en pause). */
  tick() {
    if (this.paused || this.over) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    if (this.timeLeft === 0) this.finish(GAME_RESULT.LOST, END_REASON.TIME_UP);
  }

  /**
   * @param {import('@unlockers/shared/types.js').GameResult} result
   * @param {import('@unlockers/shared/types.js').EndReason} reason
   */
  finish(result, reason) {
    if (this.over) return;
    this.room.status = result === GAME_RESULT.WON ? GAME_STATUS.WON : GAME_STATUS.LOST;
    this.over = { result, reason, time: this.duration - this.timeLeft, errors: this.errors };
  }

  /** @returns {import('@unlockers/shared/types.js').GameStatePayload} */
  gameState() {
    return {
      status: this.room.status,
      timeLeft: this.timeLeft,
      errors: this.errors,
      maxErrors: this.maxErrors,
      focusedModuleId: this.focusedModuleId,
      modules: this.modules.map((m) => ({
        id: m.id,
        status: m.status,
        view: { name: m.name, focused: m.id === this.focusedModuleId },
      })),
      players: this.room.publicPlayers(),
    };
  }

  /**
   * @param {Slot} slot
   * @returns {import('@unlockers/shared/types.js').PlayerViewPayload}
   */
  playerView(slot) {
    const module = this.focused;
    return {
      status: this.room.status,
      focusedModuleId: this.focusedModuleId,
      modules: this.modules.map(({ id, status }) => ({ id, status })),
      view: {
        slot,
        moduleId: module?.id,
        title: module?.name,
        // Fausse info propre à chaque place : sert à vérifier que chaque téléphone a SA vue.
        hint: `Indice de ${slot} pour « ${module?.name} »`,
        controls: ['ok', 'error', 'solve'],
      },
    };
  }
}
