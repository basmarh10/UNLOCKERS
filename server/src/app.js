// @ts-check
/**
 * Assemble le serveur : Express (API REST) + Socket.IO sur le même serveur HTTP.
 * Séparé de `index.js` pour pouvoir le démarrer dans les tests (port 0, faux clients).
 */
import { createServer as createHttpServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { DEFAULT_RULES } from '@unlockers/shared';
import { modules as registeredModules } from '@unlockers/modules';
import { createApiRouter } from './api/router.js';
import { nullStore, safeStore } from './db/store.js';
import { validateRegistry } from './game/moduleLoader.js';
import { registerHandlers } from './realtime/handlers.js';
import { RoomManager } from './rooms/RoomManager.js';

/**
 * @param {object} [options]
 * @param {string} [options.publicUrl] base des liens pour rejoindre
 * @param {RoomManager} [options.rooms]
 * @param {Partial<import('./db/store.js').GameStore>} [options.store] sauvegarde (aucune par défaut)
 * @param {readonly import('./game/moduleLoader.js').ModuleEntry[]} [options.modules]
 *   modules disponibles (registre `@unlockers/modules` par défaut)
 * @param {import('./game/Game.js').GameRules} [options.rules] règles (durée, erreurs, focus)
 * @param {number} [options.tickMs] durée d'une « seconde » de chrono (accélérée dans les tests)
 */
export function createServer({
  publicUrl = 'http://localhost:3000',
  rooms = new RoomManager(),
  store = nullStore,
  modules = registeredModules,
  rules = DEFAULT_RULES,
  tickMs = 1000,
} = {}) {
  // Un module cassé doit empêcher le démarrage, pas planter une partie en cours.
  const registry = validateRegistry(modules);
  const gameStore = safeStore(store);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', createApiRouter({ rooms, publicUrl, store: gameStore }));

  const httpServer = createHttpServer(app);
  // En dev, l'écran (5173) et le téléphone (5174) passent par le proxy Vite ;
  // le CORS ouvert sert aux clients natifs et aux tests depuis une autre origine.
  const io = new SocketServer(httpServer, { cors: { origin: true } });
  const realtime = registerHandlers(io, { rooms, store: gameStore, registry, rules, tickMs });

  return {
    app,
    httpServer,
    io,
    rooms,
    /** Arrête les chronos, ferme Socket.IO puis le serveur HTTP. */
    close: () =>
      new Promise((resolve) => {
        realtime.dispose();
        io.close(() => resolve(undefined));
      }),
  };
}
