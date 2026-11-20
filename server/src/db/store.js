// @ts-check
/**
 * Interface de sauvegarde utilisée par le serveur. Le jeu tourne en mémoire ;
 * le store écrit en base aux moments clés (création, joueur, …).
 *
 * `nullStore` ne sauvegarde rien : utilisé par défaut (tests, mock).
 */

/**
 * @typedef {object} GameStore
 * @property {(room: import('../rooms/Room.js').Room) => void} saveGame
 * @property {(room: import('../rooms/Room.js').Room, player: import('../rooms/Room.js').Player) => void} savePlayer
 */

/** @type {GameStore} */
export const nullStore = {
  saveGame() {},
  savePlayer() {},
};

/**
 * Enveloppe un store pour qu'une erreur de base de données ne fasse jamais planter une partie.
 * @param {Partial<GameStore>} store
 * @returns {GameStore}
 */
export function safeStore(store) {
  /** @param {keyof GameStore} name */
  const wrap =
    (name) =>
    (/** @type {any[]} */ ...args) => {
      try {
        /** @type {any} */ (store[name])?.(...args);
      } catch (err) {
        console.error(`[db] ${name} a échoué :`, err);
      }
    };
  return { saveGame: wrap('saveGame'), savePlayer: wrap('savePlayer') };
}
