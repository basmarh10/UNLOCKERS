// Outils de test : démarre un vrai serveur sur un port libre et crée des faux clients Socket.IO.
import { io as connect } from 'socket.io-client';
import { createServer } from '../src/app.js';

/**
 * Démarre le serveur (ou le mock, via `factory`) sur un port aléatoire.
 * @param {Record<string, any> & { factory?: typeof createServer }} [options]
 */
export async function startTestServer({ factory = createServer, ...options } = {}) {
  const server = factory({ publicUrl: 'http://test.local', ...options });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.httpServer.address());
  const url = `http://localhost:${port}`;
  /** @type {import('socket.io-client').Socket[]} */
  const clients = [];

  return {
    ...server,
    url,
    /** Nouveau faux client connecté (téléphone ou écran). */
    async client() {
      const socket = connect(url, { transports: ['websocket'], forceNew: true });
      clients.push(socket);
      await once(socket, 'connect');
      return socket;
    },
    async close() {
      clients.forEach((c) => c.disconnect());
      await server.close();
    },
  };
}

/**
 * Attend le prochain événement `event` (échoue après `timeout` ms).
 * @param {import('socket.io-client').Socket} socket
 * @param {string} event
 * @param {number} [timeout]
 */
export function once(socket, event, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Pas reçu « ${event} »`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Attend un `lobby:update` qui vérifie `predicate` (ignore les précédents).
 * @param {import('socket.io-client').Socket} socket
 * @param {(payload: any) => boolean} predicate
 */
export function waitForLobby(socket, predicate, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('lobby:update attendu non reçu')), timeout);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off('lobby:update', handler);
      resolve(payload);
    };
    socket.on('lobby:update', handler);
  });
}
