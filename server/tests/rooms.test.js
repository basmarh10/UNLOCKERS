import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  GAME_STATUS,
  MAX_PLAYERS,
  ROOM_CODE_ALPHABET,
  isValidRoomCode,
} from '@unlockers/shared';
import { generateRoomCode } from '../src/rooms/roomCode.js';
import { Room } from '../src/rooms/Room.js';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('generateRoomCode', () => {
  it('produit un code valide de 4 caractères sans caractère ambigu', () => {
    for (let i = 0; i < 200; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });

  it('évite un code déjà pris', () => {
    // rng qui renvoie d'abord 0 (→ "AAAA", pris), puis la fin de l'alphabet
    const values = [0, 0, 0, 0, 0.99, 0.99, 0.99, 0.99];
    const rng = () => values.shift() ?? 0.5;
    const code = generateRoomCode({ rng, isTaken: (c) => c === 'AAAA' });
    const last = ROOM_CODE_ALPHABET.at(-1);
    expect(code).toBe(last.repeat(4));
  });

  it('abandonne après trop de tentatives', () => {
    expect(() => generateRoomCode({ isTaken: () => true, maxAttempts: 5 })).toThrow();
  });
});

describe('Room : rejoindre le lobby', () => {
  it('attribue les places P1 à P4 dans l’ordre d’arrivée', () => {
    const room = new Room('ABCD');
    const slots = ['Ana', 'Bob', 'Cy', 'Dan'].map((n) => room.join({ nickname: n }).player.slot);
    expect(slots).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('donne un playerId unique à chaque joueur', () => {
    const room = new Room('ABCD');
    const a = room.join({ nickname: 'Ana' }).player.playerId;
    const b = room.join({ nickname: 'Bob' }).player.playerId;
    expect(a).toBeTypeOf('string');
    expect(a).not.toBe(b);
  });

  it('nettoie le pseudo (espaces autour)', () => {
    const room = new Room('ABCD');
    expect(room.join({ nickname: '  Ana  ' }).player.nickname).toBe('Ana');
  });

  it('refuse un 5e joueur avec GAME_FULL', () => {
    const room = new Room('ABCD');
    for (let i = 0; i < MAX_PLAYERS; i++) room.join({ nickname: `J${i}` });
    expect(room.join({ nickname: 'Trop' })).toEqual({ ok: false, code: ERROR_CODES.GAME_FULL });
  });

  it('refuse un nouveau joueur une fois la partie lancée (GAME_STARTED)', () => {
    const room = new Room('ABCD');
    room.join({ nickname: 'Ana' });
    room.status = GAME_STATUS.PLAYING;
    expect(room.join({ nickname: 'Bob' })).toEqual({
      ok: false,
      code: ERROR_CODES.GAME_STARTED,
    });
  });

  it('reconnecte un joueur connu à sa place, même partie lancée', () => {
    const room = new Room('ABCD');
    const { player } = room.join({ nickname: 'Ana' });
    room.join({ nickname: 'Bob' });
    room.status = GAME_STATUS.PLAYING;
    room.disconnect(player.playerId);

    const again = room.join({ nickname: 'autre', playerId: player.playerId });
    expect(again.ok).toBe(true);
    expect(again.reconnected).toBe(true);
    expect(again.player.slot).toBe('P1');
    expect(again.player.nickname).toBe('Ana');
    expect(again.player.connected).toBe(true);
  });

  it('traite un playerId inconnu comme une nouvelle arrivée', () => {
    const room = new Room('ABCD');
    const res = room.join({ nickname: 'Ana', playerId: 'inconnu' });
    expect(res.ok).toBe(true);
    expect(res.reconnected).toBe(false);
    expect(res.player.playerId).not.toBe('inconnu');
  });
});

describe('Room : déconnexion', () => {
  it('en lobby, libère la place, reprise par le joueur suivant', () => {
    const room = new Room('ABCD');
    room.join({ nickname: 'Ana' });
    const bob = room.join({ nickname: 'Bob' }).player;
    room.join({ nickname: 'Cy' });

    const left = room.disconnect(bob.playerId);
    expect(left?.connected).toBe(false); // sauvegardé tel quel en base
    expect(room.playerCount).toBe(2);
    expect(room.join({ nickname: 'Dan' }).player.slot).toBe('P2');
  });

  it('en partie, garde la place et marque le joueur déconnecté', () => {
    const room = new Room('ABCD');
    const ana = room.join({ nickname: 'Ana' }).player;
    room.join({ nickname: 'Bob' });
    room.status = GAME_STATUS.PLAYING;

    room.disconnect(ana.playerId);
    expect(room.playerCount).toBe(2);
    expect(room.getPlayer(ana.playerId)?.connected).toBe(false);
  });
});

describe('Room : vues publiques', () => {
  it('lobby:update liste les joueurs par place, sans playerId', () => {
    const room = new Room('ABCD');
    room.join({ nickname: 'Ana' });
    const payload = room.toLobbyUpdate();
    expect(payload).toEqual({
      players: [{ slot: 'P1', nickname: 'Ana', connected: true }],
      canStart: false,
    });
  });

  it('canStart passe à true dès 2 joueurs connectés', () => {
    const room = new Room('ABCD');
    room.join({ nickname: 'Ana' });
    room.join({ nickname: 'Bob' });
    expect(room.toLobbyUpdate().canStart).toBe(true);
  });

  it('toInfo correspond à GET /api/games/:code', () => {
    const room = new Room('ABCD');
    room.join({ nickname: 'Ana' });
    expect(room.toInfo()).toEqual({
      code: 'ABCD',
      status: 'lobby',
      playerCount: 1,
      maxPlayers: 4,
    });
  });
});

describe('RoomManager', () => {
  it('crée des salles aux codes uniques et les retrouve', () => {
    const manager = new RoomManager();
    const a = manager.create();
    const b = manager.create();
    expect(a.code).not.toBe(b.code);
    expect(manager.get(a.code)).toBe(a);
  });

  it('retrouve une salle avec un code saisi en minuscules et espaces', () => {
    const manager = new RoomManager();
    const room = manager.create();
    expect(manager.get(` ${room.code.toLowerCase()} `)).toBe(room);
  });

  it('peut créer une salle avec un code imposé (mock, tests)', () => {
    const manager = new RoomManager();
    expect(manager.create('test').code).toBe('TEST');
    expect(() => manager.create('TEST')).toThrow();
    expect(() => manager.create('AB0C')).toThrow();
  });

  it('renvoie undefined pour un code inconnu', () => {
    expect(new RoomManager().get('ZZZZ')).toBeUndefined();
  });
});
