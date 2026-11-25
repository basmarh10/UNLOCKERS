// @ts-check
/**
 * Aléatoire à graine : chaque partie a sa graine (sauvegardée en base), ce qui permet
 * de rejouer exactement la même génération de modules pour déboguer.
 *
 * Algorithme : mulberry32 (rapide, 32 bits, suffisant pour un jeu ; pas pour de la crypto).
 */
import { randomInt } from 'node:crypto';

/**
 * Crée un générateur qui renvoie un nombre dans [0, 1), comme `Math.random`.
 * @param {number} seed entier 32 bits
 * @returns {import('@unlockers/shared/types.js').Rng}
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tire une nouvelle graine (entier 32 bits non signé).
 * @returns {number}
 */
export function randomSeed() {
  return randomInt(0, 2 ** 32);
}

/**
 * Mélange une copie du tableau (Fisher-Yates) avec le générateur donné.
 * @template T
 * @param {readonly T[]} items
 * @param {import('@unlockers/shared/types.js').Rng} rng
 * @returns {T[]}
 */
export function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
