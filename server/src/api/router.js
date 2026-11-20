// @ts-check
/**
 * Routes REST `/api/*` (voir « API REST » dans docs/PLAN.md).
 */
import express from 'express';
import QRCode from 'qrcode';
import { CONTRACT_VERSION, ERROR_CODES, PLAY_PATH } from '@unlockers/shared';
import { errorPayload } from '../errors.js';

/**
 * Lien que le téléphone ouvre pour rejoindre une partie.
 * @param {string} publicUrl
 * @param {string} code
 */
export function joinUrlFor(publicUrl, code) {
  return `${publicUrl}${PLAY_PATH}?code=${code}`;
}

/**
 * @param {object} deps
 * @param {import('../rooms/RoomManager.js').RoomManager} deps.rooms
 * @param {string} deps.publicUrl
 * @param {import('../db/store.js').GameStore} deps.store
 */
export function createApiRouter({ rooms, publicUrl, store }) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', contractVersion: CONTRACT_VERSION, rooms: rooms.size });
  });

  router.post('/games', (_req, res) => {
    const room = rooms.create();
    store.saveGame(room);
    /** @type {import('@unlockers/shared/types.js').CreateGameResponse} */
    const body = { code: room.code, joinUrl: joinUrlFor(publicUrl, room.code) };
    res.status(201).json(body);
  });

  router.get('/games/:code', (req, res) => {
    const room = rooms.get(req.params.code);
    if (!room) return res.status(404).json(errorPayload(ERROR_CODES.GAME_NOT_FOUND));
    res.json(room.toInfo());
  });

  router.get('/games/:code/qr', async (req, res, next) => {
    const room = rooms.get(req.params.code);
    if (!room) return res.status(404).json(errorPayload(ERROR_CODES.GAME_NOT_FOUND));
    try {
      const svg = await QRCode.toString(joinUrlFor(publicUrl, room.code), {
        type: 'svg',
        margin: 1,
      });
      res.type('image/svg+xml').send(svg);
    } catch (err) {
      next(err);
    }
  });

  // Toute autre route /api : 404 en JSON (jamais la page HTML d'Express)
  router.use((_req, res) =>
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route inconnue.' }),
  );

  return router;
}
