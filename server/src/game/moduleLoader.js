// @ts-check
/**
 * Chargeur de modules : vérifie que chaque module respecte le contrat
 * (`ModuleConfig` + `ModuleDefinition`, voir `@unlockers/shared/types.js`) et choisit
 * les modules d'une partie.
 *
 * Le moteur ne connaît aucun module en particulier : ajouter un module = l'ajouter
 * au registre `@unlockers/modules`, sans toucher à ce fichier.
 */
import { MAX_PLAYERS, MIN_PLAYERS } from '@unlockers/shared';
import { shuffle } from './rng.js';

/**
 * Un module tel qu'il est enregistré dans `modules/index.js`.
 * @typedef {object} ModuleEntry
 * @property {import('@unlockers/shared/types.js').ModuleConfig} config
 * @property {import('@unlockers/shared/types.js').ModuleDefinition} server
 */

const REQUIRED_FUNCTIONS = /** @type {const} */ ([
  'setup',
  'viewFor',
  'screenView',
  'handleAction',
]);

/**
 * Vérifie un module et lève une erreur lisible s'il ne respecte pas le contrat.
 * Appelé au démarrage : un module cassé doit se voir tout de suite, pas en pleine partie.
 * @param {ModuleEntry} entry
 * @returns {ModuleEntry}
 */
export function validateModule(entry) {
  const config = entry?.config;
  const id = typeof config?.id === 'string' && config.id ? config.id : '(sans id)';
  const fail = (/** @type {string} */ reason) => {
    throw new Error(`Module « ${id} » invalide : ${reason}`);
  };

  if (id === '(sans id)') fail('config.id manquant');
  if (typeof config.name !== 'string') fail('config.name manquant');
  if (typeof config.isFinal !== 'boolean') fail('config.isFinal doit être un booléen');
  const { minPlayers, maxPlayers } = config;
  if (
    !Number.isInteger(minPlayers) ||
    !Number.isInteger(maxPlayers) ||
    minPlayers < MIN_PLAYERS ||
    maxPlayers > MAX_PLAYERS ||
    minPlayers > maxPlayers
  ) {
    fail(`minPlayers / maxPlayers doivent vérifier ${MIN_PLAYERS} ≤ min ≤ max ≤ ${MAX_PLAYERS}`);
  }
  for (const name of REQUIRED_FUNCTIONS) {
    if (typeof entry.server?.[name] !== 'function') fail(`server.${name} doit être une fonction`);
  }
  return entry;
}

/**
 * Vérifie tout un registre (ids uniques compris).
 * @param {readonly ModuleEntry[]} entries
 * @returns {ModuleEntry[]}
 */
export function validateRegistry(entries) {
  const seen = new Set();
  return entries.map((entry) => {
    validateModule(entry);
    if (seen.has(entry.config.id)) throw new Error(`Module « ${entry.config.id} » en double`);
    seen.add(entry.config.id);
    return entry;
  });
}

/**
 * Choisit les modules d'une partie : `count` modules normaux tirés au hasard parmi ceux
 * compatibles avec le nombre de joueurs, puis le module final (toujours en dernier).
 * S'il y a moins de modules disponibles que prévu (début du projet), on prend ce qu'il y a.
 * @param {readonly ModuleEntry[]} entries
 * @param {{ playerCount: number, rng: import('@unlockers/shared/types.js').Rng, count: number }} options
 * @returns {ModuleEntry[]}
 */
export function pickModules(entries, { playerCount, rng, count }) {
  const compatible = entries.filter(
    (m) => playerCount >= m.config.minPlayers && playerCount <= m.config.maxPlayers,
  );
  const regular = shuffle(
    compatible.filter((m) => !m.config.isFinal),
    rng,
  ).slice(0, count);
  const finals = shuffle(
    compatible.filter((m) => m.config.isFinal),
    rng,
  );
  return finals.length > 0 ? [...regular, finals[0]] : regular;
}
