// @ts-check
/**
 * Schéma Drizzle (SQLite). Voir « Modèle de données » dans docs/PLAN.md.
 *
 * S1 : tables `games` et `players`. `module_states` et `game_events` arrivent au S3.
 * Après modification : `npm run db:generate -w @unlockers/server` pour créer la migration.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
  /** Identifiant interne (UUID) : le code de salle peut être réutilisé plus tard. */
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  /** lobby | playing | won | lost */
  status: text('status').notNull(),
  /** Graine aléatoire de la partie (génération des modules, S2+). */
  seed: text('seed'),
  /** Durée de la partie, en secondes. */
  duration: integer('duration').notNull(),
  maxErrors: integer('max_errors').notNull(),
  errors: integer('errors').notNull().default(0),
  /** won | lost */
  result: text('result'),
  /** final_solved | time_up | too_many_errors | not_enough_players */
  endReason: text('end_reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }),
  endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
});

export const players = sqliteTable(
  'players',
  {
    /** = `playerId` envoyé au téléphone */
    id: text('id').primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    nickname: text('nickname').notNull(),
    /** P1 | P2 | P3 | P4 */
    slot: text('slot').notNull(),
    connected: integer('connected', { mode: 'boolean' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
  },
  // Pas d'unicité (partie, place) : en lobby une place libérée peut être reprise.
  (table) => [index('players_game_idx').on(table.gameId)],
);
