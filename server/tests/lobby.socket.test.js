// Tests d'intégration : salles et lobby avec de vrais clients Socket.IO (tâche Notion #15).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EVENTS } from '@unlockers/shared';
import { once, startTestServer, waitForLobby } from './helpers.js';

describe('Socket.IO : salles et lobby', () => {
  /** @type {Awaited<ReturnType<typeof startTestServer>>} */
  let server;
  /** @type {string} */
  let code;

  beforeEach(async () => {
    server = await startTestServer();
    code = server.rooms.create().code;
  });
  afterEach(() => server.close());

  /** Téléphone qui rejoint et renvoie { socket, joined }. */
  async function joinPhone(nickname, extra = {}) {
    const socket = await server.client();
    const joined = once(socket, EVENTS.PLAYER_JOINED);
    socket.emit(EVENTS.PLAYER_JOIN, { code, nickname, ...extra });
    return { socket, joined: await joined };
  }

  it('un téléphone rejoint : player:joined avec sa place et son playerId', async () => {
    const { joined } = await joinPhone('Ana');
    expect(joined.slot).toBe('P1');
    expect(joined.playerId).toBeTypeOf('string');
  });

  it('l’écran reçoit le lobby dès screen:join, puis chaque arrivée', async () => {
    const screen = await server.client();
    const first = once(screen, EVENTS.LOBBY_UPDATE);
    screen.emit(EVENTS.SCREEN_JOIN, { code });
    expect(await first).toEqual({ players: [], canStart: false });

    const twoPlayers = waitForLobby(screen, (p) => p.players.length === 2);
    await joinPhone('Ana');
    await joinPhone('Bob');
    expect(await twoPlayers).toEqual({
      players: [
        { slot: 'P1', nickname: 'Ana', connected: true },
        { slot: 'P2', nickname: 'Bob', connected: true },
      ],
      canStart: true,
    });
  });

  it('les autres téléphones reçoivent aussi lobby:update', async () => {
    const { socket: ana } = await joinPhone('Ana');
    const update = waitForLobby(ana, (p) => p.players.length === 2);
    await joinPhone('Bob');
    expect((await update).players.map((p) => p.nickname)).toEqual(['Ana', 'Bob']);
  });

  it('mauvais code : error GAME_NOT_FOUND au seul client fautif', async () => {
    const socket = await server.client();
    const error = once(socket, EVENTS.ERROR);
    socket.emit(EVENTS.PLAYER_JOIN, { code: 'ZZZZ', nickname: 'Ana' });
    expect(await error).toMatchObject({ code: 'GAME_NOT_FOUND' });
  });

  it('écran sur un code inconnu : error GAME_NOT_FOUND', async () => {
    const screen = await server.client();
    const error = once(screen, EVENTS.ERROR);
    screen.emit(EVENTS.SCREEN_JOIN, { code: 'ZZZZ' });
    expect(await error).toMatchObject({ code: 'GAME_NOT_FOUND' });
  });

  it('partie pleine : le 5e joueur reçoit error GAME_FULL', async () => {
    for (const name of ['Ana', 'Bob', 'Cy', 'Dan']) await joinPhone(name);
    const socket = await server.client();
    const error = once(socket, EVENTS.ERROR);
    socket.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Eve' });
    expect(await error).toMatchObject({ code: 'GAME_FULL' });
  });

  it('données mal formées : error INVALID_PAYLOAD', async () => {
    const socket = await server.client();
    for (const bad of [
      { code },
      { code, nickname: '   ' },
      { code, nickname: 'x'.repeat(17) },
      null,
    ]) {
      const error = once(socket, EVENTS.ERROR);
      socket.emit(EVENTS.PLAYER_JOIN, bad);
      expect(await error).toMatchObject({ code: 'INVALID_PAYLOAD' });
    }
  });

  it('accepte un code saisi en minuscules', async () => {
    const socket = await server.client();
    const joined = once(socket, EVENTS.PLAYER_JOINED);
    socket.emit(EVENTS.PLAYER_JOIN, { code: code.toLowerCase(), nickname: 'Ana' });
    expect(await joined).toMatchObject({ slot: 'P1' });
  });

  it('en lobby, un téléphone qui se déconnecte libère sa place', async () => {
    const screen = await server.client();
    screen.emit(EVENTS.SCREEN_JOIN, { code });
    await once(screen, EVENTS.LOBBY_UPDATE);
    await joinPhone('Ana');
    const { socket: bob } = await joinPhone('Bob');

    const afterLeave = waitForLobby(screen, (p) => p.players.length === 1);
    bob.disconnect();
    expect((await afterLeave).players).toEqual([{ slot: 'P1', nickname: 'Ana', connected: true }]);
  });

  it('un même socket ne peut pas occuper deux places', async () => {
    const { socket } = await joinPhone('Ana');
    const joined = once(socket, EVENTS.PLAYER_JOINED);
    socket.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Ana bis' });
    expect(await joined).toMatchObject({ slot: 'P1' });
    expect(server.rooms.get(code)?.playerCount).toBe(1);
  });

  it('reconnexion avec playerId : même place, même pseudo', async () => {
    const room = server.rooms.get(code);
    const { socket: ana, joined } = await joinPhone('Ana');
    await joinPhone('Bob');
    if (room) room.status = 'playing'; // en partie, la place est gardée
    ana.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(room?.getPlayer(joined.playerId)?.connected).toBe(false);

    const { joined: again } = await joinPhone('peu importe', { playerId: joined.playerId });
    expect(again).toEqual({ playerId: joined.playerId, slot: 'P1' });
    expect(room?.getPlayer(joined.playerId)?.connected).toBe(true);
  });

  it('partie lancée : un nouveau joueur reçoit error GAME_STARTED', async () => {
    const room = server.rooms.get(code);
    if (room) room.status = 'playing';
    const socket = await server.client();
    const error = once(socket, EVENTS.ERROR);
    socket.emit(EVENTS.PLAYER_JOIN, { code, nickname: 'Tard' });
    expect(await error).toMatchObject({ code: 'GAME_STARTED' });
  });

  it('le serveur enregistre la partie et les joueurs dans le store', async () => {
    await server.close();
    const calls = [];
    const store = {
      saveGame: (room) => calls.push(['game', room.code]),
      savePlayer: (room, player) => calls.push(['player', room.code, player.slot]),
    };
    server = await startTestServer({ store });
    code = server.rooms.create().code; // créée hors API : pas de saveGame ici
    await joinPhone('Ana');
    expect(calls).toContainEqual(['player', code, 'P1']);
  });
});
