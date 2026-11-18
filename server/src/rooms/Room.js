// @ts-check
/**
 * Une salle = une partie en mémoire (code, statut, joueurs).
 *
 * S1 : lobby (rejoindre, places P1-P4, reconnexion par playerId, départ).
 * Les règles de partie (chrono, focus, erreurs) arrivent aux sprints suivants dans `game/`.
 */
import { randomUUID } from 'node:crypto';
import { ERROR_CODES, GAME_STATUS, MAX_PLAYERS, MIN_PLAYERS, SLOTS } from '@unlockers/shared';

/**
 * @typedef {import('@unlockers/shared/types.js').Slot} Slot
 * @typedef {import('@unlockers/shared/types.js').GameStatus} GameStatus
 * @typedef {import('@unlockers/shared/types.js').ErrorCode} ErrorCode
 */

/**
 * Joueur côté serveur (le `playerId` n'est jamais diffusé aux autres clients).
 * @typedef {object} Player
 * @property {string} playerId
 * @property {Slot} slot
 * @property {string} nickname
 * @property {boolean} connected
 */

/**
 * @typedef {{ ok: true, player: Player, reconnected: boolean } | { ok: false, code: ErrorCode }} JoinResult
 */

export class Room {
  /**
   * @param {string} code code de salle (déjà validé)
   */
  constructor(code) {
    /** Identifiant interne (UUID), clé de la table `games`. @readonly */
    this.id = randomUUID();
    /** @readonly */
    this.code = code;
    /** @type {GameStatus} */
    this.status = GAME_STATUS.LOBBY;
    /** @type {Map<string, Player>} playerId → joueur */
    this.players = new Map();
    this.createdAt = Date.now();
  }

  /** Nombre de joueurs qui occupent une place (connectés ou non). */
  get playerCount() {
    return this.players.size;
  }

  /**
   * @param {string} playerId
   * @returns {Player | undefined}
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Rejoindre la salle, ou s'y reconnecter si `playerId` correspond à un joueur connu.
   * @param {{ nickname: string, playerId?: string }} request
   * @returns {JoinResult}
   */
  join({ nickname, playerId }) {
    const known = playerId ? this.players.get(playerId) : undefined;
    if (known) {
      known.connected = true;
      return { ok: true, player: known, reconnected: true };
    }

    if (this.status !== GAME_STATUS.LOBBY) return { ok: false, code: ERROR_CODES.GAME_STARTED };
    if (this.players.size >= MAX_PLAYERS) return { ok: false, code: ERROR_CODES.GAME_FULL };

    const taken = new Set([...this.players.values()].map((p) => p.slot));
    const slot = /** @type {Slot} */ (SLOTS.find((s) => !taken.has(s)));
    /** @type {Player} */
    const player = { playerId: randomUUID(), slot, nickname: nickname.trim(), connected: true };
    this.players.set(player.playerId, player);
    return { ok: true, player, reconnected: false };
  }

  /**
   * Déconnexion d'un joueur. En lobby il libère sa place ; en partie il la garde
   * (pause et redistribution : S4).
   * @param {string} playerId
   * @returns {Player | undefined} le joueur concerné
   */
  disconnect(playerId) {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    player.connected = false;
    if (this.status === GAME_STATUS.LOBBY) this.players.delete(playerId);
    return player;
  }

  /**
   * Joueurs triés par place, sans `playerId`.
   * @returns {import('@unlockers/shared/types.js').PublicPlayer[]}
   */
  publicPlayers() {
    return [...this.players.values()]
      .sort((a, b) => a.slot.localeCompare(b.slot))
      .map(({ slot, nickname, connected }) => ({ slot, nickname, connected }));
  }

  /**
   * Données de l'événement `lobby:update`.
   * @returns {import('@unlockers/shared/types.js').LobbyUpdatePayload}
   */
  toLobbyUpdate() {
    const players = this.publicPlayers();
    const connected = players.filter((p) => p.connected).length;
    return { players, canStart: this.status === GAME_STATUS.LOBBY && connected >= MIN_PLAYERS };
  }

  /**
   * Réponse de `GET /api/games/:code`.
   * @returns {import('@unlockers/shared/types.js').GameInfoResponse}
   */
  toInfo() {
    return {
      code: this.code,
      status: this.status,
      playerCount: this.playerCount,
      maxPlayers: MAX_PLAYERS,
    };
  }
}
