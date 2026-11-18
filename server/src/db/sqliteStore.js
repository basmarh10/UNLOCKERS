// @ts-check
/**
 * Sauvegarde des parties et des joueurs dans SQLite (implémente `GameStore`).
 * Écritures en « upsert » : on peut rappeler saveGame / savePlayer à chaque changement.
 */
import { DEFAULT_RULES } from '@unlockers/shared';
import { games, players } from './schema.js';

/**
 * @param {import('./client.js').Db} db
 * @param {{ durationSeconds: number, maxErrors: number }} [rules]
 * @returns {import('./store.js').GameStore}
 */
export function createSqliteStore(db, rules = DEFAULT_RULES) {
  /** @param {import('../rooms/Room.js').Room} room */
  const saveGame = (room) => {
    const row = {
      id: room.id,
      code: room.code,
      status: room.status,
      duration: rules.durationSeconds,
      maxErrors: rules.maxErrors,
      createdAt: new Date(room.createdAt),
    };
    db.insert(games)
      .values(row)
      .onConflictDoUpdate({ target: games.id, set: { status: row.status } })
      .run();
  };

  return {
    saveGame,
    savePlayer(room, player) {
      saveGame(room); // la partie doit exister (clé étrangère)
      const row = {
        id: player.playerId,
        gameId: room.id,
        nickname: player.nickname,
        slot: player.slot,
        connected: player.connected,
        lastSeenAt: new Date(),
      };
      db.insert(players)
        .values(row)
        .onConflictDoUpdate({
          target: players.id,
          set: { connected: row.connected, lastSeenAt: row.lastSeenAt },
        })
        .run();
    },
  };
}
