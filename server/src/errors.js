// @ts-check
/**
 * Messages d'erreur lisibles (en français) associés aux codes du contrat.
 * Le client affiche `message` ; il se base sur `code` pour réagir.
 */
import { ERROR_CODES } from '@unlockers/shared';

/** @type {Record<import('@unlockers/shared/types.js').ErrorCode, string>} */
export const ERROR_MESSAGES = {
  [ERROR_CODES.GAME_NOT_FOUND]: 'Aucune partie avec ce code.',
  [ERROR_CODES.GAME_FULL]: 'La partie est pleine (4 joueurs maximum).',
  [ERROR_CODES.GAME_STARTED]: 'La partie a déjà commencé.',
  [ERROR_CODES.NOT_ENOUGH_PLAYERS]: 'Il faut au moins 2 joueurs pour lancer la partie.',
  [ERROR_CODES.NOT_FOCUSED]: "Ce module n'est pas en focus.",
  [ERROR_CODES.FOCUS_COOLDOWN]: 'Attends un peu avant de changer de module.',
  [ERROR_CODES.MODULE_LOCKED]: 'Ce module est encore verrouillé.',
  [ERROR_CODES.INVALID_ACTION]: 'Action refusée.',
  [ERROR_CODES.INVALID_PAYLOAD]: 'Données reçues invalides.',
};

/**
 * Construit le contenu de l'événement `error` (ou d'une réponse HTTP d'erreur).
 * @param {import('@unlockers/shared/types.js').ErrorCode} code
 * @returns {import('@unlockers/shared/types.js').ErrorPayload}
 */
export function errorPayload(code) {
  return { code, message: ERROR_MESSAGES[code] };
}
