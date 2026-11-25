// Tests d'intégration : partie de bout en bout avec un écran et 2 faux téléphones Socket.IO
// (tâches Notion #24, #25, #69 et #26).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES, EVENTS } from '@unlockers/shared';
import { once, startTestServer } from './helpers.js';
import { TEST_MODULES } from './fixtures/testModules.js';

/**
 * Attend un événement qui vérifie `predicate` (ignore les précédents).
 * @param {import('socket.io-client').Socket} socket
 * @param {string} event
 * @param {(payload: any) => boolean} [predicate]
 */
function waitFor(socket, event, predicate = () => true, timeout = 1500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} attendu non reçu`)), timeout);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

describe('Socket.IO : partie (lancement, focus, actions, fin)', () => {
  /** @type {Awaited<ReturnType<typeof startTestServer>>} */
  let server;
  let code;
  let screen;
  let ana;
  let bob;

  /** Le secret du module en focus, lu côté serveur (P1 le voit sur son téléphone). */
  const focusedSecret = () => {
    const game = server.rooms.get(code).game;
    return game.moduleById(game.focusedModuleId).state.secret;
  };

  async function setup(options = {}) {
    server = await startTestServer({ modules: TEST_MODULES, ...options });
    code = server.rooms.create().code;
    screen = await server.client();
    const lobby = once(screen, EVENTS.LOBBY_UPDATE);
    screen.emit(EVENTS.SCREEN_JOIN, { code });
    await lobby;
    ana = await server.client();
    bob = await server.client();
    for (const [socket, nickname] of [
      [ana, 'Ana'],
      [bob, 'Bob'],
    ]) {
      const joined = once(socket, EVENTS.PLAYER_JOINED);
      socket.emit(EVENTS.PLAYER_JOIN, { code, nickname });
      await joined;
    }
  }

  /** Lance la partie depuis l'écran et attend les premières vues. */
  async function start() {
    const state = waitFor(screen, EVENTS.GAME_STATE);
    const anaView = waitFor(ana, EVENTS.PLAYER_VIEW);
    const bobView = waitFor(bob, EVENTS.PLAYER_VIEW);
    screen.emit(EVENTS.GAME_START, {});
    return { state: await state, anaView: await anaView, bobView: await bobView };
  }

  afterEach(() => server?.close());

  describe('avec 2 joueurs', () => {
    beforeEach(() => setup());

    it('game:start : l’écran reçoit game:state, chaque téléphone SA vue', async () => {
      const { state, anaView, bobView } = await start();
      expect(state.status).toBe('playing');
      expect(state.modules).toHaveLength(5);
      expect(state.players).toHaveLength(2);
      expect(anaView.focusedModuleId).toBe(state.focusedModuleId);
      expect(anaView.view).toEqual({ slot: 'P1', secret: focusedSecret() });
      expect(bobView.view).toEqual({ slot: 'P2', secret: '?' });
    });

    it('seul l’écran peut lancer la partie', async () => {
      const error = once(ana, EVENTS.ERROR);
      ana.emit(EVENTS.GAME_START, {});
      expect((await error).code).toBe('GAME_NOT_FOUND');
    });

    it('on ne rejoint plus une partie lancée', async () => {
      await start();
      const late = await server.client();
      const error = once(late, EVENTS.ERROR);
      late.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Tard' });
      expect((await error).code).toBe('GAME_STARTED');
    });

    it('module:focus : tout le monde bascule ; 2e changement trop tôt → FOCUS_COOLDOWN', async () => {
      const { state } = await start();
      const target = state.modules[2].id;
      const screenSees = waitFor(screen, EVENTS.GAME_STATE, (s) => s.focusedModuleId === target);
      const anaSees = waitFor(ana, EVENTS.PLAYER_VIEW, (v) => v.focusedModuleId === target);
      bob.emit(EVENTS.MODULE_FOCUS, { moduleId: target });
      await Promise.all([screenSees, anaSees]);

      const error = once(ana, EVENTS.ERROR);
      ana.emit(EVENTS.MODULE_FOCUS, { moduleId: state.modules[1].id });
      expect((await error).code).toBe('FOCUS_COOLDOWN');
    });

    it('action hors focus → NOT_FOCUSED ; payload invalide → INVALID_PAYLOAD', async () => {
      const { state } = await start();
      let error = once(ana, EVENTS.ERROR);
      ana.emit(EVENTS.MODULE_ACTION, { moduleId: state.modules[1].id, action: { type: 'noop' } });
      expect((await error).code).toBe('NOT_FOCUSED');

      error = once(ana, EVENTS.ERROR);
      ana.emit(EVENTS.MODULE_ACTION, { action: 'x' });
      expect((await error).code).toBe('INVALID_PAYLOAD');
    });

    it('mauvaise réponse : module:result error à tous + compteur d’erreurs', async () => {
      const { state } = await start();
      const moduleId = state.focusedModuleId;
      const results = [screen, ana, bob].map((s) => once(s, EVENTS.MODULE_RESULT));
      const updated = waitFor(screen, EVENTS.GAME_STATE, (s) => s.errors === 1);
      bob.emit(EVENTS.MODULE_ACTION, {
        moduleId,
        action: { type: 'guess', value: (focusedSecret() + 1) % 10 },
      });
      for (const r of await Promise.all(results)) {
        expect(r).toEqual({ moduleId, slot: 'P2', result: 'error' });
      }
      await updated;
    });

    it('partie gagnée : 4 modules + final résolus → game:over won', async () => {
      await start();
      const over = waitFor(screen, EVENTS.GAME_OVER);
      for (let i = 0; i < 5; i += 1) {
        const game = server.rooms.get(code).game;
        const moduleId = game.focusedModuleId;
        const next = waitFor(ana, EVENTS.MODULE_RESULT, (r) => r.moduleId === moduleId);
        ana.emit(EVENTS.MODULE_ACTION, {
          moduleId,
          action: { type: 'guess', value: focusedSecret() },
        });
        expect((await next).result).toBe('solved');
      }
      expect(await over).toMatchObject({ result: 'won', reason: 'final_solved', errors: 0 });
      expect(server.rooms.get(code).status).toBe('won');
    });

    it('3 erreurs → game:over lost (too_many_errors) chez tous', async () => {
      const { state } = await start();
      const overs = [screen, ana, bob].map((s) => waitFor(s, EVENTS.GAME_OVER));
      const wrong = { type: 'guess', value: (focusedSecret() + 1) % 10 };
      for (let i = 0; i < 3; i += 1) {
        const result = once(ana, EVENTS.MODULE_RESULT);
        ana.emit(EVENTS.MODULE_ACTION, { moduleId: state.focusedModuleId, action: wrong });
        await result;
      }
      for (const o of await Promise.all(overs)) {
        expect(o).toMatchObject({ result: 'lost', reason: 'too_many_errors', errors: 3 });
      }
    });

    it('reconnexion en partie : le téléphone récupère tout de suite sa vue', async () => {
      await start();
      const playerId = [...server.rooms.get(code).players.values()].find(
        (p) => p.slot === 'P1',
      ).playerId;
      ana.disconnect();
      const back = await server.client();
      const view = waitFor(back, EVENTS.PLAYER_VIEW);
      back.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Ana', playerId });
      expect((await view).view).toEqual({ slot: 'P1', secret: focusedSecret() });
    });

    it('un écran qui arrive en cours de partie reçoit game:state', async () => {
      await start();
      const late = await server.client();
      const state = waitFor(late, EVENTS.GAME_STATE);
      late.emit(EVENTS.SCREEN_JOIN, { code });
      expect((await state).status).toBe('playing');
    });
  });

  it('chrono : game:tick puis game:over time_up', async () => {
    await setup({ rules: { ...DEFAULT_RULES, durationSeconds: 2 }, tickMs: 20 });
    await start();
    const tick = waitFor(ana, EVENTS.GAME_TICK);
    const over = waitFor(screen, EVENTS.GAME_OVER);
    expect(await tick).toEqual({ timeLeft: 1 });
    expect(await over).toEqual({ result: 'lost', reason: 'time_up', time: 2, errors: 0 });
  });

  it('un seul joueur : NOT_ENOUGH_PLAYERS', async () => {
    server = await startTestServer({ modules: TEST_MODULES });
    code = server.rooms.create().code;
    screen = await server.client();
    screen.emit(EVENTS.SCREEN_JOIN, { code });
    await once(screen, EVENTS.LOBBY_UPDATE);
    const solo = await server.client();
    solo.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Solo' });
    await once(solo, EVENTS.PLAYER_JOINED);
    const error = once(screen, EVENTS.ERROR);
    screen.emit(EVENTS.GAME_START, {});
    expect((await error).code).toBe('NOT_ENOUGH_PLAYERS');
  });
});
