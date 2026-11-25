// @ts-check
/**
 * Gestion des événements Socket.IO (contrat v1, `@unlockers/shared/events.js`).
 *
 * S1 : écran qui s'abonne à une salle, téléphones qui rejoignent / se reconnectent, lobby.
 * S2 : lancement de la partie, focus partagé, actions sur les modules, chrono, fin de partie.
 *
 * Rooms Socket.IO :
 * - `<code>` : toute la salle (écran + téléphones) → lobby:update, module:result, game:tick, game:over ;
 * - `<code>:screen` : les écrans seulement → game:state (contient les vues écran de tous les modules).
 * Chaque téléphone reçoit son propre `player:view`, envoyé socket par socket.
 */
import { ERROR_CODES, EVENTS, GAME_STATUS } from '@unlockers/shared';
import { errorPayload } from '../errors.js';
import { Game } from '../game/Game.js';
import {
  moduleActionSchema,
  moduleFocusSchema,
  playerJoinSchema,
  screenJoinSchema,
} from './schemas.js';

/**
 * Données attachées à chaque socket.
 * @typedef {object} SocketData
 * @property {'screen' | 'phone'} [role]
 * @property {string} [code]
 * @property {string} [playerId]
 */

/** @typedef {import('../rooms/Room.js').Room} Room */

/** Nom de la room Socket.IO qui ne contient que les écrans d'une salle. */
const screenRoom = (/** @type {string} */ code) => `${code}:screen`;

/**
 * Branche les gestionnaires d'événements sur le serveur Socket.IO.
 * @param {import('socket.io').Server} io
 * @param {object} deps
 * @param {import('../rooms/RoomManager.js').RoomManager} deps.rooms
 * @param {import('../db/store.js').GameStore} deps.store
 * @param {readonly import('../game/moduleLoader.js').ModuleEntry[]} deps.registry
 * @param {import('../game/Game.js').GameRules} deps.rules
 * @param {number} deps.tickMs
 * @returns {{ dispose: () => void }}
 */
