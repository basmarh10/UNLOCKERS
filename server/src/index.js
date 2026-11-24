// @ts-check
/**
 * Point d'entrée du serveur : lit la configuration, ouvre la base SQLite, démarre
 * Express + Socket.IO sur un seul port (API `/api/*` et `/socket.io`).
 */
import { loadConfig } from './config.js';
import { createServer } from './app.js';
import { openDatabase } from './db/client.js';
import { createSqliteStore } from './db/sqliteStore.js';

const config = loadConfig();
const database = openDatabase(config.dbFile);
const server = createServer({
  publicUrl: config.publicUrl,
  rules: config.rules,
  store: createSqliteStore(database.db, config.rules),
});

server.httpServer.listen(config.port, () => {
  console.log(`[server] Prêt sur http://localhost:${config.port}`);
  console.log(
    `[server] API : /api/health · Liens pour rejoindre : ${config.publicUrl}/play?code=…`,
  );
  console.log(`[server] Base SQLite : ${config.dbFile}`);
});

/** Arrêt propre (Ctrl+C, redémarrage de node --watch, hébergeur). */
async function shutdown() {
  await server.close();
  database.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
