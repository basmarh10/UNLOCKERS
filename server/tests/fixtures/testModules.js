// @ts-check
/**
 * Faux modules pour les tests du moteur (le vrai module 1 d'Alan n'existe pas encore).
 *
 * Mécanique : un chiffre secret tiré avec le rng. Seule la première place présente
 * le voit ; les autres voient « ? ». `{ type: 'guess', value }` → solved ou error,
 * `{ type: 'noop' }` → ok, autre chose → exception (action invalide).
 */

/**
 * @param {string} id
 * @param {{ isFinal?: boolean, minPlayers?: number, maxPlayers?: number }} [options]
 * @returns {{ config: import('@unlockers/shared/types.js').ModuleConfig, server: import('@unlockers/shared/types.js').ModuleDefinition<{ secret: number }> }}
 */
export function makeTestModule(id, { isFinal = false, minPlayers = 2, maxPlayers = 4 } = {}) {
  return {
    config: { id, name: `Test ${id}`, minPlayers, maxPlayers, isFinal },
    server: {
      setup({ rng }) {
        return { secret: Math.floor(rng() * 10) };
      },
      viewFor(state, slot, slots) {
        return { slot, secret: slot === slots[0] ? state.secret : '?' };
      },
      screenView() {
        return { label: id };
      },
      handleAction(state, _slot, action) {
        const a = /** @type {any} */ (action);
        if (a?.type === 'noop') return { result: 'ok', state };
        if (a?.type === 'guess') {
          return { result: a.value === state.secret ? 'solved' : 'error', state };
        }
        throw new Error('action inconnue');
      },
    },
  };
}

/** 5 modules normaux + 1 final : le moteur doit en garder 4 + le final. */
export const TEST_MODULES = [
  makeTestModule('alpha'),
  makeTestModule('beta'),
  makeTestModule('gamma'),
  makeTestModule('delta'),
  makeTestModule('epsilon'),
  makeTestModule('final', { isFinal: true }),
];