export function registerHandlers(io, { rooms, store, registry, rules, tickMs }) {
  /** Chronos en cours : code de salle → intervalle. */
  const timers = new Map();

  /** Diffuse le lobby à toute la salle (écran + téléphones). */
  const broadcastLobby = (/** @type {Room} */ room) =>
    io.to(room.code).emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());

  /**
   * Envoie à un téléphone sa vue (s'il occupe une place dans la partie en cours).
   * @param {import('socket.io').Socket} socket
   * @param {Room} room
   */
  const sendPlayerView = (socket, room) => {
    const data = /** @type {SocketData} */ (socket.data);
    const player = data.playerId ? room.getPlayer(data.playerId) : undefined;
    if (!room.game || !player) return;
    socket.emit(EVENTS.PLAYER_VIEW, room.game.playerView(player.slot));
  };

  /** Envoie l'état complet : game:state aux écrans, player:view à chaque téléphone. */
  const broadcastGame = (/** @type {Room} */ room) => {
    if (!room.game) return;
    io.to(screenRoom(room.code)).emit(EVENTS.GAME_STATE, room.game.gameState());
    const socketIds = io.sockets.adapter.rooms.get(room.code) ?? new Set();
    for (const id of socketIds) {
      const socket = io.sockets.sockets.get(id);
      if (socket?.data.role === 'phone') sendPlayerView(socket, room);
    }
  };

  const stopTimer = (/** @type {string} */ code) => {
    clearInterval(timers.get(code));
    timers.delete(code);
  };

  /** Fin de partie : arrête le chrono, annonce le résultat, sauvegarde. */
  const endGame = (/** @type {Room} */ room) => {
    stopTimer(room.code);
    if (!room.game?.over) return;
    io.to(room.code).emit(EVENTS.GAME_OVER, room.game.over);
    broadcastGame(room);
    store.saveGame(room);
  };

  /** Démarre le chrono de la salle : game:tick chaque seconde, game:over à 0. */
  const startTimer = (/** @type {Room} */ room) => {
    stopTimer(room.code);
    const timer = setInterval(() => {
      const game = room.game;
      if (!game) return stopTimer(room.code);
      const ended = game.tick();
      io.to(room.code).emit(EVENTS.GAME_TICK, { timeLeft: game.timeLeft });
      if (ended) endGame(room);
    }, tickMs);
    timers.set(room.code, timer);
  };

  io.on('connection', (socket) => {
    const data = /** @type {SocketData} */ (socket.data);
    const fail = (/** @type {import('@unlockers/shared/types.js').ErrorCode} */ code) =>
      socket.emit(EVENTS.ERROR, errorPayload(code));

    /** Salle et place du téléphone qui envoie l'événement (undefined si pas un joueur). */
    const currentPlayer = () => {
      if (data.role !== 'phone' || !data.code || !data.playerId) return undefined;
      const room = rooms.get(data.code);
      const player = room?.getPlayer(data.playerId);
      return room && player ? { room, player } : undefined;
    };

    socket.on(EVENTS.SCREEN_JOIN, (payload) => {
      const parsed = screenJoinSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const room = rooms.get(parsed.data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);

      data.role = 'screen';
      data.code = room.code;
      socket.join([room.code, screenRoom(room.code)]);
      // Règle de reconnexion : on renvoie tout de suite l'état complet
      socket.emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());
      if (room.game) socket.emit(EVENTS.GAME_STATE, room.game.gameState());
    });

    socket.on(EVENTS.PLAYER_JOIN, (payload) => {
      const parsed = playerJoinSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const room = rooms.get(parsed.data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);

      // Un socket déjà placé dans cette salle garde sa place (double clic, renvoi)
      const playerId =
        data.role === 'phone' && data.code === room.code ? data.playerId : parsed.data.playerId;
      const result = room.join({ nickname: parsed.data.nickname, playerId });
      if (!result.ok) return fail(result.code);

      const { player } = result;
      data.role = 'phone';
      data.code = room.code;
      data.playerId = player.playerId;
      socket.join(room.code);
      store.savePlayer(room, player);

      socket.emit(EVENTS.PLAYER_JOINED, { playerId: player.playerId, slot: player.slot });
      broadcastLobby(room);
      // Reconnexion en cours de partie : vue complète tout de suite, l'écran voit le retour
      if (room.game) {
        sendPlayerView(socket, room);
        io.to(screenRoom(room.code)).emit(EVENTS.GAME_STATE, room.game.gameState());
      }
    });

    socket.on(EVENTS.GAME_START, () => {
      if (data.role !== 'screen' || !data.code) return fail(ERROR_CODES.GAME_NOT_FOUND);
      const room = rooms.get(data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);
      if (room.status !== GAME_STATUS.LOBBY) return fail(ERROR_CODES.GAME_STARTED);

      const game = new Game(room, { registry, rules });
      const started = game.start();
      if (!started.ok) return fail(started.code);

      room.game = game;
      store.saveGame(room);
      broadcastLobby(room); // canStart repasse à false
      broadcastGame(room);
      startTimer(room);
    });

    socket.on(EVENTS.MODULE_FOCUS, (payload) => {
      const parsed = moduleFocusSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const current = currentPlayer();
      const game = current?.room.game;
      if (!current || !game) return fail(ERROR_CODES.INVALID_ACTION);

      const { room, player } = current;
      const outcome = game.focus(player.slot, parsed.data.moduleId);
      if (!outcome.ok) return fail(outcome.code);
      if (outcome.changed) broadcastGame(room);
    });

    socket.on(EVENTS.MODULE_ACTION, (payload) => {
      const parsed = moduleActionSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const current = currentPlayer();
      const game = current?.room.game;
      if (!current || !game) return fail(ERROR_CODES.INVALID_ACTION);

      const { room, player } = current;
      const { moduleId, action } = parsed.data;
      const outcome = game.act(player.slot, moduleId, action);
      if (!outcome.ok) return fail(outcome.code);

      io.to(room.code).emit(EVENTS.MODULE_RESULT, {
        moduleId,
        slot: player.slot,
        result: outcome.result,
      });
      if (game.over) endGame(room);
      else broadcastGame(room);
    });

    socket.on('disconnect', () => {
      if (data.role !== 'phone' || !data.code || !data.playerId) return;
      const room = rooms.get(data.code);
      const player = room?.disconnect(data.playerId);
      if (!room || !player) return;
      store.savePlayer(room, player);
      broadcastLobby(room);
      // En partie, l'écran affiche le joueur déconnecté (pause et redistribution : S4)
      if (room.game) io.to(screenRoom(room.code)).emit(EVENTS.GAME_STATE, room.game.gameState());
    });
  });

  return {
    /** Arrête tous les chronos (fermeture du serveur, fin des tests). */
    dispose() {
      for (const code of [...timers.keys()]) stopTimer(code);
    },
  };
}
