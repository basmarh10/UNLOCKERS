// @ts-check
/**
 * Mock-server : un faux serveur qui parle exactement le contrat v1, pour que l'écran (Sara)
 * et le téléphone (Alan) avancent sans attendre le vrai moteur de jeu.
 *
 * - Même API REST que le vrai serveur (`/api/games`, `/api/games/:code`, QR, health).
 * - Lobby réel (vrais téléphones acceptés) + faux joueurs (« bots ») qui arrivent seuls.
 * - Sur `game:start`, rejoue un scénario scripté (voir `scenarios.js`).
 * - Les vrais téléphones peuvent aussi jouer : `module:focus`, et `module:action` avec
 *   `action: 'ok' | 'error' | 'solve'`.
 * - La salle `TEST` existe toujours : pratique pour coder sans appeler l'API.
 */
import { createServer as createHttpServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import {
  CONTRACT_VERSION,
  DEFAULT_RULES,
  ERROR_CODES,
  EVENTS,
  GAME_STATUS,
  MIN_PLAYERS,
  MODULE_STATUS,
  PAUSE_REASON,
} from '@unlockers/shared';
import { createApiRouter } from '../src/api/router.js';
import { nullStore } from '../src/db/store.js';
import { errorPayload } from '../src/errors.js';
import { playerJoinSchema, screenJoinSchema } from '../src/realtime/schemas.js';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { FakeGame } from './fakeGame.js';
import { DEFAULT_SCENARIO, SCENARIOS } from './scenarios.js';

const BOT_NAMES = ['Ana (bot)', 'Bob (bot)', 'Cy (bot)', 'Dan (bot)'];
export const TEST_ROOM_CODE = 'TEST';

/**
 * @typedef {object} Session état du mock pour une salle
 * @property {string} scenario
 * @property {FakeGame | null} game
 * @property {Set<ReturnType<typeof setTimeout>>} timers
 * @property {boolean} botsScheduled
 */

/**
 * @param {object} [options]
 * @param {string} [options.scenario] scénario par défaut (`victory`)
 * @param {number} [options.speed] accélération du temps (1 = temps réel)
 * @param {number} [options.bots] nombre de faux joueurs qui rejoignent le lobby (0 à 4)
 * @param {boolean} [options.autoStart] lance la partie seul une fois les bots arrivés
 * @param {string} [options.publicUrl]
 */
export function createMockServer({
  scenario = DEFAULT_SCENARIO,
  speed = 1,
  bots = 2,
  autoStart = false,
  publicUrl = 'http://localhost:5174',
} = {}) {
  if (!SCENARIOS[scenario]) throw new Error(`Scénario inconnu : ${scenario}`);
  const seconds = (/** @type {number} */ s) => (s * 1000) / speed;

  const rooms = new RoomManager();
  rooms.create(TEST_ROOM_CODE);
  /** @type {Map<string, Session>} */
  const sessions = new Map();

  const app = express();
  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', mock: true, contractVersion: CONTRACT_VERSION, scenario }),
  );
  app.use('/api', createApiRouter({ rooms, publicUrl, store: nullStore }));

  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, { cors: { origin: true } });

  // ─── Outils ────────────────────────────────────────────────────────────────

  /** @param {import('../src/rooms/Room.js').Room} room */
  function sessionOf(room) {
    let session = sessions.get(room.code);
    if (!session) {
      session = { scenario, game: null, timers: new Set(), botsScheduled: false };
      sessions.set(room.code, session);
    }
    return session;
  }

  /** setTimeout suivi, pour tout annuler au restart / à la fermeture. */
  function later(
    /** @type {Session} */ session,
    /** @type {number} */ ms,
    /** @type {() => void} */ fn,
  ) {
    const timer = setTimeout(() => {
      session.timers.delete(timer);
      fn();
    }, ms);
    session.timers.add(timer);
  }

  function clearTimers(/** @type {Session} */ session) {
    session.timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    session.timers.clear();
  }

  /** @param {import('../src/rooms/Room.js').Room} room */
  const broadcastLobby = (room) => io.to(room.code).emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());

  /** game:state à l'écran, player:view à chaque téléphone (chacun sa place). */
  function broadcastState(/** @type {import('../src/rooms/Room.js').Room} */ room) {
    const { game } = sessionOf(room);
    if (!game) return;
    io.to(`${room.code}:screens`).emit(EVENTS.GAME_STATE, game.gameState());
    for (const { slot } of room.publicPlayers()) {
      io.to(`${room.code}:${slot}`).emit(EVENTS.PLAYER_VIEW, game.playerView(slot));
    }
  }

  /** Si la partie est finie : arrête les minuteries et envoie `game:over` (état déjà diffusé). */
  function endIfOver(/** @type {import('../src/rooms/Room.js').Room} */ room) {
    const session = sessionOf(room);
    if (!session.game?.over) return;
    clearTimers(session);
    io.to(room.code).emit(EVENTS.GAME_OVER, session.game.over);
  }

  /** @param {import('../src/rooms/Room.js').Room} room @param {string} slot */
  const playerAt = (room, slot) => [...room.players.values()].find((p) => p.slot === slot);

  // ─── Déroulé d'une partie ─────────────────────────────────────────────────

  function scheduleBots(/** @type {import('../src/rooms/Room.js').Room} */ room) {
    const session = sessionOf(room);
    if (session.botsScheduled) return;
    session.botsScheduled = true;
    const count = Math.min(bots, BOT_NAMES.length);
    for (let i = 0; i < count; i++) {
      later(session, seconds(i + 1), () => {
        if (room.status !== GAME_STATUS.LOBBY) return;
        room.join({ nickname: BOT_NAMES[i] });
        broadcastLobby(room);
      });
    }
    if (autoStart && session.scenario !== 'lobby') {
      later(session, seconds(count + 2), () => startGame(room));
    }
  }

  function startGame(/** @type {import('../src/rooms/Room.js').Room} */ room) {
    const session = sessionOf(room);
    const script = SCENARIOS[session.scenario];
    room.status = GAME_STATUS.PLAYING;
    session.game = new FakeGame(room, script.duration);
    const game = session.game;
    broadcastState(room);

    const ticker = setInterval(() => {
      game.tick();
      if (!game.paused) io.to(room.code).emit(EVENTS.GAME_TICK, { timeLeft: game.timeLeft });
      if (game.over) broadcastState(room); // statut « lost » visible avant game:over
      endIfOver(room);
    }, seconds(1));
    session.timers.add(ticker);

    for (const step of script.steps) {
      later(session, seconds(step.at), () => {
        if (game.over) return;
        runStep(room, game, step);
      });
    }
  }

  /**
   * @param {import('../src/rooms/Room.js').Room} room
   * @param {FakeGame} game
   * @param {import('./scenarios.js').Step} step
   */
  function runStep(room, game, step) {
    switch (step.type) {
      case 'focus':
        game.focusedModuleId = step.moduleId;
        broadcastState(room);
        break;
      case 'action':
        io.to(room.code).emit(EVENTS.MODULE_RESULT, {
          moduleId: game.focusedModuleId,
          slot: step.slot,
          result: step.result,
        });
        game.applyResult(step.result);
        broadcastState(room);
        endIfOver(room);
        break;
      case 'reject':
        io.to(`${room.code}:phones`).emit(EVENTS.ERROR, errorPayload(step.code));
        break;
      case 'disconnect': {
        const player = playerAt(room, step.slot);
        if (player) player.connected = false;
        game.paused = true;
        io.to(room.code).emit(EVENTS.GAME_PAUSED, {
          reason: PAUSE_REASON.PLAYER_DISCONNECTED,
          slot: step.slot,
          resumeDeadline: Date.now() + seconds(DEFAULT_RULES.reconnectGraceMs / 1000),
        });
        broadcastState(room);
        break;
      }
      case 'reconnect':
      case 'redistribute': {
        const player = playerAt(room, step.slot);
        if (player && step.type === 'reconnect') player.connected = true;
        game.paused = false;
        io.to(room.code).emit(EVENTS.GAME_RESUMED, { redistributed: step.type === 'redistribute' });
        broadcastState(room);
        break;
      }
    }
  }

  // ─── Événements reçus ───────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    const data = socket.data;
    const fail = (/** @type {import('@unlockers/shared/types.js').ErrorCode} */ code) =>
      socket.emit(EVENTS.ERROR, errorPayload(code));
    const currentRoom = () => (data.code ? rooms.get(data.code) : undefined);

    socket.on(EVENTS.SCREEN_JOIN, (payload) => {
      const parsed = screenJoinSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const room = rooms.get(parsed.data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);

      const session = sessionOf(room);
      // L'écran peut choisir son scénario : io({ query: { scenario: 'defeat-time' } })
      const wanted = socket.handshake.query.scenario;
      if (typeof wanted === 'string' && SCENARIOS[wanted] && !session.game)
        session.scenario = wanted;

      data.role = 'screen';
      data.code = room.code;
      socket.join([room.code, `${room.code}:screens`]);
      socket.emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());
      if (session.game) socket.emit(EVENTS.GAME_STATE, session.game.gameState());
      scheduleBots(room);
    });

    socket.on(EVENTS.PLAYER_JOIN, (payload) => {
      const parsed = playerJoinSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const room = rooms.get(parsed.data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);

      const playerId = data.code === room.code ? data.playerId : parsed.data.playerId;
      const result = room.join({ nickname: parsed.data.nickname, playerId });
      if (!result.ok) return fail(result.code);

      const { player } = result;
      Object.assign(data, { role: 'phone', code: room.code, playerId: player.playerId });
      socket.join([room.code, `${room.code}:phones`, `${room.code}:${player.slot}`]);
      socket.emit(EVENTS.PLAYER_JOINED, { playerId: player.playerId, slot: player.slot });
      broadcastLobby(room);
      const { game } = sessionOf(room);
      if (game) socket.emit(EVENTS.PLAYER_VIEW, game.playerView(player.slot));
    });

    socket.on(EVENTS.GAME_START, () => {
      const room = currentRoom();
      if (!room || data.role !== 'screen') return fail(ERROR_CODES.GAME_NOT_FOUND);
      if (room.status !== GAME_STATUS.LOBBY) return fail(ERROR_CODES.GAME_STARTED);
      const connected = room.publicPlayers().filter((p) => p.connected).length;
      if (connected < MIN_PLAYERS) return fail(ERROR_CODES.NOT_ENOUGH_PLAYERS);
      startGame(room);
    });

    socket.on(EVENTS.GAME_RESTART, () => {
      const room = currentRoom();
      if (!room || data.role !== 'screen') return fail(ERROR_CODES.GAME_NOT_FOUND);
      const session = sessionOf(room);
      clearTimers(session);
      session.game = null;
      room.status = GAME_STATUS.LOBBY;
      broadcastLobby(room);
    });

    socket.on(EVENTS.MODULE_FOCUS, (payload) => {
      const room = currentRoom();
      const game = room && sessionOf(room).game;
      if (!room || !game || game.over) return fail(ERROR_CODES.INVALID_ACTION);
      const module = game.modules.find((m) => m.id === payload?.moduleId);
      if (!module) return fail(ERROR_CODES.INVALID_PAYLOAD);
      if (module.status === MODULE_STATUS.LOCKED) return fail(ERROR_CODES.MODULE_LOCKED);
      game.focusedModuleId = module.id;
      broadcastState(room);
    });

    socket.on(EVENTS.MODULE_ACTION, (payload) => {
      const room = currentRoom();
      const game = room && sessionOf(room).game;
      const player = room && data.playerId ? room.getPlayer(data.playerId) : undefined;
      if (!room || !game || game.over || !player) return fail(ERROR_CODES.INVALID_ACTION);
      if (payload?.moduleId !== game.focusedModuleId) return fail(ERROR_CODES.NOT_FOCUSED);
      const action = payload?.action;
      const result = action === 'solve' ? 'solved' : action === 'error' ? 'error' : 'ok';
      io.to(room.code).emit(EVENTS.MODULE_RESULT, {
        moduleId: game.focusedModuleId,
        slot: player.slot,
        result,
      });
      game.applyResult(result);
      broadcastState(room);
      endIfOver(room);
    });

    socket.on('disconnect', () => {
      const room = currentRoom();
      if (!room || data.role !== 'phone' || !data.playerId) return;
      room.disconnect(data.playerId);
      broadcastLobby(room);
      broadcastState(room);
    });
  });

  return {
    app,
    httpServer,
    io,
    rooms,
    close: () =>
      new Promise((resolve) => {
        sessions.forEach(clearTimers);
        io.close(() => resolve(undefined));
      }),
  };
}
