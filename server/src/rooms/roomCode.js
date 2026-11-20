// @ts-check
/**
 * Génération des codes de salle : 4 caractères pris dans l'alphabet sans caractères ambigus
 * (pas de O, 0, I, 1), défini dans le contrat `@unlockers/shared`.
 */
import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@unlockers/shared';

/** Aléatoire par défaut : crypto, pour qu'on ne devine pas les codes des autres salles. */
const cryptoRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

/**
 * Tire un code de salle libre.
 * @param {object} [options]
 * @param {() => number} [options.rng] nombre dans [0, 1), `crypto` par défaut
 * @param {(code: string) => boolean} [options.isTaken] vrai si le code est déjà utilisé
 * @param {number} [options.maxAttempts] nombre d'essais avant d'abandonner
 * @returns {string}
 */
export function generateRoomCode({
  rng = cryptoRng,
  isTaken = () => false,
  maxAttempts = 1000,
} = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) return code;
  }
  throw new Error(`Aucun code de salle libre après ${maxAttempts} essais`);
}
