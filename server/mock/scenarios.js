// @ts-check
/**
 * Scénarios scriptés du mock-server.
 *
 * Un scénario = une durée de partie + une liste d'étapes datées (en secondes de jeu après
 * `game:start`). Le mock calcule seul ce qui en découle : `module:result`, `game:state`,
 * `player:view`, déverrouillage du module final, `game:over` (victoire, 3 erreurs, chrono à 0).
 *
 * Types d'étapes :
 *   { at, type: 'focus', moduleId }            → bascule de focus
 *   { at, type: 'action', slot, result }       → action d'un joueur sur le module en focus
 *                                                (result : 'ok' | 'error' | 'solved')
 *   { at, type: 'reject', code }               → événement `error` envoyé aux téléphones
 *   { at, type: 'disconnect', slot }           → déconnexion : `game:paused`
 *   { at, type: 'reconnect', slot }            → retour du joueur : `game:resumed` (redistributed: false)
 *   { at, type: 'redistribute', slot }         → délai dépassé : `game:resumed` (redistributed: true)
 */

/**
 * @typedef {import('@unlockers/shared/types.js').Slot} Slot
 * @typedef {{ at: number, type: 'focus', moduleId: string }
 *   | { at: number, type: 'action', slot: Slot, result: 'ok' | 'error' | 'solved' }
 *   | { at: number, type: 'reject', code: import('@unlockers/shared/types.js').ErrorCode }
 *   | { at: number, type: 'disconnect' | 'reconnect' | 'redistribute', slot: Slot }} Step
 * @typedef {{ description: string, duration: number, steps: Step[] }} Scenario
 */

/** Faux modules affichés par le mock (le module final est verrouillé au départ). */
export const MOCK_MODULES = Object.freeze([
  { id: 'wires', name: 'Fils' },
  { id: 'keypad', name: 'Clavier' },
  { id: 'symbols', name: 'Symboles' },
  { id: 'memory', name: 'Mémoire' },
  { id: 'final', name: 'Module final', isFinal: true },
]);

/** Résout les 4 modules puis le final, à partir de `start` secondes, une étape toutes les 2 s. */
function solveAll(start = 2) {
  /** @type {Step[]} */
  const steps = [];
  let t = start;
  for (const { id } of MOCK_MODULES) {
    steps.push({ at: t, type: 'focus', moduleId: id });
    steps.push({ at: t + 1, type: 'action', slot: 'P1', result: 'ok' });
    steps.push({ at: t + 2, type: 'action', slot: 'P1', result: 'solved' });
    t += 3;
  }
  return steps;
}

/** @type {Record<string, Scenario>} */
export const SCENARIOS = {
  lobby: {
    description: 'Lobby seul : des faux joueurs arrivent, la partie ne se lance pas toute seule.',
    duration: 300,
    steps: [],
  },
  victory: {
    description:
      'Partie gagnée : les 4 modules sont résolus, le final se déverrouille puis est résolu.',
    duration: 300,
    steps: solveAll(),
  },
  'defeat-errors': {
    description: 'Défaite par erreurs : 3 mauvaises actions sur des modules différents.',
    duration: 300,
    steps: [
      { at: 2, type: 'action', slot: 'P1', result: 'error' },
      { at: 3, type: 'focus', moduleId: 'keypad' },
      { at: 4, type: 'action', slot: 'P1', result: 'ok' },
      { at: 5, type: 'action', slot: 'P1', result: 'error' },
      { at: 6, type: 'focus', moduleId: 'symbols' },
      { at: 7, type: 'action', slot: 'P1', result: 'error' },
    ],
  },
  'defeat-time': {
    description: 'Défaite au chrono : partie de 10 s où personne ne résout rien.',
    duration: 10,
    steps: [{ at: 3, type: 'action', slot: 'P1', result: 'ok' }],
  },
  focus: {
    description:
      'Focus partagé : bascules entre modules et refus du serveur (NOT_FOCUSED, FOCUS_COOLDOWN).',
    duration: 15,
    steps: [
      { at: 2, type: 'focus', moduleId: 'keypad' },
      { at: 3, type: 'reject', code: 'NOT_FOCUSED' },
      { at: 4, type: 'focus', moduleId: 'symbols' },
      { at: 4.5, type: 'reject', code: 'FOCUS_COOLDOWN' },
      { at: 6, type: 'reject', code: 'MODULE_LOCKED' },
      { at: 7, type: 'focus', moduleId: 'memory' },
    ],
  },
  disconnect: {
    description:
      'Déconnexion : P1 part (pause), revient ; repart et ne revient pas (infos redistribuées).',
    duration: 14,
    steps: [
      { at: 2, type: 'disconnect', slot: 'P1' },
      { at: 4, type: 'reconnect', slot: 'P1' },
      { at: 6, type: 'disconnect', slot: 'P1' },
      { at: 8, type: 'redistribute', slot: 'P1' },
    ],
  },
};

export const DEFAULT_SCENARIO = 'victory';
