// @ts-check
/**
 * Gestion des événements Socket.IO (contrat v1, `@unlockers/shared/events.js`).
 *
 * S1 : écran qui s'abonne à une salle, téléphones qui rejoignent / se reconnectent,
 * lobby en direct. Une room Socket.IO par partie, nommée par le code de salle.
 */
import { ERROR_CODES, EVENTS } from '@unlockers/shared';
import { errorPayload } from '../errors.js';
import { playerJoinSchema, screenJoinSchema } from './schemas.js';

/**
 * Données attachées à chaque socket.
 * @typedef {object} SocketData
 * @property {'screen' | 'phone'} [role]
 * @property {string} [code]
 * @property {string} [playerId]
 */

/**
 * Branche les gestionnaires d'événements sur le serveur Socket.IO.
 * @param {import('socket.io').Server} io
 * @param {object} deps
 * @param {import('../rooms/RoomManager.js').RoomManager} deps.rooms
 * @param {import('../db/store.js').GameStore} deps.store
 */
export function registerHandlers(io, { rooms, store }) {
  /** Diffuse le lobby à toute la salle (écran + téléphones). */
  const broadcastLobby = (/** @type {import('../rooms/Room.js').Room} */ room) =>
    io.to(room.code).emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());

  io.on('connection', (socket) => {
    const data = /** @type {SocketData} */ (socket.data);
    const fail = (/** @type {import('@unlockers/shared/types.js').ErrorCode} */ code) =>
      socket.emit(EVENTS.ERROR, errorPayload(code));

    socket.on(EVENTS.SCREEN_JOIN, (payload) => {
      const parsed = screenJoinSchema.safeParse(payload);
      if (!parsed.success) return fail(ERROR_CODES.INVALID_PAYLOAD);
      const room = rooms.get(parsed.data.code);
      if (!room) return fail(ERROR_CODES.GAME_NOT_FOUND);

      data.role = 'screen';
      data.code = room.code;
      socket.join(room.code);
      // Règle de reconnexion : on renvoie tout de suite l'état complet
      socket.emit(EVENTS.LOBBY_UPDATE, room.toLobbyUpdate());
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
    });

    socket.on('disconnect', () => {
      if (data.role !== 'phone' || !data.code || !data.playerId) return;
      const room = rooms.get(data.code);
      const player = room?.disconnect(data.playerId);
      if (!room || !player) return;
      store.savePlayer(room, player);
      broadcastLobby(room);
    });
  });
}
