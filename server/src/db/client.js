// @ts-check
/**
 * Ouverture de la base SQLite (better-sqlite3) + Drizzle, et application des migrations.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';

/** Dossier des migrations générées par drizzle-kit (`server/drizzle/`). */
export const MIGRATIONS_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

/**
 * Ouvre (ou crée) la base et la met à jour.
 * @param {string} file chemin du fichier SQLite, ou `:memory:` pour les tests
 */
export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(dirname(resolve(file)), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db, close: () => sqlite.close() };
}

/** @typedef {ReturnType<typeof openDatabase>['db']} Db */
