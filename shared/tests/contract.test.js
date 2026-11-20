import { describe, expect, it } from 'vitest';
import {
  EVENTS,
  SCREEN_EVENTS,
  PHONE_EVENTS,
  SERVER_EVENTS,
  SLOTS,
  MAX_PLAYERS,
  DEFAULT_RULES,
  ERROR_CODES,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  normalizeRoomCode,
} from '@unlockers/shared';

describe('contrat v1 : événements', () => {
  it('contient exactement les 16 événements du plan', () => {
    expect(Object.values(EVENTS).sort()).toEqual(
      [
        'screen:join',
        'game:start',
        'game:restart',
        'player:join',
        'module:focus',
        'module:action',
        'player:joined',
        'lobby:update',
        'game:state',
        'player:view',
        'module:result',
        'game:tick',
        'game:paused',
        'game:resumed',
        'game:over',
        'error',
      ].sort(),
    );
  });

  it("n'a aucun nom en double entre les groupes", () => {
    const all = [
      ...Object.values(SCREEN_EVENTS),
      ...Object.values(PHONE_EVENTS),
      ...Object.values(SERVER_EVENTS),
    ];
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(Object.keys(EVENTS).length);
  });

  it('est figé (impossible de modifier un nom par erreur)', () => {
    expect(Object.isFrozen(EVENTS)).toBe(true);
    expect(Object.isFrozen(SERVER_EVENTS)).toBe(true);
  });
});

describe('contrat v1 : règles et constantes', () => {
  it('respecte les règles du plan', () => {
    expect(SLOTS).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(SLOTS.length).toBe(MAX_PLAYERS);
    expect(DEFAULT_RULES.durationSeconds).toBe(300);
    expect(DEFAULT_RULES.maxErrors).toBe(3);
    expect(DEFAULT_RULES.focusCooldownMs).toBe(2000);
    expect(DEFAULT_RULES.reconnectGraceMs).toBe(60_000);
  });

  it('contient les codes d’erreur du plan', () => {
    for (const code of [
      'GAME_NOT_FOUND',
      'GAME_FULL',
      'GAME_STARTED',
      'NOT_FOCUSED',
      'INVALID_ACTION',
    ]) {
      expect(ERROR_CODES).toHaveProperty(code, code);
    }
  });
});

describe('codes de salle', () => {
  it("n'utilise aucun caractère ambigu", () => {
    for (const char of ['O', '0', 'I', '1']) {
      expect(ROOM_CODE_ALPHABET).not.toContain(char);
    }
    expect(ROOM_CODE_LENGTH).toBe(4);
  });

  it('valide le format', () => {
    expect(isValidRoomCode('AB2C')).toBe(true);
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('AB0C')).toBe(false);
    expect(isValidRoomCode('abcd')).toBe(false);
  });

  it('normalise la saisie', () => {
    expect(normalizeRoomCode('  ab2c ')).toBe('AB2C');
    expect(isValidRoomCode(normalizeRoomCode(' ab2c'))).toBe(true);
  });
});
