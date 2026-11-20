// Mock-server : rejoue des scénarios scriptés en respectant le contrat v1 (tâche Notion #9).
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { EVENTS, isValidRoomCode } from '@unlockers/shared';
import { createMockServer } from '../mock/mockServer.js';
import { SCENARIOS } from '../mock/scenarios.js';
import { once, startTestServer, waitForLobby } from './helpers.js';

/** Démarre le mock en accéléré (×200) : une seconde de jeu = 5 ms. */
const startMock = (options = {}) =>
  startTestServer({ factory: createMockServer, speed: 200, ...options });

/** Collecte tous les événements reçus par un socket, dans l'ordre. */
function record(socket) {
  const log = [];
  socket.onAny((event, payload) => log.push({ event, payload }));
  return log;
}

/** Attend un événement en ignorant les précédents d'un autre type. */
function waitFor(socket, event, timeout = 3000) {
  return once(socket, event, timeout);
}

describe('mock-server', () => {
  /** @type {Awaited<ReturnType<typeof startMock>>} */
  let mock;
  afterEach(() => mock?.close());

  it('propose les scénarios du plan', () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining([
        'lobby',
        'victory',
        'defeat-errors',
        'defeat-time',
        'focus',
        'disconnect',
      ]),
    );
    for (const scenario of Object.values(SCENARIOS)) {
      expect(scenario.description).toBeTypeOf('string');
    }
  });

  it('expose la même API REST que le vrai serveur', async () => {
    mock = await startMock();
    const created = await request(mock.app).post('/api/games');
    expect(created.status).toBe(201);
    expect(isValidRoomCode(created.body.code)).toBe(true);
    expect((await request(mock.app).get('/api/health')).body.mock).toBe(true);
    expect((await request(mock.app).get(`/api/games/${created.body.code}`)).status).toBe(200);
    expect((await request(mock.app).get(`/api/games/${created.body.code}/qr`)).status).toBe(200);
  });

  it('la salle TEST existe toujours (pas besoin d’appeler l’API)', async () => {
    mock = await startMock({ scenario: 'lobby' });
    const screen = await mock.client();
    const lobby = waitFor(screen, EVENTS.LOBBY_UPDATE);
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    expect(await lobby).toHaveProperty('players');
    expect(mock.rooms.get('TEST')).toBeDefined();
  });

  it('scénario lobby : des faux joueurs arrivent, canStart devient vrai', async () => {
    mock = await startMock({ scenario: 'lobby', bots: 3 });
    const screen = await mock.client();
    const full = waitForLobby(screen, (p) => p.players.length === 3, 3000);
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    const payload = await full;
    expect(payload.canStart).toBe(true);
    expect(payload.players.map((p) => p.slot)).toEqual(['P1', 'P2', 'P3']);
  });

  it('un vrai téléphone rejoint le mock et prend la place libre suivante', async () => {
    mock = await startMock({ scenario: 'lobby', bots: 2 });
    const screen = await mock.client();
    const ready = waitForLobby(screen, (p) => p.players.length === 2, 3000);
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    await ready;

    const phone = await mock.client();
    const joined = waitFor(phone, EVENTS.PLAYER_JOINED);
    phone.emit(EVENTS.PLAYER_JOIN, { code: 'TEST', nickname: 'Alan' });
    expect(await joined).toMatchObject({ slot: 'P3' });
  });

  /** Rejoint en écran + 1 téléphone, lance la partie et renvoie les journaux d'événements. */
  async function playScenario(scenario) {
    mock = await startMock({ scenario, bots: 1 });
    const screen = await mock.client();
    const screenLog = record(screen);
    const ready = waitForLobby(screen, (p) => p.players.length === 1, 3000);
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    await ready;

    const phone = await mock.client();
    const phoneLog = record(phone);
    const joined = waitFor(phone, EVENTS.PLAYER_JOINED);
    phone.emit(EVENTS.PLAYER_JOIN, { code: 'TEST', nickname: 'Alan' });
    await joined;

    const over = waitFor(screen, EVENTS.GAME_OVER, 5000);
    screen.emit(EVENTS.GAME_START, {});
    const result = await over;
    await new Promise((r) => setTimeout(r, 20)); // laisse arriver les derniers messages
    return { result, screenLog, phoneLog };
  }

  it('scénario victory : modules résolus, module final déverrouillé, victoire', async () => {
    const { result, screenLog, phoneLog } = await playScenario('victory');
    expect(result).toMatchObject({ result: 'won', reason: 'final_solved' });

    const states = screenLog.filter((e) => e.event === EVENTS.GAME_STATE).map((e) => e.payload);
    expect(states[0].modules.find((m) => m.id === 'final').status).toBe('locked');
    expect(states.at(-1).modules.every((m) => m.status === 'solved')).toBe(true);

    const solved = phoneLog.filter(
      (e) => e.event === EVENTS.MODULE_RESULT && e.payload.result === 'solved',
    );
    expect(solved).toHaveLength(5);
    expect(phoneLog.some((e) => e.event === EVENTS.GAME_TICK)).toBe(true);
  });

  it('scénario defeat-errors : 3 erreurs puis défaite', async () => {
    const { result, phoneLog } = await playScenario('defeat-errors');
    expect(result).toMatchObject({ result: 'lost', reason: 'too_many_errors', errors: 3 });
    const errors = phoneLog.filter(
      (e) => e.event === EVENTS.MODULE_RESULT && e.payload.result === 'error',
    );
    expect(errors).toHaveLength(3);
  });

  it('scénario defeat-time : le chrono arrive à 0', async () => {
    const { result, screenLog } = await playScenario('defeat-time');
    expect(result).toMatchObject({ result: 'lost', reason: 'time_up' });
    const ticks = screenLog.filter((e) => e.event === EVENTS.GAME_TICK);
    expect(ticks.at(-1).payload.timeLeft).toBe(0);
  });

  it('scénario focus : bascule de focus et erreurs NOT_FOCUSED / FOCUS_COOLDOWN', async () => {
    const { phoneLog } = await playScenario('focus');
    const focusIds = phoneLog
      .filter((e) => e.event === EVENTS.PLAYER_VIEW)
      .map((e) => e.payload.focusedModuleId);
    expect(new Set(focusIds).size).toBeGreaterThanOrEqual(3);
    const codes = phoneLog.filter((e) => e.event === EVENTS.ERROR).map((e) => e.payload.code);
    expect(codes).toEqual(expect.arrayContaining(['NOT_FOCUSED', 'FOCUS_COOLDOWN']));
  });

  it('scénario disconnect : pause, reprise, puis reprise avec redistribution', async () => {
    const { screenLog } = await playScenario('disconnect');
    const paused = screenLog.filter((e) => e.event === EVENTS.GAME_PAUSED);
    const resumed = screenLog.filter((e) => e.event === EVENTS.GAME_RESUMED);
    expect(paused[0].payload).toMatchObject({ reason: 'player_disconnected', slot: 'P1' });
    expect(paused[0].payload.resumeDeadline).toBeTypeOf('number');
    expect(resumed.map((e) => e.payload.redistributed)).toEqual([false, true]);
  });

  it('chaque téléphone reçoit sa propre vue (player:view avec sa place)', async () => {
    const { phoneLog } = await playScenario('victory');
    const views = phoneLog.filter((e) => e.event === EVENTS.PLAYER_VIEW);
    expect(views.length).toBeGreaterThan(0);
    for (const { payload } of views) {
      expect(payload).toEqual({
        status: expect.any(String),
        focusedModuleId: expect.any(String),
        modules: expect.any(Array),
        view: expect.objectContaining({ slot: 'P2' }),
      });
    }
  });

  it('game:state respecte le contrat v1', async () => {
    const { screenLog } = await playScenario('victory');
    const state = screenLog.find((e) => e.event === EVENTS.GAME_STATE).payload;
    expect(Object.keys(state).sort()).toEqual(
      ['errors', 'focusedModuleId', 'maxErrors', 'modules', 'players', 'status', 'timeLeft'].sort(),
    );
    expect(state.modules).toHaveLength(5);
    expect(state.modules[0]).toEqual({
      id: expect.any(String),
      status: expect.any(String),
      view: expect.anything(),
    });
  });

  it('game:restart ramène au lobby avec les mêmes joueurs', async () => {
    await playScenario('defeat-errors');
    const screen = await mock.client();
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    await waitFor(screen, EVENTS.LOBBY_UPDATE);
    const lobby = waitFor(screen, EVENTS.LOBBY_UPDATE);
    screen.emit(EVENTS.GAME_RESTART, {});
    expect((await lobby).players).toHaveLength(2);
    expect(mock.rooms.get('TEST')?.status).toBe('lobby');
  });

  it('game:start avec moins de 2 joueurs : error NOT_ENOUGH_PLAYERS', async () => {
    mock = await startMock({ scenario: 'victory', bots: 0 });
    const screen = await mock.client();
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'TEST' });
    await waitFor(screen, EVENTS.LOBBY_UPDATE);
    const error = waitFor(screen, EVENTS.ERROR);
    screen.emit(EVENTS.GAME_START, {});
    expect(await error).toMatchObject({ code: 'NOT_ENOUGH_PLAYERS' });
  });
});
