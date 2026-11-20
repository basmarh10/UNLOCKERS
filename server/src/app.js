// @ts-check
/**
 * Assemble le serveur : Express (API REST) + Socket.IO sur le même serveur HTTP.
 * Séparé de `index.js` pour pouvoir le démarrer dans les tests (port 0, faux clients).
 */
import { createServer as createHttpServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { createApiRouter } from './api/router.js';
import { nullStore, safeStore } from './db/store.js';
import { registerHandlers } from './realtime/handlers.js';
import { RoomManager } from './rooms/RoomManager.js';

/**
 * @param {object} [options]
 * @param {string} [options.publicUrl] base des liens pour rejoindre
 * @param {RoomManager} [options.rooms]
 * @param {Partial<import('./db/store.js').GameStore>} [options.store] sauvegarde (aucune par défaut)
 */
export function createServer({
  publicUrl = 'http://localhost:3000',
  rooms = new RoomManager(),
  store = nullStore,
} = {}) {
  const gameStore = safeStore(store);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', createApiRouter({ rooms, publicUrl, store: gameStore }));

  const httpServer = createHttpServer(app);
  // En dev, l'écran (5173) et le téléphone (5174) passent par le proxy Vite ;
  // le CORS ouvert sert aux clients natifs et aux tests depuis une autre origine.
  const io = new SocketServer(httpServer, { cors: { origin: true } });
  registerHandlers(io, { rooms, store: gameStore });

  return {
    app,
    httpServer,
    io,
    rooms,
    /** Ferme Socket.IO puis le serveur HTTP. */
    close: () =>
      new Promise((resolve) => {
        io.close(() => resolve(undefined));
      }),
  };
}
