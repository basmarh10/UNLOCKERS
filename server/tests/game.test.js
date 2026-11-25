// Tests unitaires : machine à états, focus partagé, actions, erreurs, chrono
// (tâches Notion #24, #69 et #26).
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES, ERROR_CODES } from '@unlockers/shared';
import { Room } from '../src/rooms/Room.js';
import { Game } from '../src/game/Game.js';
import { makeTestModule, TEST_MODULES } from './fixtures/testModules.js';

/** Salle de 2 joueurs (P1, P2). */
function roomWith(count = 2) {
  const room = new Room('ABCD');
  for (let i = 0; i < count; i += 1) room.join({ nickname: `J${i + 1}` });
  return room;
}

describe('Game', () => {
  /** @type {Room} */
  let room;
  /** @type {Game} */
  let game;
  /** Horloge simulée pour le délai de focus. */
  let clock;

  beforeEach(() => {
    clock = 0;
    room = roomWith(2);
    game = new Game(room, {
      registry: TEST_MODULES,
      rules: DEFAULT_RULES,
      seed: 123,
      now: () => clock,
    });
  });

  /** Module en focus et son secret (lu dans l'état serveur, comme le ferait un joueur qui voit l'info). */
  const focusedSecret = () => game.moduleById(game.focusedModuleId).state.secret;

  describe('lancement', () => {
    it('lobby → playing, 4 modules actifs + final verrouillé, focus sur le 1er', () => {
      game.start();
      expect(room.status).toBe('playing');
      const state = game.gameState();
      expect(state.modules).toHaveLength(5);
      expect(state.modules.slice(0, 4).every((m) => m.status === 'active')).toBe(true);
      expect(state.modules[4]).toMatchObject({ id: 'final', status: 'locked' });
      expect(state.focusedModuleId).toBe(state.modules[0].id);
      expect(state).toMatchObject({ timeLeft: 300, errors: 0, maxErrors: 3 });
      expect(state.players.map((p) => p.slot)).toEqual(['P1', 'P2']);
    });

    it('même graine → mêmes modules et mêmes secrets', () => {
      game.start();
      const other = new Game(roomWith(2), {
        registry: TEST_MODULES,
        rules: DEFAULT_RULES,
        seed: 123,
      });
      other.start();
      expect(other.gameState().modules.map((m) => m.id)).toEqual(
        game.gameState().modules.map((m) => m.id),
      );
      expect(other.modules.map((m) => m.state)).toEqual(game.modules.map((m) => m.state));
    });

    it('canStart vérifié : moins de 2 joueurs connectés → NOT_ENOUGH_PLAYERS', () => {
      const solo = new Game(roomWith(1), { registry: TEST_MODULES, rules: DEFAULT_RULES });
      expect(solo.start()).toEqual({ ok: false, code: ERROR_CODES.NOT_ENOUGH_PLAYERS });
    });

    it('impossible de relancer une partie déjà en cours', () => {
      game.start();
      expect(game.start()).toEqual({ ok: false, code: ERROR_CODES.GAME_STARTED });
    });
  });

  describe('vues', () => {
    beforeEach(() => game.start());

    it('player:view : vue du module en focus propre à chaque place, sans solution', () => {
      const p1 = game.playerView('P1');
      const p2 = game.playerView('P2');
      expect(p1.focusedModuleId).toBe(game.focusedModuleId);
      expect(p1.modules).toHaveLength(5);
      expect(p1.modules[0]).toEqual({ id: expect.any(String), status: 'active' });
      expect(p1.view).toEqual({ slot: 'P1', secret: focusedSecret() });
      expect(p2.view).toEqual({ slot: 'P2', secret: '?' });
    });

    it('game:state : screenView de chaque module', () => {
      expect(game.gameState().modules[0].view).toEqual({ label: game.modules[0].id });
    });
  });

  describe('focus partagé', () => {
    beforeEach(() => game.start());

    it('n’importe quel joueur change le focus pour tout le monde', () => {
      const target = game.modules[2].id;
      expect(game.focus('P2', target)).toEqual({ ok: true, changed: true });
      expect(game.focusedModuleId).toBe(target);
      expect(game.playerView('P1').focusedModuleId).toBe(target);
    });

    it('délai de 2 s entre deux changements (FOCUS_COOLDOWN)', () => {
      game.focus('P1', game.modules[1].id);
      clock += 1999;
      expect(game.focus('P2', game.modules[2].id)).toEqual({
        ok: false,
        code: ERROR_CODES.FOCUS_COOLDOWN,
      });
      clock += 1;
      expect(game.focus('P2', game.modules[2].id)).toEqual({ ok: true, changed: true });
    });

    it('re-cibler le module déjà en focus ne coûte rien', () => {
      expect(game.focus('P1', game.focusedModuleId)).toEqual({ ok: true, changed: false });
      expect(game.focus('P1', game.modules[1].id).ok).toBe(true);
    });

    it('module final verrouillé : MODULE_LOCKED ; module inconnu : INVALID_ACTION', () => {
      expect(game.focus('P1', 'final')).toEqual({ ok: false, code: ERROR_CODES.MODULE_LOCKED });
      expect(game.focus('P1', 'nope')).toEqual({ ok: false, code: ERROR_CODES.INVALID_ACTION });
    });
  });

  describe('actions', () => {
    beforeEach(() => game.start());

    it('action hors focus refusée (NOT_FOCUSED)', () => {
      const other = game.modules[1].id;
      expect(game.act('P1', other, { type: 'noop' })).toEqual({
        ok: false,
        code: ERROR_CODES.NOT_FOCUSED,
      });
    });

    it('action ok : rien ne change', () => {
      expect(game.act('P1', game.focusedModuleId, { type: 'noop' })).toEqual({
        ok: true,
        result: 'ok',
      });
      expect(game.errors).toBe(0);
    });

    it('action que le module refuse (exception) : INVALID_ACTION, pas d’erreur comptée', () => {
      expect(game.act('P1', game.focusedModuleId, { type: 'boom' })).toEqual({
        ok: false,
        code: ERROR_CODES.INVALID_ACTION,
      });
      expect(game.errors).toBe(0);
    });

    it('mauvaise réponse : +1 erreur', () => {
      const wrong = (focusedSecret() + 1) % 10;
      expect(game.act('P2', game.focusedModuleId, { type: 'guess', value: wrong })).toEqual({
        ok: true,
        result: 'error',
      });
      expect(game.gameState().errors).toBe(1);
    });

    it('3e erreur = défaite too_many_errors', () => {
      const wrong = (focusedSecret() + 1) % 10;
      for (let i = 0; i < 3; i += 1)
        game.act('P1', game.focusedModuleId, { type: 'guess', value: wrong });
      expect(room.status).toBe('lost');
      expect(game.over).toMatchObject({ result: 'lost', reason: 'too_many_errors', errors: 3 });
      expect(game.act('P1', game.focusedModuleId, { type: 'noop' })).toEqual({
        ok: false,
        code: ERROR_CODES.INVALID_ACTION,
      });
    });

    it('module résolu : le focus passe au module actif suivant', () => {
      const first = game.focusedModuleId;
      expect(game.act('P1', first, { type: 'guess', value: focusedSecret() })).toEqual({
        ok: true,
        result: 'solved',
      });
      expect(game.moduleById(first).status).toBe('solved');
      expect(game.focusedModuleId).toBe(game.modules[1].id);
    });

    it('4 modules résolus → final déverrouillé et en focus ; final résolu → victoire', () => {
      for (let i = 0; i < 4; i += 1) {
        game.act('P1', game.focusedModuleId, { type: 'guess', value: focusedSecret() });
      }
      expect(game.moduleById('final').status).toBe('active');
      expect(game.focusedModuleId).toBe('final');
      clock += 42_000;
      game.tick();
      game.act('P2', 'final', { type: 'guess', value: focusedSecret() });
      expect(room.status).toBe('won');
      expect(game.over).toEqual({ result: 'won', reason: 'final_solved', time: 1, errors: 0 });
    });
  });

  describe('chrono', () => {
    it('tick décompte ; à 0 → défaite time_up', () => {
      const short = new Game(roomWith(2), {
        registry: TEST_MODULES,
        rules: { ...DEFAULT_RULES, durationSeconds: 2 },
      });
      short.start();
      expect(short.tick()).toBe(false);
      expect(short.timeLeft).toBe(1);
      expect(short.tick()).toBe(true);
      expect(short.over).toEqual({ result: 'lost', reason: 'time_up', time: 2, errors: 0 });
      expect(short.tick()).toBe(false); // plus rien après la fin
    });

    it('pas de tick avant le lancement', () => {
      expect(game.tick()).toBe(false);
      expect(game.timeLeft).toBe(300);
    });
  });

  describe('sans module final (début de projet)', () => {
    it('le dernier module normal résolu donne la victoire', () => {
      const solo = new Game(roomWith(2), {
        registry: [makeTestModule('wires')],
        rules: DEFAULT_RULES,
      });
      solo.start();
      const secret = solo.moduleById('wires').state.secret;
      solo.act('P1', 'wires', { type: 'guess', value: secret });
      expect(solo.over).toMatchObject({ result: 'won', reason: 'final_solved' });
    });
  });
});
