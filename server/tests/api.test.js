import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { isValidRoomCode } from '@unlockers/shared';
import { createServer } from '../src/app.js';

describe('API REST', () => {
  /** @type {ReturnType<typeof createServer>} */
  let server;

  beforeEach(() => {
    server = createServer({ publicUrl: 'http://test.local' });
  });
  afterEach(() => server.close());

  it('GET /api/health répond que le serveur tourne', async () => {
    const res = await request(server.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.contractVersion).toBe(1);
  });

  it('POST /api/games crée une partie et renvoie code + joinUrl', async () => {
    const res = await request(server.app).post('/api/games');
    expect(res.status).toBe(201);
    expect(isValidRoomCode(res.body.code)).toBe(true);
    expect(res.body.joinUrl).toBe(`http://test.local/play?code=${res.body.code}`);
    expect(server.rooms.get(res.body.code)).toBeDefined();
  });

  it('GET /api/games/:code renvoie statut et nombre de joueurs', async () => {
    const { body } = await request(server.app).post('/api/games');
    const res = await request(server.app).get(`/api/games/${body.code.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: body.code, status: 'lobby', playerCount: 0, maxPlayers: 4 });
  });

  it('GET /api/games/:code renvoie 404 GAME_NOT_FOUND pour un code inconnu', async () => {
    const res = await request(server.app).get('/api/games/ZZZZ');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('GAME_NOT_FOUND');
    expect(res.body.message).toBeTypeOf('string');
  });

  it('GET /api/games/:code/qr renvoie un QR code SVG du lien', async () => {
    const { body } = await request(server.app).post('/api/games');
    const res = await request(server.app).get(`/api/games/${body.code}/qr`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(String(res.body)).toContain('<svg');
  });

  it('GET /api/games/:code/qr renvoie 404 pour un code inconnu', async () => {
    const res = await request(server.app).get('/api/games/ZZZZ/qr');
    expect(res.status).toBe(404);
  });

  it('une route /api inconnue renvoie 404 en JSON', async () => {
    const res = await request(server.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
