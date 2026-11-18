// Base SQLite + Drizzle : schéma games / players et sauvegarde aux moments clés (tâche Notion #13).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabase } from '../src/db/client.js';
import { games, players } from '../src/db/schema.js';
import { createSqliteStore } from '../src/db/sqliteStore.js';
import { Room } from '../src/rooms/Room.js';

describe('SQLite + Drizzle', () => {
  /** @type {ReturnType<typeof openDatabase>} */
  let database;

  beforeEach(() => {
    database = openDatabase(':memory:'); // applique les migrations
  });
  afterEach(() => database.close());

  it('crée les tables games et players via les migrations', () => {
    const tables = database.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(['games', 'players']));
  });

  it('saveGame enregistre la partie, puis met à jour son statut', () => {
    const store = createSqliteStore(database.db);
    const room = new Room('ABCD');
    store.saveGame(room);

    let [row] = database.db.select().from(games).where(eq(games.id, room.id)).all();
    expect(row).toMatchObject({ code: 'ABCD', status: 'lobby', duration: 300, maxErrors: 3 });
    expect(row.createdAt).toBeInstanceOf(Date);

    room.status = 'playing';
    store.saveGame(room);
    [row] = database.db.select().from(games).where(eq(games.id, room.id)).all();
    expect(row.status).toBe('playing');
    expect(database.db.select().from(games).all()).toHaveLength(1);
  });

  it('savePlayer enregistre le joueur, puis sa déconnexion', () => {
    const store = createSqliteStore(database.db);
    const room = new Room('ABCD');
    store.saveGame(room);
    const { player } = /** @type {any} */ (room.join({ nickname: 'Ana' }));
    store.savePlayer(room, player);

    room.status = 'playing';
    room.disconnect(player.playerId);
    store.savePlayer(room, player);

    const rows = database.db.select().from(players).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: player.playerId,
      gameId: room.id,
      nickname: 'Ana',
      slot: 'P1',
      connected: false,
    });
  });

  it('savePlayer crée la partie si elle n’a pas encore été enregistrée', () => {
    const store = createSqliteStore(database.db);
    const room = new Room('WXYZ');
    const { player } = /** @type {any} */ (room.join({ nickname: 'Bob' }));
    store.savePlayer(room, player);
    expect(database.db.select().from(games).all()).toHaveLength(1);
  });
});
