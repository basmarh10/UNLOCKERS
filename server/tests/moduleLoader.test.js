// Tests : aléatoire à graine et chargeur de modules (tâches Notion #25 et #26).
import { describe, expect, it } from 'vitest';
import { createRng, randomSeed } from '../src/game/rng.js';
import { pickModules, validateModule } from '../src/game/moduleLoader.js';
import { makeTestModule, TEST_MODULES } from './fixtures/testModules.js';

describe('rng', () => {
  it('même graine → même suite (partie rejouable pour déboguer)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
  });

  it('valeurs dans [0, 1) et graines différentes → suites différentes', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i += 1) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('randomSeed donne un entier 32 bits', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('validateModule', () => {
  it('accepte un module conforme au contrat', () => {
    expect(() => validateModule(makeTestModule('ok'))).not.toThrow();
  });

  it('refuse un module sans fonction obligatoire, avec un message clair', () => {
    const broken = makeTestModule('broken');
    delete broken.server.viewFor;
    expect(() => validateModule(broken)).toThrow(/broken.*viewFor/);
  });

  it('refuse une config incohérente (minPlayers > maxPlayers)', () => {
    expect(() => validateModule(makeTestModule('bad', { minPlayers: 4, maxPlayers: 2 }))).toThrow(
      /bad/,
    );
  });
});

describe('pickModules', () => {
  it('garde 4 modules normaux + le final, final en dernier', () => {
    const picked = pickModules(TEST_MODULES, { playerCount: 2, rng: createRng(7), count: 4 });
    expect(picked).toHaveLength(5);
    expect(picked.filter((m) => m.config.isFinal)).toHaveLength(1);
    expect(picked.at(-1)?.config.id).toBe('final');
  });

  it('le tirage dépend de la graine', () => {
    const ids = (seed) =>
      pickModules(TEST_MODULES, { playerCount: 2, rng: createRng(seed), count: 4 }).map(
        (m) => m.config.id,
      );
    expect(ids(7)).toEqual(ids(7));
    const all = new Set(Array.from({ length: 20 }, (_, i) => ids(i).join()));
    expect(all.size).toBeGreaterThan(1);
  });

  it('écarte les modules incompatibles avec le nombre de joueurs', () => {
    const list = [makeTestModule('two'), makeTestModule('fourOnly', { minPlayers: 4 })];
    const picked = pickModules(list, { playerCount: 2, rng: createRng(1), count: 4 });
    expect(picked.map((m) => m.config.id)).toEqual(['two']);
  });

  it('fonctionne avec moins de modules que prévu (S2 : un seul module codé)', () => {
    const picked = pickModules([makeTestModule('wires')], {
      playerCount: 2,
      rng: createRng(1),
      count: 4,
    });
    expect(picked.map((m) => m.config.id)).toEqual(['wires']);
  });
});
